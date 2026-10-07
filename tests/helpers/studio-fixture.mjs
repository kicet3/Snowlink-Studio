import http from 'node:http';
import { once } from 'node:events';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { randomUUID } from 'node:crypto';
import { createApp } from '../../server/app.mjs';
import { createAuth } from '../../server/auth.mjs';

export const TEST_PASSWORD = 'fixture-password-123!';
export const PNG = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+j0f0AAAAASUVORK5CYII=', 'base64');
const reply = (res, data, status = 200) => { res.writeHead(status, { 'Content-Type': 'application/json' }); res.end(JSON.stringify(data)); };
export async function studioFixture(port = 0, { publicAccess = false } = {}) {
  const dataDir = mkdtempSync(join(tmpdir(), 'snowfall-story-'));
  const auth = createAuth(dataDir, { publicAccess }); await auth.createUser({ username: 'admin', name: '테스트 관리자', password: TEST_PASSWORD }, 'admin');
  const sessions = new Map(), history = [], flights = [], captured = { chats: [], generations: [], graphWrites: [] }, behavior = { short: false };
  const roles = { chat: { provider: 'gpt', model: 'fixture-chat' }, planning: { provider: 'gpt', model: 'fixture-chat' }, image: { provider: 'gpt', model: 'fixture-image' }, video: { provider: 'grok', model: 'fixture-video' } };
  const ai = { settings: { read: () => ({ roles, revision: 0 }) }, catalog: async () => Object.fromEntries(Object.entries(roles).map(([role, value]) => [role, { [value.provider]: [{ id: value.model, label: value.model }] }])), status: async () => ({ selected: 'gpt', providers: { gpt: { ready: true }, grok: { ready: true } } }),
    async complete(messages) {
      captured.chats.push(messages); await new Promise(resolve => setTimeout(resolve, 15));
      const system = messages[0].content; let result;
      const context = JSON.parse(messages[1].content);
      if (system.includes('영상 아트 디렉터')) result = { reply: '따뜻한 수채화 배경의 2D 애니메이션으로 정리했습니다. 움직임은 차분하게 유지할까요?', template: { name: '따뜻한 수채화 애니메이션', description: '수채화 배경과 부드러운 2D 움직임', prompt: '따뜻한 수채화 배경, 일관된 2D 캐릭터, 부드러운 셀 셰이딩. 차분한 카메라와 자연스러운 감정 연기.' } };
      else if (system.includes('핵심 장면')) result = { reply: '원고의 핵심 장면 2개를 이미지와 영상 노드로 만들었습니다.', scenes: [{ title: '열쇠 발견', imagePrompt: '서아가 안개 낀 창고에서 푸른 열쇠를 발견한다.', videoPrompt: '서아가 푸른 열쇠를 집어 들고 문 쪽을 바라본다. 느린 줌 인.', characterIds: [] }, { title: '문 앞', imagePrompt: '서아가 오래된 문 앞에 선다. 측면 구도.', videoPrompt: '서아가 조심스레 문손잡이를 돌린다. 금속 소리가 울린다.', characterIds: [] }] };
      else if (system.includes('먼저 전체 플롯만')) result = { plot: '서아는 푸른 열쇠를 발견하고 오래된 문을 열어 마을의 비밀을 해결한다. 1화 발견, 2화 열쇠의 비밀을 회수하고 화해한다.' };
      else if (system.includes('플롯만 작성')) result = { title: context.currentEpisode.number === 1 ? '푸른 열쇠' : '문 너머의 진실', plot: `${context.currentEpisode.number}화: 서아는 앞선 사건을 따라 문에 다가간다. 열쇠의 정체를 밝히며 다음 선택으로 연결한다.` };
      else {
        const number = context.currentEpisode?.number || 1;
        const evidence = number === 1 ? '서아는 푸른 열쇠를 발견했다.' : '서아는 푸른 열쇠로 오래된 문을 열었다.';
        const content = context.content || (behavior.short ? evidence : evidence + ' 비가 그친 마을에는 고요한 발소리가 퍼졌다. 서아는 손에 남은 온기를 느끼며 잠시 숨을 골랐다. 친구는 그 곁에서 고개를 끄덕였다. 두 사람은 서로의 선택을 믿기로 했다. 문 너머에서 불어오는 바람이 오래된 기억을 깨웠다. 서아는 이제 도망치지 않겠다고 말했다.');
        result = { content, memory: { summary: evidence, facts: [{ subject: '서아', relation: number === 1 ? '발견' : '열었다', object: number === 1 ? '푸른 열쇠' : '오래된 문', evidence }], introduced: number === 1 ? [{ key: 'blue-key', title: '푸른 열쇠의 비밀', description: '서아가 발견한 푸른 열쇠가 어느 문을 여는가?', evidence, payoffEpisode: 2 }] : [], developments: number === 2 && context.storyGraphContext?.threads[0] ? [{ threadId: context.storyGraphContext.threads[0].id, action: 'resolve', description: '오래된 문을 여는 열쇠였음이 드러났다.', evidence }] : [] } };
      }
      return { provider: 'gpt', model: 'fixture-chat', content: JSON.stringify(result) };
    },
  };
  const upstream = http.createServer(async (req, res) => {
    const url = new URL(req.url, 'http://localhost'); let input;
    if (['POST', 'PUT', 'PATCH'].includes(req.method)) { let text = ''; for await (const chunk of req) text += chunk; input = JSON.parse(text || '{}'); }
    if (url.pathname === '/api/sessions') {
      if (req.method === 'GET') return reply(res, { sessions: [...sessions.values()] });
      const session = { id: 's_' + randomUUID(), title: input.title, graphVersion: 0, nodes: [], edges: [] }; sessions.set(session.id, session); return reply(res, { session }, 201);
    }
    const match = /^\/api\/sessions\/([\w-]+)(\/graph)?$/.exec(url.pathname);
    if (match) {
      const session = sessions.get(match[1]); if (!session) return reply(res, { error: 'Not found' }, 404);
      if (req.method === 'GET') return reply(res, { session });
      captured.graphWrites.push(req.headers['if-match']);
      if (Number(req.headers['if-match']) !== session.graphVersion) return reply(res, { error: 'Conflict' }, 409);
      Object.assign(session, input, { graphVersion: session.graphVersion + 1 }); return reply(res, { ok: true, graphVersion: session.graphVersion });
    }
    if (['/api/node/generate', '/api/generate', '/api/video/generate'].includes(url.pathname)) {
      captured.generations.push({ path: url.pathname, ...input });
      flights.push({ requestId: input.requestId, status: 'running' }); reply(res, { requestId: input.requestId }, 202);
      setTimeout(() => {
        const video = url.pathname.includes('/video/'), nodeId = 'n_' + randomUUID();
        history.push({ filename: nodeId + (video ? '.mp4' : '.png'), requestId: input.requestId, nodeId, sessionId: input.sessionId, clientNodeId: input.clientNodeId, ...(video ? { video: { duration: 5, resolution: '480p', aspectRatio: '16:9' } } : {}) });
        flights.splice(flights.findIndex(f => f.requestId === input.requestId), 1);
      }, 50); return;
    }
    if (url.pathname === '/api/history') return reply(res, { images: history.filter(h => !url.searchParams.has('requestId') || h.requestId === url.searchParams.get('requestId')) });
    if (url.pathname === '/api/inflight') return reply(res, { jobs: flights, terminalJobs: [] });
    if (url.pathname.startsWith('/generated/')) { res.writeHead(200, { 'Content-Type': 'image/png' }); res.end(PNG); return; }
    if (url.pathname === '/api/events') { res.writeHead(200, { 'Content-Type': 'text/event-stream' }); res.write(': ready\n\n'); return; }
    if (url.pathname === '/api/health') return reply(res, { ok: true });
    if (url.pathname === '/api/grok/status') return reply(res, { status: 'ready', models: ['grok-imagine-image-2.0'], credential: 'private-fixture-value' });
    reply(res, {});
  });
  upstream.listen(0, '127.0.0.1'); await once(upstream, 'listening');
  const target = `http://127.0.0.1:${upstream.address().port}`, origins = [];
  const config = { port, publicAccess, ai: { provider: 'gpt', gptModel: 'fixture-chat', grokModel: 'fixture-chat' }, tools: { ima2: { target, name: '테스트 미디어' }, trends: { target, name: '테스트 트렌드' } }, shortgpt: {} };
  const server = createApp({ root: fileURLToPath(new URL('../../', import.meta.url)), dataDir, config, allowedOrigins: origins, toolUrls: () => ({ ima2: target, trends: target }), ai, auth });
  server.listen(port, '127.0.0.1'); await once(server, 'listening');
  const base = `http://127.0.0.1:${server.address().port}`; origins.push(base);
  async function login(username = 'admin', password = TEST_PASSWORD) {
    const response = await fetch(base + '/api/auth/login', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ username, password }) });
    if (!response.ok) throw new Error('Fixture login failed');
    return response.headers.get('set-cookie').split(';')[0];
  }
  return { base, dataDir, config, auth, captured, behavior, sessions, history, login, async close() { server.closeAllConnections(); upstream.closeAllConnections(); await Promise.all([new Promise(resolve => server.close(resolve)), new Promise(resolve => upstream.close(resolve))]); rmSync(dataDir, { recursive: true, force: true }); } };
}
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const fixture = await studioFixture(3487); console.log(`Studio fixture: ${fixture.base}/#scenarios`);
  process.on('SIGTERM', () => void fixture.close().then(() => process.exit(0)));
}
