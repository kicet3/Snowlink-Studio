import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { randomUUID, createHash } from 'node:crypto';
import { saveImage } from './store.mjs';

const bad = (message, status = 400) => Object.assign(new Error(message), { status });
const fingerprint = input => createHash('sha256').update(JSON.stringify(input)).digest('hex');
const nodeFingerprint = (graph, node) => fingerprint({
  prompt: node.data.prompt, kind: node.data.studioKind, cast: node.data.studioCharacterIds || [],
  template: node.data.studioTemplateId || '', video: node.data.studioKind === 'video' ? node.data.video : null,
  imageUrl: node.data.imageUrl || null, serverNodeId: node.data.serverNodeId || null,
  parents: graph.edges.filter(e => e.target === node.id).map(e => {
    const parent = graph.nodes.find(n => n.id === e.source);
    return { id: e.source, prompt: parent?.data.prompt, imageUrl: parent?.data.imageUrl, serverNodeId: parent?.data.serverNodeId, kind: parent?.data.studioKind };
  }),
});
const sid = id => { if (typeof id !== 'string' || !/^[\w-]{1,100}$/.test(id)) throw bad('노드 또는 작업실 ID를 확인해주세요.'); return encodeURIComponent(id); };
const generatedPath = value => {
  if (typeof value !== 'string' || !/^\/generated\/[\w./-]+$/.test(value) || value.includes('..')) throw bad('생성 결과 경로를 확인해주세요.');
  return value;
};

