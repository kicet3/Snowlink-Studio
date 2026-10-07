import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { studioFixture, TEST_PASSWORD } from './helpers/studio-fixture.mjs';
import { oauthGrant } from './helpers/oauth-client.mjs';

test('OAuth discovery, PKCE, exact callback/resource, consent, one-use codes, rotating refresh and revocation', async () => {
  const f = await studioFixture(); const cookie = await f.login();
  try {
    const unauth = await fetch(f.base + '/mcp'); assert.equal(unauth.status, 401); assert.match(unauth.headers.get('www-authenticate'), /resource_metadata=/);
    const resource = await (await fetch(f.base + '/.well-known/oauth-protected-resource/mcp')).json(); assert.equal(resource.resource, f.base + '/mcp');
    const metadata = await (await fetch(f.base + '/.well-known/oauth-authorization-server')).json(); assert.deepEqual(metadata.code_challenge_methods_supported, ['S256']); assert.equal(metadata.registration_endpoint, f.base + '/oauth/register');
    const grant = await oauthGrant(f.base, cookie, { beforeExchange: async ({ exchange, tokenInput, requestId, params }) => {
      assert.equal((await exchange({ ...tokenInput, code_verifier: 'wrong-verifier'.repeat(4) })).status, 400);
      assert.equal((await exchange({ ...tokenInput, redirect_uri: 'https://attacker.invalid/callback' })).status, 400);
      assert.equal((await exchange({ ...tokenInput, resource: f.base + '/other' })).status, 400);
      assert.equal((await fetch(f.base + '/api/oauth/requests/' + requestId, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{"approve":true}' })).status, 401);
      const invalid = await fetch(f.base + '/oauth/authorize?' + new URLSearchParams({ ...params, redirect_uri: 'https://attacker.invalid/' }), { redirect: 'manual' }); assert.equal(invalid.status, 400); assert.equal(invalid.headers.get('location'), null);
    } });
    assert.equal(grant.redirect.searchParams.get('state'), 'test-state'); assert.equal((await grant.exchange(grant.tokenInput)).status, 400);
    const access = async token => fetch(f.base + '/api/mcp/execute', { method: 'POST', headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' }, body: '{"name":"studio_workspace","arguments":{}}' });
    assert.equal((await access(grant.tokens.access_token)).status, 200);
    const input = { grant_type: 'refresh_token', client_id: grant.client.client_id, refresh_token: grant.tokens.refresh_token, resource: f.base + '/mcp' };
    const rotated = await (await grant.exchange(input)).json(); assert.ok(rotated.access_token); assert.notEqual(rotated.refresh_token, grant.tokens.refresh_token);
    assert.equal((await access(rotated.access_token)).status, 200);
    assert.equal((await grant.exchange(input)).status, 400); assert.equal((await access(rotated.access_token)).status, 401);
    const denied = await oauthGrant(f.base, cookie, { approve: false }); assert.equal(denied.redirect.searchParams.get('error'), 'access_denied'); assert.equal(denied.redirect.searchParams.get('code'), null);
    const valid = await oauthGrant(f.base, cookie);
    const grants = await (await fetch(f.base + '/api/oauth/grants', { headers: { Cookie: cookie } })).json(); assert.equal(grants.grants.length, 1);
    await fetch(f.base + '/api/oauth/grants/revoke', { method: 'POST', headers: { Cookie: cookie, 'Content-Type': 'application/json' }, body: JSON.stringify({ id: grants.grants[0].id }) });
    assert.equal((await access(valid.tokens.access_token)).status, 401);
    const stored = readFileSync(join(f.dataDir, 'mcp-oauth.json'), 'utf8'); assert.ok(!stored.includes(valid.tokens.access_token)); assert.ok(!stored.includes(valid.tokens.refresh_token));
  } finally { await f.close(); }
});

test('OAuth consent binds to the browser account, and a password change revokes OAuth access and refresh', async () => {
  const f = await studioFixture(); const admin = await f.login();
  try {
    const signup = await fetch(f.base + '/api/auth/register', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ username: 'alice', password: TEST_PASSWORD }) }); const alice = signup.headers.get('set-cookie').split(';')[0];
    const grant = await oauthGrant(f.base, alice, { beforeExchange: async ({ requestId }) => {
      const replay = await fetch(f.base + '/api/oauth/requests/' + requestId, { method: 'POST', headers: { Cookie: admin, 'Content-Type': 'application/json' }, body: '{"approve":true}' }); assert.equal(replay.status, 400);
    } });
    await fetch(f.base + '/api/characters', { method: 'POST', headers: { Cookie: admin, 'Content-Type': 'application/json' }, body: '{"name":"관리자 캐릭터"}' });
    const result = await fetch(f.base + '/api/mcp/execute', { method: 'POST', headers: { Authorization: `Bearer ${grant.tokens.access_token}`, 'Content-Type': 'application/json' }, body: '{"name":"studio_workspace","arguments":{}}' }); assert.equal((await result.json()).characters.length, 0);
    await fetch(f.base + '/api/auth/password', { method: 'POST', headers: { Cookie: alice, 'Content-Type': 'application/json' }, body: JSON.stringify({ currentPassword: TEST_PASSWORD, password: 'new-password-for-oauth!' }) });
    assert.equal((await fetch(f.base + '/mcp', { headers: { Authorization: `Bearer ${grant.tokens.access_token}` } })).status, 401);
    assert.equal((await grant.exchange({ grant_type: 'refresh_token', client_id: grant.client.client_id, refresh_token: grant.tokens.refresh_token, resource: f.base + '/mcp' })).status, 400);
  } finally { await f.close(); }
});
