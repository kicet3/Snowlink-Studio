import http from 'node:http';
import { once } from 'node:events';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createApp } from '../../server/app.mjs';

const PNG = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+j0f0AAAAASUVORK5CYII=', 'base64');
const reply = (res, data, status = 200) => { res.writeHead(status, { 'Content-Type': 'application/json' }); res.end(JSON.stringify(data)); };

// Isolated HTTP fixture: exercises the real UI, routes, templates and media persistence without paid inference.
export async function characterFixture(port = 0) {
  const dataDir = mkdtempSync(join(tmpdir(), 'snowfall-character-browser-'));
  const streams = new Set(), running = new Map(), history = [];
  const captured = { chats: [], generations: [] };
  const roles = { chat: { provider: 'gpt', model: 'fixture-chat' }, planning: { provider: 'gpt', model: 'fixture-chat' }, image: { provider: 'gpt', model: 'fixture-image' }, video: { provider: 'grok', model: 'fixture-video' } };
  const ai = {
    settings: { read: () => ({ roles, revision: 0 }) }, catalog: async () => Object.fromEntries(Object.entries(roles).map(([role, value]) => [role, { [value.provider]: [{ id: value.model, label: value.model }] }])),
    status: async () => ({ selected: 'gpt', providers: { gpt: { ready: true }, grok: { ready: false } } }),
    async complete(messages, provider, role, images) {
      captured.chats.push({ messages, provider, role, images });
      await new Promise(resolve => setTimeout(resolve, 300));
      const message = messages.at(-1).content;
      if (message === '응답 오류 테스트') return { content: 'invalid JSON' };
      const revised = message.includes('회색 후드');
      const description = `크림색 털과 갈색 눈의 차분한 고양이 직장인. ${revised ? '회색 후드와 남색 바지' : '남색 조끼와 크림색 셔츠'}. 모든 각도에서 얼굴·체형·의상을 유지합니다.`;
      return { provider: 'gpt', model: 'fixture-chat', content: JSON.stringify({ reply: `이름은 모모를 제안합니다. ${description}\n이 설정으로 캐릭터 시트를 직접 생성할까요?`, profile: { name: '모모 · 검증용', description, tags: '고양이, 직장인' }, ready: true, sheetPrompt: `Character sheet. ${description}\n${messages[0].content.includes('official character design sheet') ? 'Anime style; Korean annotations, expressions, clothing breakdown and color swatches.' : 'Large portrait and front/back full body, gray background, no labels.'}` }) };
    },
  };
  const upstream = http.createServer(async (req, res) => {
    const url = new URL(req.url, 'http://localhost');
    if (url.pathname === '/api/events') {
      res.writeHead(200, { 'Content-Type': 'text/event-stream' }); res.write(': ready\n\n'); streams.add(res); res.on('close', () => streams.delete(res)); return;
    }
    if (url.pathname === '/api/health') return reply(res, { ok: true, version: 'fixture' });
    if (url.pathname === '/api/categories') return reply(res, { categories: [] });
    if (url.pathname === '/api/inflight') return reply(res, { jobs: [...running.values()], terminalJobs: history.map(h => ({ requestId: h.requestId, status: 'completed' })) });
    if (url.pathname === '/api/history') return reply(res, { images: history.filter(h => !url.searchParams.has('requestId') || url.searchParams.get('requestId') === h.requestId) });
    if (url.pathname.startsWith('/generated/')) { res.writeHead(200, { 'Content-Type': 'image/png' }); res.end(PNG); return; }
    if (url.pathname === '/api/generate' && req.method === 'POST') {
      let body = ''; for await (const chunk of req) body += chunk;
      const input = JSON.parse(body); captured.generations.push(input);
      const requestId = input.requestId; running.set(requestId, { requestId });
      reply(res, { requestId, async: true }, 202);
      setTimeout(() => {
        running.delete(requestId); const image = { filename: requestId + '.png', requestId, mediaType: 'image', prompt: input.prompt }; history.push(image);
        for (const stream of streams) stream.write(`event: done\ndata: ${JSON.stringify({ jobId: requestId, images: [image] })}\n\n`);
      }, 750);
      return;
    }
    reply(res, {});
  });
  upstream.listen(0, '127.0.0.1'); await once(upstream, 'listening');
  const target = `http://127.0.0.1:${upstream.address().port}`;
  const origins = [];
  const config = { ai: { provider: 'gpt', gptModel: 'fixture-chat', grokModel: 'fixture-chat' }, tools: { ima2: { target, name: '테스트 이미지 서버' }, trends: { target, name: '테스트 트렌드 서버' } }, shortgpt: {} };
  const server = createApp({ testAuthBypass: true, root: fileURLToPath(new URL('../../', import.meta.url)), dataDir, config, allowedOrigins: origins, toolUrls: () => ({ ima2: target, trends: target }), ai });
  server.listen(port, '127.0.0.1'); await once(server, 'listening');
  const base = `http://127.0.0.1:${server.address().port}`; origins.push(base);
  return { base, dataDir, captured, close() { server.closeAllConnections(); upstream.closeAllConnections(); server.close(); upstream.close(); rmSync(dataDir, { recursive: true, force: true }); } };
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const fixture = await characterFixture(3487);
  console.log(`Character UI fixture: ${fixture.base}/#characters`);
  process.on('SIGTERM', () => { fixture.close(); process.exit(0); });
  process.on('SIGINT', () => { fixture.close(); process.exit(0); });
}