export function createStudioMedia({ config, dataDir, workspace, videoTemplates, jobs, ai, ownership }) {
  const target = new URL(config.tools.ima2.target);
  const registrations = new Map();
  async function request(path, method = 'GET', body, headers = {}) {
    const response = await fetch(new URL(path, target), { method, headers: { ...headers, ...(body ? { 'Content-Type': 'application/json' } : {}) }, body: body ? JSON.stringify(body) : undefined, signal: AbortSignal.timeout(20000), redirect: 'error' });
    const result = await response.json();
    if (!response.ok) throw bad(typeof result.error === 'string' ? result.error : result.error?.message || '제작 도구 요청에 실패했습니다.', response.status);
    return result;
  }
  function localImage(path) {
    if (!/^\/media\/[\w-]+\.(png|jpg|webp)$/.test(path || '')) throw bad('작업실에 업로드된 캐릭터 이미지를 선택해주세요.');
    const bytes = readFileSync(join(dataDir, path));
    if (bytes.length > 6 * 1024 * 1024) throw bad('참고 이미지는 6MB 이하여야 합니다.');
    return `data:image/${path.endsWith('.jpg') ? 'jpeg' : path.split('.').pop()};base64,${bytes.toString('base64')}`;
  }
  function characters(ids = []) {
    if (!Array.isArray(ids) || ids.length > 3) throw bad('장면당 캐릭터 시트는 최대 3개를 선택해주세요.');
    return ids.map(id => {
      const character = workspace.read().characters.find(item => item.id === id && !item.archived);
      if (!character) throw bad('출연 캐릭터를 찾을 수 없습니다.');
      if (!character.image) throw bad(`${character.name}의 캐릭터 시트 이미지를 먼저 등록해주세요.`);
      return character;
    });
  }
  const readGraph = async id => { ownership?.require('sessions', id); return (await request(`/api/sessions/${sid(id)}`)).session; };
  async function saveGraph(id, graphVersion, nodes, edges) {
    return request(`/api/sessions/${sid(id)}/graph`, 'PUT', { nodes, edges }, { 'If-Match': String(graphVersion) });
  }
  function normalizeGraph(input) {
    if (!Array.isArray(input.nodes) || !input.nodes.length || input.nodes.length > 100 || !Array.isArray(input.edges) || input.edges.length > 200) throw bad('노드는 1~100개, 연결은 200개 이내로 구성해주세요.');
    const ids = new Set();
    const nodes = input.nodes.map((node, i) => {
      sid(node.id);
      if (ids.has(node.id) || !['image', 'video'].includes(node.kind) || typeof node.prompt !== 'string' || !node.prompt.trim() || node.prompt.length > 20000) throw bad('중복 ID, 노드 종류 또는 프롬프트를 확인해주세요.');
      ids.add(node.id);
      const cast = characters(node.characterIds);
      const template = node.templateId ? videoTemplates.get(node.templateId) : null;
      return { id: node.id, x: Number.isFinite(node.x) ? node.x : (i % 2) * 440, y: Number.isFinite(node.y) ? node.y : Math.floor(i / 2) * 400, data: { clientId: node.id, status: 'empty', prompt: [template?.prompt, cast.map(c => `${c.name}: ${c.description}`).join('\n'), node.prompt].filter(Boolean).join('\n\n'), studioKind: node.kind, studioCharacterIds: cast.map(c => c.id), studioTemplateId: template?.id || '', studioSourcePrompt: node.prompt, ...(node.kind === 'video' ? { video: { duration: 5, resolution: '480p', aspectRatio: '16:9' } } : {}) } };
    });
    const edgeIds = new Set();
    const edges = input.edges.map((edge, index) => {
      if (!ids.has(edge.source) || !ids.has(edge.target) || edge.source === edge.target) throw bad('노드 연결의 출발점과 도착점을 확인해주세요.');
      const id = `${edge.source}-${edge.target}`;
      if (edgeIds.has(id)) throw bad('중복된 노드 연결입니다.'); edgeIds.add(id);
      return { id: `studio-edge-${index}`, source: edge.source, target: edge.target, data: { sourceHandle: 'right', targetHandle: 'left' } };
    });
    const visited = new Set(), stack = new Set();
    function visit(id) { if (stack.has(id)) throw bad('노드 연결에 순환이 있습니다.'); if (visited.has(id)) return; stack.add(id); for (const edge of edges.filter(e => e.source === id)) visit(edge.target); stack.delete(id); visited.add(id); }
    for (const id of ids) visit(id);
    for (const node of nodes) {
      const parents = edges.filter(e => e.target === node.id).map(e => nodes.find(n => n.id === e.source));
      if (parents.some(p => p.data.studioKind === 'video') || node.data.studioKind === 'video' && parents.length > 1) throw bad('영상 노드에는 이미지 노드 하나만 연결할 수 있습니다. 영상은 참조 이미지로 사용할 수 없습니다.');
    }
    return { nodes, edges };
  }
  async function createGraph(input) {
    const graph = normalizeGraph(input);
    const session = (await request('/api/sessions', 'POST', { title: String(input.title || '대화로 만든 노드').slice(0, 160) })).session;
    ownership?.claim('sessions', session.id);
    try { await saveGraph(session.id, session.graphVersion, graph.nodes, graph.edges); }
    catch (error) { error.message += ` 빈 작업실 ID: ${session.id}`; throw error; }
    return readGraph(session.id);
  }
  async function replaceGraph(input) {
    const current = await readGraph(input.sessionId);
    if (input.graphVersion !== current.graphVersion) throw bad('노드가 변경됐습니다. 다시 불러와주세요.', 409);
    const graph = normalizeGraph(input);
    // Preserve completed artifacts only when the corresponding generation inputs are identical.
    graph.nodes = graph.nodes.map(node => {
      const old = current.nodes.find(n => n.id === node.id);
      return old && old.data.prompt === node.data.prompt && old.data.studioKind === node.data.studioKind && JSON.stringify(old.data.studioCharacterIds) === JSON.stringify(node.data.studioCharacterIds)
        ? { ...node, data: { ...old.data, ...node.data, status: old.data.status } } : node;
    });
    return saveGraph(input.sessionId, input.graphVersion, graph.nodes, graph.edges);
  }
  async function submit(input) {
    if (typeof input.idempotencyKey !== 'string' || !/^[\w-]{8,100}$/.test(input.idempotencyKey)) throw bad('중복 생성을 막기 위한 고유 요청 키(8~100자)가 필요합니다.');
    const hash = fingerprint(input);
    const previous = jobs.list().find(j => j.kind === 'media' && j.idempotencyKey === input.idempotencyKey);
    if (previous) { if (previous.fingerprint !== hash) throw bad('같은 요청 키를 다른 생성에 재사용할 수 없습니다.', 409); return poll(previous.id); }
    if (jobs.list().filter(j => j.kind === 'media' && ['queued', 'running', 'checking'].includes(j.status)).length >= 6) throw bad('진행 중인 생성 결과를 먼저 확인해주세요.', 429);
    let node, session;
    if (input.sessionId) {
      session = await readGraph(input.sessionId); node = session.nodes.find(n => n.id === input.nodeId);
      if (!node?.data.studioKind) throw bad('대화 또는 시나리오로 만든 장면 노드를 선택해주세요.');
      if (input.graphVersion !== session.graphVersion) throw bad('노드가 변경됐습니다. 다시 불러와주세요.', 409);
      const pending = jobs.list().find(j => j.sessionId === input.sessionId && j.nodeId === input.nodeId && ['queued', 'running', 'checking'].includes(j.status));
      if (pending) return poll(pending.id);
    }
    const kind = node?.data.studioKind || 'image';
    const prompt = node?.data.prompt || input.prompt;
    if (typeof prompt !== 'string' || !prompt.trim() || prompt.length > 40000) throw bad('생성 프롬프트를 확인해주세요.');
    const cast = characters(node?.data.studioCharacterIds || input.characterIds);
    const refs = cast.map(c => localImage(c.image));
    if (input.referenceImage) refs.push(localImage(input.referenceImage));
    if (refs.length > 3) throw bad('참고 이미지는 최대 3개입니다.');
    const parents = session ? session.edges.filter(e => e.target === node.id).map(e => session.nodes.find(n => n.id === e.source)) : [];
    if (parents.some(p => !p?.data.imageUrl || p.data.studioKind === 'video' || p.data.status !== 'ready')) throw bad('연결된 앞 이미지 노드를 먼저 생성해주세요.', 409);
    const role = ai.settings.read().roles[kind];
    const selection = input.selection || role;
    if (!selection?.model || !['gpt', 'grok'].includes(selection.provider) || kind === 'video' && selection.provider !== 'grok') throw bad('설정에서 이미지 또는 영상 모델을 선택해주세요.');
    const requestId = 'studio-' + randomUUID();
    const body = { async: true, requestId, prompt, model: selection.model, provider: selection.provider === 'gpt' ? 'oauth' : 'grok', sessionId: session?.id, clientNodeId: node?.id };
    let path;
    if (kind === 'video') {
      path = '/api/video/generate'; Object.assign(body, { duration: 5, resolution: '480p', aspectRatio: '16:9', ...node.data.video });
      if (parents.length) { body.sourceFilename = generatedPath(parents[0].data.imageUrl.replace(/^\/integrations\/ima2/, '')).slice('/generated/'.length); body.mode = 'image-to-video'; }
      else if (refs.length) { body.referenceImages = refs; body.mode = 'reference-to-video'; }
      else body.mode = 'text-to-video';
    } else {
      path = node ? '/api/node/generate' : '/api/generate';
      if (parents.some(p => !p.data.serverNodeId)) throw bad('앞 이미지 노드의 생성 ID가 없습니다. 결과를 확인해주세요.', 409);
      Object.assign(body, { references: refs.map(r => r.split(',')[1]), parentNodeId: parents[0]?.data.serverNodeId || null, extraParentNodeIds: parents.slice(1).map(p => p.data.serverNodeId), contextMode: 'parent-plus-refs', size: '1536x1024', quality: 'high', n: 1, mode: 'direct', webSearchEnabled: false });
    }
    // Recheck after asynchronous reads, before admission and the only chargeable POST.
    const race = jobs.list().find(j => j.idempotencyKey === input.idempotencyKey || node && j.sessionId === session.id && j.nodeId === node.id && ['queued', 'running', 'checking'].includes(j.status));
    if (race) { if (race.idempotencyKey === input.idempotencyKey && race.fingerprint !== hash) throw bad('같은 요청 키가 사용 중입니다.', 409); return poll(race.id); }
    const job = jobs.create('media', { requestId, idempotencyKey: input.idempotencyKey, fingerprint: hash, sessionId: session?.id, nodeId: node?.id, nodePrompt: node?.data.prompt, nodeFingerprint: node ? nodeFingerprint(session, node) : undefined, graphVersion: session?.graphVersion, mediaKind: kind, profile: input.profile, sheet: input.sheet });
    ownership?.claim('requests', requestId);
    try { await request(path, 'POST', body); return jobs.update(job.id, { status: 'running', message: '생성 중입니다. 작업 상태를 조회해주세요.' }); }
    catch (error) { return jobs.update(job.id, { status: error.status && error.status < 500 ? 'failed' : 'checking', message: error.status && error.status < 500 ? error.message : '접수 응답을 확인하지 못했습니다. 재생성하지 말고 이 작업의 상태를 조회해주세요.' }); }
  }
  const polling = new Map();
  async function check(id) {
    let job = jobs.read(id);
    if (job.kind !== 'media' || ['done', 'failed'].includes(job.status)) return job;
    try {
      const history = await request(`/api/history?limit=30&requestId=${encodeURIComponent(job.requestId)}`);
      const rows = Array.isArray(history) ? history : history.images || history.items || history.history || [];
      const result = rows.find(item => item.requestId === job.requestId);
      if (!result) {
        const snapshot = await request('/api/inflight?includeTerminal=1');
        const entries = Array.isArray(snapshot) ? snapshot : [...(snapshot.jobs || []), ...(snapshot.terminalJobs || [])];
        const active = entries.find(item => item.requestId === job.requestId);
        if (active && ['error', 'failed', 'cancelled', 'canceled'].includes(active.status)) return jobs.update(id, { status: 'failed', message: String(active.error?.message || active.error || '생성에 실패했습니다.').slice(0, 1000) });
        return jobs.update(id, { status: active && !['done', 'completed'].includes(active.status) ? 'running' : 'checking', message: active ? '생성 결과를 확인하고 있습니다.' : '생성 이력에서 아직 결과를 찾지 못했습니다. 자동 재요청하지 않습니다.' });
      }
      const url = generatedPath(result.url || `/generated/${result.filename}`);
      ownership?.claim('files', result.filename || url.slice('/generated/'.length));
      ownership?.claim('nodes', result.nodeId);
      job = jobs.update(id, { result: { url, filename: result.filename || url.slice(11), nodeId: result.nodeId, video: result.video } });
      if (job.sessionId && !job.attached) {
        const graph = await readGraph(job.sessionId), node = graph.nodes.find(n => n.id === job.nodeId);
        if (!node || (job.nodeFingerprint ? nodeFingerprint(graph, node) !== job.nodeFingerprint : graph.graphVersion !== job.graphVersion || node.data.prompt !== job.nodePrompt)) {
          return jobs.update(id, { status: 'done', message: '생성 완료. 노드가 변경되어 결과를 덮어쓰지 않았습니다. 아래 결과 링크를 이용해주세요.', attached: false });
        }
        Object.assign(node.data, { status: 'ready', imageUrl: url, serverNodeId: result.nodeId || null, ...(result.video ? { video: result.video } : {}) });
        try { await saveGraph(graph.id, graph.graphVersion, graph.nodes, graph.edges); job = jobs.update(id, { attached: true }); }
        catch (error) { if (error.status === 409) return jobs.update(id, { status: 'done', message: '생성 완료. 다른 화면의 노드 변경을 보존했습니다.', attached: false }); throw error; }
      }
      return jobs.update(id, { status: 'done', message: '생성이 완료되었습니다.' });
    } catch { return jobs.update(id, { status: 'checking', message: '생성 상태에 연결하지 못했습니다. 같은 작업 번호로 다시 확인해주세요.' }); }
  }
  function poll(id) { if (!polling.has(id)) polling.set(id, check(id).finally(() => polling.delete(id))); return polling.get(id); }
  function registerSheet(id, profile) {
    if (registrations.has(id)) return registrations.get(id);
    const pending = registerSheetOnce(id, profile).finally(() => registrations.delete(id));
    registrations.set(id, pending); return pending;
  }
  async function registerSheetOnce(id, profile) {
    const job = await poll(id);
    if (job.characterId) return workspace.read().characters.find(c => c.id === job.characterId);
    if (job.status !== 'done' || job.mediaKind !== 'image' || !job.result) throw bad('완료된 시트 이미지 작업을 선택해주세요.');
    const response = await fetch(new URL(generatedPath(job.result.url), target), { signal: AbortSignal.timeout(20000), redirect: 'error' });
    if (!response.ok) throw bad('시트 이미지를 불러오지 못했습니다.');
    const chunks = []; let size = 0;
    for await (const chunk of response.body) { size += chunk.length; if (size > 6 * 1024 * 1024) throw bad('시트 이미지가 6MB를 초과합니다.'); chunks.push(chunk); }
    const mime = response.headers.get('content-type')?.split(';')[0];
    const image = saveImage(dataDir, `data:${mime};base64,${Buffer.concat(chunks).toString('base64')}`);
    const saved = workspace.upsert('characters', { ...job.profile, ...profile, sheet: job.sheet, image });
    jobs.update(id, { characterId: saved.id }); return saved;
  }
  return { listGraphs: async () => { const result = await request('/api/sessions'); return { sessions: result.sessions.filter(s => !ownership || ownership.owns('sessions', s.id)) }; }, readGraph, createGraph, replaceGraph, submit, poll, registerSheet };
}
