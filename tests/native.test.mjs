import test from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import { once } from 'node:events';
import { handleIntegration } from '../server/integrations.mjs';
import { authorize, failure } from '../server/http.mjs';
import { generationRequest, mediaAssets, updateJob } from '../public/modules/media-data.js';
import { normalizeTrends, trendEndpoint } from '../public/modules/trend-data.js';
import { button } from '../public/modules/components.js';

async function listen(server) { server.listen(0, '127.0.0.1'); await once(server, 'listening'); return `http://127.0.0.1:${server.address().port}`; }
test('native bridge streams SSE, binary ranges and JSON without leaking credentials; rejects UI, redirects and foreign origins', async t => {
  let received;
  const upstream = http.createServer(async (req, res) => {
    received = { headers: req.headers, url: req.url, method: req.method };
    if (req.url.startsWith('/api/events')) { res.writeHead(200, { 'content-type': 'text/event-stream' }); res.write('id: 8\nevent: progress\ndata: {"jobId":"a","progress":0.5}\n\n'); return; }
    if (req.url.startsWith('/generated/')) { res.writeHead(206, { 'content-type': 'video/mp4', 'content-range': 'bytes 2-4/10', 'accept-ranges': 'bytes' }); res.end(Buffer.from([2, 3, 4])); return; }
    if (req.url === '/api/models') { res.writeHead(302, { location: 'https://external.example' }); res.end(); return; }
    if (req.url === '/api/capabilities') { res.writeHead(200, { 'content-type': 'text/html' }); res.end('<script>bad()</script>'); return; }
    let body = ''; for await (const chunk of req) body += chunk;
    res.writeHead(200, { 'content-type': 'application/json', 'set-cookie': 'secret=1' }); res.end(body || '{}');
  });
  const target = await listen(upstream);
  const origins = [];
  const server = http.createServer((req, res) => {
    try { authorize(req, origins); if (!handleIntegration(req, res, new URL(req.url, 'http://localhost'), { tools: { ima2: { target }, trends: { target } } })) res.end('root'); }
    catch (error) { failure(res, error); }
  });
  const base = await listen(server); origins.push(base);
  t.after(() => { server.closeAllConnections(); upstream.closeAllConnections(); server.close(); upstream.close(); });
  const headers = { origin: base, authorization: 'Bearer should-not-forward', cookie: 'private=1', 'x-forwarded-host': 'evil', 'content-type': 'application/json' };
  const body = JSON.stringify({ provider: 'codex', flow: 'device' });
  const response = await fetch(base + '/integrations/ima2/api/auth/switch', { method: 'POST', headers, body });
  assert.equal(await response.text(), body); assert.equal(received.headers.origin, target);
  assert.equal(received.headers.authorization, undefined); assert.equal(received.headers.cookie, undefined);
  assert.equal(received.headers['x-forwarded-host'], undefined); assert.equal(response.headers.get('set-cookie'), null);
  const controller = new AbortController();
  const stream = await fetch(base + '/integrations/ima2/api/events?lastEventId=7', { signal: controller.signal, headers: { 'last-event-id': '7' } });
  assert.equal(received.url, '/api/events?lastEventId=7'); assert.equal(received.headers['last-event-id'], '7');
  assert.match(new TextDecoder().decode((await stream.body.getReader().read()).value), /event: progress/); controller.abort();
  const range = await fetch(base + '/integrations/ima2/generated/folder/clip.mp4', { headers: { range: 'bytes=2-4' } });
  assert.equal(range.status, 206); assert.equal(range.headers.get('content-range'), 'bytes 2-4/10'); assert.equal(received.headers.range, 'bytes=2-4');
  assert.deepEqual([...new Uint8Array(await range.arrayBuffer())], [2, 3, 4]);
  for (const route of ['/integrations/ima2/', '/integrations/ima2/other', '/integrations/trends/api/auth/switch']) assert.equal((await fetch(base + route)).status, 404);
  // The vendored original frontend needs its full API surface, including config/settings.
  assert.equal((await fetch(base + '/integrations/ima2/api/config')).status, 200);
  for (const route of ['/api/models', '/api/capabilities']) assert.equal((await fetch(base + '/integrations/ima2' + route)).status, 502);
  assert.equal((await fetch(base + '/integrations/ima2/api/auth/switch', { method: 'POST', headers: { ...headers, origin: 'https://evil.test' }, body })).status, 403);
});
test('generation contracts select OAuth only and keep first-frame vs reference video intent', () => {
  const base = { provider: 'grok', model: 'grok-imagine-video-1.5', prompt: 'scene', videoMode: 'auto', duration: '5', resolution: '720p', aspectRatio: '9:16' };
  assert.equal(generationRequest('video', base, [], 'a').body.mode, 'text-to-video');
  const first = generationRequest('video', base, ['image'], 'a').body;
  assert.equal(first.mode, 'image-to-video'); assert.equal(first.sourceImage, 'image'); assert.equal(first.referenceImages, undefined);
  const reference = generationRequest('video', { ...base, videoMode: 'reference-to-video' }, ['image'], 'b').body;
  assert.deepEqual(reference.referenceImages, ['image']);
  assert.throws(() => generationRequest('video', { ...base, resolution: '1080p' }, ['a', 'b'], 'a'), /720p/);
  assert.throws(() => generationRequest('video', { ...base, model: 'grok-imagine-video', duration: '15' }, ['a', 'b'], 'a'), /10초/);
  assert.throws(() => generationRequest('image', { ...base, provider: 'grok-api' }, [], 'a'), /OAuth/);
  const image = generationRequest('image', { ...base, provider: 'oauth', n: '2' }, ['a'], 'a');
  assert.equal(image.endpoint, '/api/generate'); assert.equal(image.body.async, true); assert.equal(image.body.n, 2);
  assert.throws(() => generationRequest('edit', base, ['a', 'b'], 'a'), /1장/);
  assert.equal(generationRequest('edit', base, ['a'], 'a').body.image, 'a');
});
test('terminal media events cannot be regressed by late or replayed events; results work without base64', () => {
  const job = { status: 'running', sequence: 4 };
  assert.equal(updateJob(job, 'progress', { jobSeq: 3, progress: 0.9 }), job);
  const done = updateJob(job, 'done', { jobSeq: 5, filename: 'scene.png', _imageOmitted: true });
  assert.equal(done.assets[0].filename, 'scene.png'); assert.equal(done.status, 'done');
  assert.equal(updateJob(done, 'error', { jobSeq: 6, error: 'late error' }), done);
  assert.equal(mediaAssets({ filename: 'clip.mp4' })[0].mediaType, 'video');
});
test('trend adapters preserve source evidence and block unsafe links, while ARIA booleans remain valid', () => {
  const items = normalizeTrends('analysis', { clusters: [{ title: '<title>', why: 'Why', evidence: [{ title: 'safe', url: 'https://example.com/story' }, { title: 'bad', url: 'javascript:alert(1)' }] }] });
  assert.equal(items[0].evidence.length, 1); assert.equal(items[0].description, 'Why');
  assert.equal(normalizeTrends('saved', { items: [{ title: 'Bad', url: 'javascript:alert(1)', thumbnail: 'data:script' }] })[0].url, '');
  assert.match(trendEndpoint('shorts', { query: 'cat & dog' }), /shorts=1/);
  assert.match(button('selected', { attrs: { 'aria-pressed': true, disabled: false } }), /aria-pressed="true"/);
  assert.match(button('unselected', { attrs: { 'aria-pressed': false } }), /aria-pressed="false"/);
});
