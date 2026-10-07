import http from 'node:http';
import { mkdtemp, rm, writeFile, mkdir } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createApp } from '../../server/app.mjs';
import { createStore } from '../../server/store.mjs';
import { config, ROOT } from '../../server/config.mjs';
import { json } from '../../server/http.mjs';

const dataDir = await mkdtemp(join(tmpdir(), 'snowfall-ui-qa-'));
await mkdir(join(dataDir, 'media'));
await writeFile(join(dataDir, 'media/qa.png'), Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+a2ioAAAAASUVORK5CYII=', 'base64'));
const store = createStore(dataDir);
const character = store.upsert('characters', { name: '검증 캐릭터', description: '갈색 코트를 입은 인물', tags: '검증', image: '/media/qa.png' });
store.upsert('productions', { title: '검증용 제작 기획', format: 'story', stage: 'script', story: '가을 산책 중 눈을 발견하는 장면', characterIds: [character.id] });
const app = createApp({ testAuthBypass: true, root: ROOT, dataDir, config, allowedOrigins: ['http://127.0.0.1:3480'], toolUrls: () => ({ ima2: 'http://127.0.0.1:3401', trends: 'http://127.0.0.1:3402' }), bootId: 'integrated-qa' });
const handler = app.listeners('request')[0];
const server = http.createServer((req, res) => {
  // Real inference, OAuth changes and upstream mutations are prohibited in this QA fixture.
  if (req.url.startsWith('/integrations/') && !['GET', 'HEAD'].includes(req.method)) return json(res, 409, { error: 'QA: 원본 서버 변경 차단' });
  return handler(req, res);
});
server.listen(3480, '127.0.0.1', () => console.log('Integrated QA at http://127.0.0.1:3480 (temporary data; upstream read-only)'));
for (const signal of ['SIGINT', 'SIGTERM']) process.on(signal, async () => {
  server.closeAllConnections(); server.close(); await rm(dataDir, { recursive: true, force: true }); process.exit(0);
});
