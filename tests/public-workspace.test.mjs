import test from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { studioFixture, PNG } from './helpers/studio-fixture.mjs';

test('public visitors get isolated persistent workspaces and use the existing AI and media services', async () => {
  const f = await studioFixture(0, { publicAccess: true });
  const req = (path, cookie, method = 'GET', body) => fetch(f.base + path, { method, headers: { ...(cookie ? { Cookie: cookie } : {}), ...(body ? { 'Content-Type': 'application/json' } : {}) }, body: body ? JSON.stringify(body) : undefined });
  try {
    const a = await req('/api/auth/guest', null, 'POST', {}), b = await req('/api/auth/guest', null, 'POST', {});
    assert.equal(a.status, 201); assert.equal(b.status, 201);
    const alice = await a.json(), bob = await b.json();
    assert.equal(alice.user.role, 'guest'); assert.notEqual(alice.user.id, bob.user.id);
    const ca = a.headers.get('set-cookie').split(';')[0], cb = b.headers.get('set-cookie').split(';')[0];
    assert.match(a.headers.get('set-cookie'), /HttpOnly/);
    assert.equal((await (await req('/api/auth/guest', ca, 'POST', {})).json()).user.id, alice.user.id);
    const upload = await (await req('/api/media', ca, 'POST', { data: 'data:image/png;base64,' + PNG.toString('base64') })).json();
    assert.equal((await req('/api/characters', ca, 'POST', { name: '방문자 캐릭터', image: upload.image })).status, 201);
    assert.equal((await (await req('/api/workspace', ca)).json()).characters.length, 1);
    assert.equal((await (await req('/api/workspace', cb)).json()).characters.length, 0);
    assert.equal((await req(upload.image, cb)).status, 404);
    const grokStatus = await req('/integrations/ima2/api/grok/status', ca);
    assert.equal(grokStatus.status, 200);
    assert.deepEqual(await grokStatus.json(), { status: 'ready', models: ['grok-imagine-image-2.0'], managed: true });
    const admin = await f.login();
    assert.equal((await (await req('/api/workspace', admin)).json()).characters.length, 0);
    const completion = await req('/v1/chat/completions', ca, 'POST', { messages: [{ role: 'system', content: '영상 아트 디렉터' }, { role: 'user', content: '{}' }] });
    assert.equal(completion.status, 200); assert.equal(f.captured.chats.length, 1);
    const media = await req('/integrations/ima2/api/generate', ca, 'POST', { prompt: '테스트 장면', provider: 'oauth', model: 'fixture-image' });
    assert.equal(media.status, 202); assert.equal(f.captured.generations[0].provider, 'oauth');
    Object.assign(f.config.ai, { fixedProviders: true, imageModel: 'grok-imagine-image-2.0', videoModel: 'grok-imagine-video-1.5' });
    for (const [path, model] of [['/api/generate', f.config.ai.imageModel], ['/api/video', f.config.ai.videoModel]]) {
      const response = await req('/integrations/ima2' + path, ca, 'POST', { prompt: '장면', provider: 'oauth', model: 'old-gpt-model' });
      assert.equal(response.status, 202);
      assert.equal(f.captured.generations.at(-1).provider, 'grok');
      assert.equal(f.captured.generations.at(-1).model, model);
    }
    for (const path of ['/api/google/status', '/api/meta/status']) assert.equal((await req(path, ca)).status, 401);
    for (const path of ['/api/ai/settings', '/api/ai/provider']) assert.equal((await req(path, ca, 'PUT', {})).status, 401);
    for (const path of ['/api/mcp/token', '/api/auth/password']) assert.equal((await req(path, ca, 'POST', {})).status, 401);
    assert.equal((await req('/api/oauth/grants', ca)).status, 401);
    assert.equal((await req('/mcp', ca, 'POST', {})).status, 401);
    assert.equal((await req('/integrations/ima2/api/auth/switch', ca, 'POST', {})).status, 403);
    assert.equal(existsSync(join(f.dataDir, 'users', alice.user.id, 'mcp-token')), false);
    assert.ok(!readFileSync(join(f.dataDir, 'accounts.json'), 'utf8').includes(ca.split('=')[1]));
    const foreign = await fetch(f.base + '/api/auth/guest', { method: 'POST', headers: { Origin: 'https://attacker.invalid', 'Content-Type': 'application/json' }, body: '{}' });
    assert.equal(foreign.status, 403);
    await req('/api/auth/logout', ca, 'POST', {});
    assert.equal((await req('/api/workspace', ca)).status, 401);
  } finally { await f.close(); }
});

test('guest bootstrap is disabled unless public access is enabled', async () => {
  const f = await studioFixture();
  try { assert.equal((await fetch(f.base + '/api/auth/guest', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{}' })).status, 404); }
  finally { await f.close(); }
});
