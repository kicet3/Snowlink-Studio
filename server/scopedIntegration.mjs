import { randomUUID } from 'node:crypto';
import { json, readJson } from './http.mjs';
import { handleIntegration } from './integrations.mjs';

const bad = (message, status = 403) => Object.assign(new Error(message), { status });
export async function handleScopedIntegration(req, res, url, config, ownership) {
  if (!url.pathname.startsWith('/integrations/')) return false;
  const match = /^\/integrations\/(ima2|trends)(\/.*)$/.exec(url.pathname);
  if (!match || /%2f|%5c|%2e/i.test(match[2])) throw bad('지원하지 않는 도구 요청입니다.', 404);
  const [, tool, path] = match, admin = ownership.account.role === 'admin';
  if (tool === 'trends') {
    if (!admin && (req.method !== 'GET' || /saved|accounts|analysis/.test(path))) throw bad('이 트렌드 관리 기능은 관리자만 사용할 수 있습니다.');
    return handleIntegration(req, res, url, config);
  }
  if (path.startsWith('/generated/')) { ownership.require('files', decodeURIComponent(path.slice('/generated/'.length))); return handleIntegration(req, res, url, config); }
  // The embedded UI uses the workspace session, not the engine's separate LAN login.
  if (path === '/api/auth/lan/session' && req.method === 'GET') { json(res, 200, { mode: 'local', authenticated: true, expiresAt: null }); return true; }
  if (!admin && req.method === 'GET' && path === '/api/mcp/providers') { json(res, 200, { ok: true, providers: [], managed: true }); return true; }
  if (!admin && req.method === 'GET' && path === '/api/assets') { json(res, 200, { assets: [], nextCursor: null }); return true; }
  if (!admin && req.method === 'GET' && ['/api/oauth/status', '/api/grok/status', '/api/capabilities'].includes(path)) {
    const response = await fetch(new URL(path, config.tools.ima2.target), { signal: AbortSignal.timeout(20000), redirect: 'error' });
    if (!response.ok) throw bad('제작 엔진 상태를 확인하지 못했습니다.', 502);
    const source = await response.json();
    const publicAuth = (value, provider) => ({ provider, loggedIn: !!value?.loggedIn, health: value?.health || 'not_logged_in', refreshable: !!value?.refreshable });
    const result = path === '/api/oauth/status'
      ? { status: source.status || 'offline', models: source.models, auth: publicAuth(source.auth, 'gpt'), grokAuth: publicAuth(source.grokAuth, 'grok'), managed: true }
      : path === '/api/grok/status' ? { status: source.status || 'offline', models: source.models, managed: true }
      : { limits: source.limits, valid: { videoModels: { referenceAudio: source.valid?.videoModels?.referenceAudio } }, defaults: { nai: source.defaults?.nai } };
    json(res, 200, result); return true;
  }
  const session = /^\/api\/sessions\/([\w-]+)(?:\/graph)?$/.exec(path);
  if (session) ownership.require('sessions', session[1]);
  const node = /^\/api\/node\/([\w-]+)$/.exec(path);
  if (node && node[1] !== 'generate') ownership.require('nodes', node[1]);
  const flight = /^\/api\/inflight\/([\w-]+)$/.exec(path);
  if (flight) ownership.require('requests', flight[1]);
  const generation = ['/api/generate', '/api/node/generate', '/api/video', '/api/video/generate', '/api/edit'].includes(path);
  const scoped = ['/api/history', '/api/inflight', '/api/sessions', '/api/events'].includes(path) || !!session || !!node || !!flight || generation;
  if (!scoped) {
    if (!admin && !(req.method === 'GET' && ['/api/health', '/api/models', '/api/video/models'].includes(path))) throw bad('이 도구 설정은 관리자만 사용할 수 있습니다.');
    return handleIntegration(req, res, url, config);
  }
  let body;
  if (['POST', 'PUT', 'PATCH'].includes(req.method)) {
    body = await readJson(req);
    if (body.sessionId) ownership.require('sessions', body.sessionId);
    if (body.parentNodeId) ownership.require('nodes', body.parentNodeId);
    for (const id of body.extraParentNodeIds || []) ownership.require('nodes', id);
    for (const filename of [body.sourceFilename, ...(body.referenceFilenames || [])].filter(Boolean)) ownership.require('files', filename);
    if (!admin && (body.providerUrl || body.continueFromVideo || body.elementIds?.length || body.elementContext)) throw bad('직접 업로드한 참고 이미지를 사용해주세요.');
    for (const n of body.nodes || []) {
      if (n.data?.imageUrl) {
        const image = /^\/(?:integrations\/ima2\/)?generated\/(.+)$/.exec(n.data.imageUrl);
        if (!image) throw bad('노드의 생성 이미지 경로를 확인해주세요.'); ownership.require('files', image[1]);
      }
      if (n.data?.serverNodeId) ownership.require('nodes', n.data.serverNodeId);
    }
    if (generation) {
      if (config.ai.fixedProviders) {
        if (body.provider !== 'grok' || !body.model) body.model = path.includes('/video') ? config.ai.videoModel : config.ai.imageModel;
        body.provider = 'grok';
      }
      body.requestId ||= 'studio-' + randomUUID();
      if (typeof body.requestId !== 'string' || !/^[\w-]{1,100}$/.test(body.requestId)) throw bad('요청 ID를 확인해주세요.', 400);
      ownership.claim('requests', body.requestId);
      if (!admin) {
        const images = [...(body.references || []), ...(body.referenceImages || []), ...[body.image, body.sourceImage].filter(Boolean)];
        if (images.some(value => typeof value !== 'string' || !/^(?:data:image\/(?:png|jpeg|webp);base64,)?[A-Za-z0-9+/=]+$/.test(value))) throw bad('직접 업로드한 PNG·JPEG·WebP 이미지를 사용해주세요.');
        const allowed = new Set(['requestId', 'async', 'prompt', 'provider', 'model', 'quality', 'size', 'n', 'format', 'moderation', 'mode', 'contextMode', 'webSearchEnabled', 'references', 'referenceImages', 'sourceImage', 'sourceFilename', 'referenceFilenames', 'image', 'parentNodeId', 'extraParentNodeIds', 'sessionId', 'clientNodeId', 'duration', 'resolution', 'aspectRatio']);
        body = Object.fromEntries(Object.entries(body).filter(([key]) => allowed.has(key)));
        body.async = true;
        if (!['oauth', 'grok'].includes(body.provider)) throw bad('관리자가 연결한 GPT 또는 Grok 모델을 선택해주세요.');
      }
    }
  }
  for (const [key, kind] of [['sessionId', 'sessions'], ['requestId', 'requests']]) if (url.searchParams.has(key)) ownership.require(kind, url.searchParams.get(key));
  const controller = new AbortController(); res.on('close', () => controller.abort());
  const upstreamPath = path === '/api/video' ? '/api/video/generate' : path;
  const response = await fetch(new URL(upstreamPath + url.search, config.tools.ima2.target), { method: req.method, headers: { Accept: path === '/api/events' ? 'text/event-stream' : 'application/json', ...(body ? { 'Content-Type': 'application/json' } : {}), ...(req.headers['if-match'] ? { 'If-Match': req.headers['if-match'] } : {}) }, body: body ? JSON.stringify(body) : undefined, signal: controller.signal, redirect: 'error' });
  const claimResult = result => {
    if (!ownership.ownsResult(result)) return false;
    ownership.claim('files', result.filename); ownership.claim('nodes', result.nodeId); return true;
  };
  if (path === '/api/events' && response.ok) {
    res.writeHead(200, { 'Content-Type': 'text/event-stream', 'Cache-Control': 'no-store', 'X-Accel-Buffering': 'no' }); res.write(': connected\n\n');
    const decoder = new TextDecoder(); let buffer = '';
    try {
      for await (const chunk of response.body) {
        buffer += decoder.decode(chunk, { stream: true }); if (buffer.length > 10 * 1024 * 1024) throw bad('이벤트가 너무 큽니다.');
        let end;
        while ((end = buffer.indexOf('\n\n')) >= 0) {
          const frame = buffer.slice(0, end); buffer = buffer.slice(end + 2);
          const data = frame.split('\n').filter(line => line.startsWith('data:')).map(line => line.slice(5).trim()).join('\n');
          if (!data) { res.write(': keepalive\n\n'); continue; }
          try { const item = JSON.parse(data), requestId = item.requestId || item.jobId; if (!requestId || !ownership.owns('requests', requestId)) continue; for (const result of item.images || []) claimResult({ ...result, requestId }); if (item.filename) claimResult({ ...item, requestId }); res.write(frame + '\n\n'); } catch { /* Status reads recover malformed events. */ }
        }
      }
    } finally { if (!res.writableEnded) res.end(); }
    return true;
  }
  const result = await response.json();
  if (response.ok) {
    if (path === '/api/sessions' && req.method === 'POST') ownership.claim('sessions', result.session?.id);
    if (path === '/api/sessions' && req.method === 'GET') result.sessions = (result.sessions || []).filter(s => ownership.owns('sessions', s.id));
    if (path === '/api/history') for (const key of ['images', 'items', 'history']) if (Array.isArray(result[key])) result[key] = result[key].filter(claimResult);
    if (path === '/api/inflight') for (const key of ['jobs', 'terminalJobs']) if (Array.isArray(result[key])) result[key] = result[key].filter(j => ownership.owns('requests', j.requestId));
    if (generation) { if (result.filename) claimResult({ ...result, requestId: body.requestId }); for (const image of result.images || []) claimResult({ ...image, requestId: body.requestId }); }
  }
  json(res, response.status, result); return true;
}
