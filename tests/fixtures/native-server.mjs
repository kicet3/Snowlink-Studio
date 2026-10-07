// Isolated browser QA: no real OAuth exchange, generation, user data or source-service writes.
import http from 'node:http';
import { once } from 'node:events';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createApp } from '../../server/app.mjs';
import { config, ROOT } from '../../server/config.mjs';
import { json, readJson } from '../../server/http.mjs';

const dataDir = await mkdtemp(join(tmpdir(), 'snowfall-native-qa-'));
const streams = new Set();
const sessions = new Map();
const history = [];
const terminalJobs = [];
let saved = [];
let selected = 'gpt';
let sequence = 0;
const png = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aN2kAAAAASUVORK5CYII=', 'base64');
const upstream = http.createServer(async (req, res) => {
  const url = new URL(req.url, 'http://localhost');
  if (url.pathname === '/api/events') {
    res.writeHead(200, { 'content-type': 'text/event-stream' }); res.write(': connected\n\n'); streams.add(res); res.on('close', () => streams.delete(res)); return;
  }
  if (url.pathname.startsWith('/generated/')) { res.writeHead(200, { 'content-type': 'image/png' }); res.end(png); return; }
  if (url.pathname === '/api/models') return json(res, 200, { lanes: { oauth: { status: 'ready', defaults: { image: 'gpt-6-luna' }, models: { image: [{ id: 'gpt-6-luna' }], video: [] } }, grok: { status: 'ready', defaults: { image: 'grok-imagine-image-2.0', video: 'grok-imagine-video-1.5' }, models: { image: [{ id: 'grok-imagine-image-2.0' }], video: [{ id: 'grok-imagine-video-1.5' }] } } } });
  if (url.pathname === '/api/oauth/status') return json(res, 200, { auth: { loggedIn: true, email: 'qa@example.test', plan: 'QA' }, grokAuth: { loggedIn: false } });
  if (url.pathname === '/api/auth/switch' && req.method === 'POST') {
    const body = await readJson(req);
    if (body.flow !== 'device' || !['codex', 'grok'].includes(body.provider)) return json(res, 400, { error: 'invalid auth contract' });
    const id = crypto.randomUUID(); sessions.set(id, { polls: 0, canceled: false });
    return json(res, 200, { sessionId: id, flow: 'device', userCode: 'QA-123456', verificationUrl: 'https://example.com/qa-login', expiresIn: 600 });
  }
  if (url.pathname.startsWith('/api/auth/switch/')) {
    const session = sessions.get(url.pathname.split('/').pop());
    if (!session) return json(res, 404, { error: 'expired' });
    if (req.method === 'DELETE') session.canceled = true;
    return json(res, 200, { status: session.canceled ? 'expired' : ++session.polls >= 2 ? 'complete' : 'pending' });
  }
  if (url.pathname === '/api/inflight') return json(res, 200, { jobs: [], terminalJobs });
  if (url.pathname === '/api/history') return json(res, 200, { items: history.filter(i => !url.searchParams.get('requestId') || i.requestId === url.searchParams.get('requestId')), total: history.length, nextCursor: null });
  if (['/api/generate', '/api/edit', '/api/video'].includes(url.pathname)) {
    const body = await readJson(req);
    if (!body.prompt || !['oauth', 'grok'].includes(body.provider)) return json(res, 400, { error: 'invalid generation contract' });
    const result = { filename: `qa-${body.requestId}.png`, requestId: body.requestId, prompt: body.prompt, mediaType: 'image' };
    history.unshift(result);
    if (url.pathname === '/api/edit') return json(res, 200, result);
    json(res, 202, { requestId: body.requestId });
    setTimeout(() => {
      terminalJobs.push({ requestId: body.requestId, status: 'completed' });
      for (const stream of streams) stream.write(`id: ${++sequence}\nevent: done\ndata: ${JSON.stringify({ ...result, jobId: body.requestId, jobSeq: 1 })}\n\n`);
    }, 300);
    return;
  }
  if (url.pathname === '/api/categories') return json(res, 200, { categories: ['전체', 'AI'] });
  if (url.pathname === '/api/trends') return json(res, 200, { trends: [{ keyword: '가을 산책 QA', traffic: '1000+', news: [{ title: '테스트 참고 기사', url: 'https://example.com/story', source: 'QA' }] }], fetchedAt: Date.now() / 1000 });
  if (url.pathname === '/api/saved') {
    if (req.method === 'POST') { const body = await readJson(req); saved = body.action === 'remove' ? saved.filter(i => i.id !== body.id) : [...saved, { ...body, id: crypto.randomUUID() }]; }
    return json(res, 200, { items: saved });
  }
  return json(res, 200, { videos: [], posts: [], accounts: [] });
});
upstream.listen(0, '127.0.0.1'); await once(upstream, 'listening');
const target = `http://127.0.0.1:${upstream.address().port}`;
const appConfig = { ...config, tools: { ima2: { ...config.tools.ima2, target }, trends: { ...config.tools.trends, target } } };
const app = createApp({ testAuthBypass: true, root: ROOT, dataDir, config: appConfig, allowedOrigins: ['http://127.0.0.1:3480'], toolUrls: () => ({ ima2: target, trends: target }), bootId: 'native-browser-qa' });
const handler = app.listeners('request')[0];
const server = http.createServer(async (req, res) => {
  if (req.url.startsWith('/api/ai/')) {
    if (req.method === 'PUT') selected = (await readJson(req)).provider;
    return json(res, 200, { selected, providers: { gpt: { ready: true, model: 'gpt-6-luna' }, grok: { ready: true, model: 'grok-4.3' } } });
  }
  if (req.url === '/api/connections') return json(res, 200, { ima2: { online: true }, trends: { online: true } });
  return handler(req, res);
});
server.listen(3480, '127.0.0.1'); await once(server, 'listening');
console.log('Isolated native UI QA ready: http://127.0.0.1:3480');
for (const signal of ['SIGINT', 'SIGTERM']) process.on(signal, async () => {
  server.closeAllConnections(); upstream.closeAllConnections(); server.close(); upstream.close(); await rm(dataDir, { recursive: true, force: true }); process.exit(0);
});
