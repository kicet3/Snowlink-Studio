import test from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import { once } from 'node:events';
import { createProxy } from '../server/proxy.mjs';

async function listen(server) { server.listen(0, '127.0.0.1'); await once(server, 'listening'); return `http://127.0.0.1:${server.address().port}`; }
test('tool proxy preserves body and SSE, rewrites only trusted origins, and scopes frame permissions', async t => {
  let received;
  const upstream = http.createServer(async (req, res) => {
    received = req.headers;
    if (req.url === '/events') { res.writeHead(200, { 'content-type': 'text/event-stream' }); res.end('data: {"ok":true}\n\n'); return; }
    if (req.method === 'POST') { let body = ''; for await (const part of req) body += part; res.end(body); return; }
    res.writeHead(200, { 'content-type': 'text/html', 'content-security-policy': "default-src 'self'; frame-ancestors 'none'", 'x-frame-options': 'DENY' }); res.end('<h1>tool</h1>');
  });
  const target = await listen(upstream);
  const allowed = [];
  const proxy = createProxy({ target, allowedOrigins: allowed, parentOrigins: ['https://studio.example:9450'] });
  const base = await listen(proxy); allowed.push(base);
  t.after(() => { proxy.closeAllConnections(); upstream.closeAllConnections(); proxy.close(); upstream.close(); });
  const page = await fetch(base);
  assert.equal(page.headers.get('content-security-policy'), "default-src 'self'; frame-ancestors https://studio.example:9450");
  assert.equal(page.headers.get('x-frame-options'), null);
  assert.equal(await page.text(), '<h1>tool</h1>');
  const posted = await fetch(base + '/upload', { method: 'POST', headers: { Origin: base, 'Content-Type': 'application/json' }, body: '{"sheet":"bytes"}' });
  assert.equal(await posted.text(), '{"sheet":"bytes"}');
  assert.equal(received.origin, target);
  assert.equal((await fetch(base, { headers: { Origin: 'https://evil.test' } })).status, 403);
  assert.equal(await (await fetch(base + '/events')).text(), 'data: {"ok":true}\n\n');
});
