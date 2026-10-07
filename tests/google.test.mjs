import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, writeFileSync, readFileSync, existsSync, statSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createHash } from 'node:crypto';
import { createGoogleConnection, loadGoogleCredentials, GOOGLE_CALLBACK_PATH, GOOGLE_SCOPES } from '../server/google.mjs';
import { createGoogleVault } from '../server/googleVault.mjs';
import { createApp } from '../server/app.mjs';
import { config, ROOT } from '../server/config.mjs';

const credentials = { clientId: 'test.apps.googleusercontent.com', clientSecret: 'private-client-secret', apiKey: 'private-api-key' };
const base = 'http://localhost:3400';
const remote = 'https://studio.example.test:9450';
const request = (origin = base, cookie = '') => ({ headers: { host: new URL(origin).host, origin, cookie } });
const response = (data, status = 200) => new Response(JSON.stringify(data), { status, headers: { 'content-type': 'application/json' } });
const tokens = (extra = {}) => ({ access_token: 'private-access-token', refresh_token: 'private-refresh-token', expires_in: 3600, scope: GOOGLE_SCOPES.join(' '), token_type: 'Bearer', ...extra });
const channels = { items: [{ id: 'UCtest', snippet: { title: '테스트 채널 <script>' }, statistics: { viewCount: '1234', subscriberCount: '120', videoCount: '8' } }] };

function fixture(t, overrides = {}) {
  const dataDir = mkdtempSync(join(tmpdir(), 'snowfall-google-'));
  t.after(() => rmSync(dataDir, { recursive: true, force: true }));
  let time = Date.now();
  const calls = [];
  const options = { credentials, dataDir, allowedOrigins: [base, remote], now: () => time, fetchImpl: async (url, options) => {
    calls.push({ url, options });
    if (url.endsWith('/token')) return response(tokens());
    if (url.endsWith('/revoke')) return new Response('', { status: 200 });
    return response(channels);
  }, ...overrides };
  const connection = createGoogleConnection(options);
  return { connection, options, calls, dataDir, advance: ms => time += ms };
}
function begin(connection, origin = base) {
  const flow = connection.start(request(origin));
  const url = new URL(flow.authorizationUrl);
  const req = request(origin, flow.cookie.split(';')[0]);
  const params = new URLSearchParams({ state: url.searchParams.get('state'), code: 'private-auth-code' });
  return { flow, url, req, params };
}
async function connect(connection) {
  const flow = begin(connection);
  await connection.callback(flow.req, flow.params);
  return flow;
}

test('Google env selects only its keys, preserves file and explicit empty overrides', t => {
  const { dataDir } = fixture(t);
  const path = join(dataDir, '.env');
  const content = 'GOOGLE_CLIENT_ID="test.apps.googleusercontent.com"\nGOOGLE_CLIENT_SECRET="private#secret"\nYOUTUBE_API_KEY=private-api-key\nMETA_APP_SECRET=unrelated\n';
  writeFileSync(path, content);
  const environment = { GOOGLE_CLIENT_SECRET: '' };
  assert.deepEqual(loadGoogleCredentials(path, environment), { clientId: credentials.clientId, clientSecret: '', apiKey: credentials.apiKey });
  assert.equal(loadGoogleCredentials(path, {}).clientSecret, 'private#secret');
  assert.deepEqual(environment, { GOOGLE_CLIENT_SECRET: '' });
  assert.equal(readFileSync(path, 'utf8'), content);
  assert.deepEqual(loadGoogleCredentials(join(dataDir, 'absent'), {}), { clientId: '', clientSecret: '', apiKey: '' });
});

test('OAuth uses allowed origins, browser binding, PKCE and offline consent; encrypted connection survives restart', async t => {
  const { connection, options, calls, dataDir } = fixture(t);
  assert.equal(connection.status(request()).accountConnected, false);
  assert.equal(connection.status(request()).callbackUrl, base + GOOGLE_CALLBACK_PATH);
  const { flow, url, req, params } = begin(connection, remote);
  assert.equal(url.searchParams.get('redirect_uri'), remote + GOOGLE_CALLBACK_PATH);
  assert.equal(url.searchParams.get('access_type'), 'offline');
  assert.equal(url.searchParams.get('scope'), GOOGLE_SCOPES.join(' '));
  assert.match(flow.cookie, /HttpOnly; SameSite=Lax; Max-Age=600; Secure$/);
  assert.ok(!flow.authorizationUrl.includes(credentials.clientSecret));
  await connection.callback(req, params);
  const exchanged = calls[0].options.body;
  assert.equal(exchanged.get('redirect_uri'), remote + GOOGLE_CALLBACK_PATH);
  assert.equal(exchanged.get('client_secret'), credentials.clientSecret);
  assert.equal(createHash('sha256').update(exchanged.get('code_verifier')).digest('base64url'), url.searchParams.get('code_challenge'));
  assert.equal(calls[1].options.headers.Authorization, 'Bearer private-access-token');
  assert.equal(calls[0].options.redirect, 'error');
  const status = createGoogleConnection(options).status(request());
  assert.equal(status.status, 'connected');
  assert.equal(status.channels[0].title, channels.items[0].snippet.title);
  const encrypted = readFileSync(join(dataDir, 'oauth/google.enc.json'), 'utf8');
  for (const secret of [credentials.clientSecret, credentials.apiKey, 'private-access-token', 'private-refresh-token', 'private-auth-code']) {
    assert.ok(!JSON.stringify(status).includes(secret));
    assert.ok(!encrypted.includes(secret));
  }
  assert.equal(statSync(join(dataDir, 'oauth/google.enc.json')).mode & 0o777, 0o600);
  assert.equal(statSync(join(dataDir, 'oauth/google.key')).mode & 0o777, 0o600);
  assert.equal(statSync(join(dataDir, 'oauth')).mode & 0o777, 0o700);
  await assert.rejects(connection.callback(req, params), { code: 'state_invalid' });
  assert.equal(calls.length, 2);
});

test('missing, wrong-browser, wrong-origin, unknown and expired state never exchange a code', async t => {
  const { connection, calls, advance } = fixture(t);
  const { req, params } = begin(connection);
  await assert.rejects(connection.callback(request(), params), { code: 'state_invalid' });
  await assert.rejects(connection.callback(request(base, 'snowfall_google_oauth=forged'), params), { code: 'state_invalid' });
  await assert.rejects(connection.callback(request(remote, req.headers.cookie), params), { code: 'state_invalid' });
  await assert.rejects(connection.callback(req, new URLSearchParams({ state: 'unknown', code: 'x' })), { code: 'state_invalid' });
  advance(600001);
  await assert.rejects(connection.callback(req, params), { code: 'state_invalid' });
  assert.equal(calls.length, 0);
  assert.throws(() => connection.start(request('https://attacker.test')), { status: 403 });
});

test('denial is single-use and does not destroy an existing account', async t => {
  const { connection, calls } = fixture(t);
  await connect(connection);
  const { req, params } = begin(connection);
  params.set('error', 'access_denied');
  await assert.rejects(connection.callback(req, params), { code: 'access_denied' });
  await assert.rejects(connection.callback(req, params), { code: 'state_invalid' });
  assert.equal(connection.status(request()).accountConnected, true);
  assert.equal(calls.length, 2);
});

test('rejected scope or missing refresh token is not a connected account and never reuses old account tokens', async t => {
  for (const change of [{ scope: 'openid' }, { refresh_token: undefined }]) {
    let rejected = false;
    const { connection, dataDir } = fixture(t, { fetchImpl: async url => url.endsWith('/token') ? response(tokens(rejected ? change : {})) : response(channels) });
    await connect(connection);
    const original = readFileSync(join(dataDir, 'oauth/google.enc.json'), 'utf8');
    rejected = true;
    const next = begin(connection);
    await assert.rejects(connection.callback(next.req, next.params), { code: change.scope ? 'scope_required' : 'refresh_required' });
    assert.equal(readFileSync(join(dataDir, 'oauth/google.enc.json'), 'utf8'), original);
  }
});

test('token exchange and YouTube errors are sanitized and do not persist a partial connection', async t => {
  for (const failedStage of ['token', 'channel']) {
    const { connection, dataDir } = fixture(t, { fetchImpl: async url => {
      if (url.endsWith('/token')) return failedStage === 'token' ? response({ error: 'private-provider-error' }, 400) : response(tokens());
      return response({ error: { message: 'private-provider-error', errors: [{ reason: 'accessNotConfigured' }] } }, 403);
    } });
    await assert.rejects(connect(connection), cause => !cause.message.includes('private-provider-error'));
    assert.equal(connection.status(request()).accountConnected, false);
    assert.equal(existsSync(join(dataDir, 'oauth/google.enc.json')), false);
  }
});

test('expired tokens refresh once under concurrent reads and retain a refresh token omitted by Google', async t => {
  let refreshes = 0;
  const { connection, dataDir, advance } = fixture(t, { fetchImpl: async (url, options) => {
    if (url.endsWith('/token')) {
      if (options.body.get('grant_type') === 'refresh_token') {
        refreshes++;
        assert.equal(options.body.get('refresh_token'), 'private-refresh-token');
        return response(tokens({ access_token: 'new-private-access', refresh_token: undefined, scope: undefined }));
      }
      return response(tokens());
    }
    return response(channels);
  } });
  await connect(connection);
  advance(3600000);
  await Promise.all([connection.channels(), connection.channels()]);
  assert.equal(refreshes, 1);
  const stored = createGoogleVault(dataDir).read();
  assert.equal(stored.accessToken, 'new-private-access');
  assert.equal(stored.refreshToken, 'private-refresh-token');
});

test('revoked refresh tokens require reconnect and stop repeated refresh attempts', async t => {
  let refreshes = 0;
  const { connection, advance } = fixture(t, { fetchImpl: async (url, options) => {
    if (url.endsWith('/token')) {
      if (options.body.get('grant_type') === 'refresh_token') { refreshes++; return response({ error: 'invalid_grant', error_description: 'do not expose' }, 400); }
      return response(tokens());
    }
    return response(channels);
  } });
  await connect(connection);
  advance(3600000);
  await assert.rejects(connection.channels(), { code: 'reconnect_required' });
  await assert.rejects(connection.channels(), { code: 'reconnect_required' });
  assert.equal(refreshes, 1);
  assert.equal(connection.status(request()).status, 'reconnect_required');
  assert.deepEqual(connection.status(request()).channels, []);
});

test('an API 401 forces one token refresh; a changed OAuth client requires a fresh account connection', async t => {
  let channelCalls = 0, refreshes = 0;
  const { connection, options } = fixture(t, { fetchImpl: async (url, options) => {
    if (url.endsWith('/token')) {
      if (options.body.get('grant_type') === 'refresh_token') refreshes++;
      return response(tokens());
    }
    return ++channelCalls === 2 ? response({ error: {} }, 401) : response(channels);
  } });
  await connect(connection);
  await connection.channels();
  assert.equal(refreshes, 1);
  const changed = createGoogleConnection({ ...options, credentials: { ...credentials, clientId: 'new-client' } });
  assert.equal(changed.status(request()).status, 'reconnect_required');
  await assert.rejects(changed.channels(), { code: 'reconnect_required' });
});

test('lost YouTube scope on refresh requires reconnect instead of advertising a usable connection', async t => {
  const { connection, advance } = fixture(t, { fetchImpl: async (url, options) => {
    if (url.endsWith('/token')) return response(tokens(options.body.get('grant_type') === 'refresh_token' ? { scope: 'openid' } : {}));
    return response(channels);
  } });
  await connect(connection);
  advance(3600000);
  await assert.rejects(connection.channels(), { code: 'scope_required' });
  assert.equal(connection.status(request()).status, 'reconnect_required');
  assert.equal(connection.status(request()).capabilities.channelRead, false);
  await assert.rejects(connection.channels(), { code: 'reconnect_required' });
});

test('disconnect revokes at Google and removes local data; a failed revocation retains a retryable connection', async t => {
  let failRevoke = true, revocations = 0;
  const { connection, options, dataDir } = fixture(t, { fetchImpl: async (url, options) => {
    if (url.endsWith('/revoke')) {
      revocations++;
      assert.equal(options.body.get('token'), 'private-refresh-token');
      return failRevoke ? response({ error: 'server_error' }, 503) : new Response('', { status: 200 });
    }
    return response(url.endsWith('/token') ? tokens() : channels);
  } });
  await connect(connection);
  const pending = begin(connection);
  await assert.rejects(connection.disconnect(), { code: 'revoke_failed' });
  assert.equal(connection.status(request()).accountConnected, true);
  failRevoke = false;
  assert.deepEqual(await connection.disconnect(), { disconnected: true });
  assert.equal(revocations, 2);
  assert.equal(existsSync(join(dataDir, 'oauth/google.enc.json')), false);
  assert.equal(createGoogleConnection(options).status(request()).accountConnected, false);
  await assert.rejects(connection.callback(pending.req, pending.params), { code: 'state_invalid' });
});

test('disconnect racing an in-flight callback cannot resurrect a connection', async t => {
  let release, entered;
  const gate = new Promise(resolve => { release = resolve; });
  const started = new Promise(resolve => { entered = resolve; });
  const { connection } = fixture(t, { fetchImpl: async url => {
    if (url.endsWith('/token')) { entered(); await gate; return response(tokens()); }
    return response(channels);
  } });
  const pending = begin(connection);
  const callback = connection.callback(pending.req, pending.params);
  const rejected = assert.rejects(callback, { code: 'cancelled' });
  await started;
  const disconnect = connection.disconnect();
  release();
  await Promise.all([rejected, disconnect]);
  assert.equal(connection.status(request()).accountConnected, false);
});

test('encrypted storage fails closed on tampering and hides raw content', t => {
  const { dataDir } = fixture(t);
  const vault = createGoogleVault(dataDir);
  vault.write({ refreshToken: 'private-refresh-token' });
  const path = join(dataDir, 'oauth/google.enc.json');
  const envelope = JSON.parse(readFileSync(path));
  envelope.tag = Buffer.alloc(16).toString('base64');
  writeFileSync(path, JSON.stringify(envelope));
  assert.throws(() => vault.read(), cause => cause.code === 'storage_error' && !cause.message.includes('private-refresh-token'));
});

test('HTTP routes protect mutations, remove callback codes, support remote URLs and keep tokens out of APIs/static/export', async t => {
  const { dataDir } = fixture(t);
  const allowedOrigins = [remote];
  const app = createApp({ testAuthBypass: true, root: ROOT, dataDir, config, allowedOrigins, toolUrls: () => ({}), googleCredentials: credentials,
    googleFetch: async url => response(url.endsWith('/token') ? tokens() : channels) });
  await new Promise(resolve => app.listen(0, '127.0.0.1', resolve));
  t.after(() => new Promise(resolve => { app.closeAllConnections(); app.close(resolve); }));
  const origin = `http://127.0.0.1:${app.address().port}`;
  allowedOrigins.push(origin);
  const post = (path, headers = {}) => fetch(origin + path, { method: 'POST', headers: { 'content-type': 'application/json', ...headers }, body: '{}' });
  assert.equal((await post('/api/google/connect')).status, 403);
  assert.equal((await post('/api/google/connect', { origin: 'https://attacker.test' })).status, 403);
  assert.equal((await post('/api/google/disconnect', { origin: 'https://attacker.test' })).status, 403);
  const start = await post('/api/google/connect', { origin });
  assert.equal(start.status, 200);
  const flow = await start.json();
  const state = new URL(flow.authorizationUrl).searchParams.get('state');
  const cookie = start.headers.get('set-cookie').split(';')[0];
  const callback = await fetch(origin + GOOGLE_CALLBACK_PATH + '?' + new URLSearchParams({ code: 'private-auth-code', state }), { headers: { cookie, 'sec-fetch-site': 'cross-site' }, redirect: 'manual' });
  assert.equal(callback.status, 303);
  assert.equal(callback.headers.get('location'), '/#settings/google/connected');
  assert.equal(callback.headers.get('referrer-policy'), 'no-referrer');
  assert.match(callback.headers.get('set-cookie'), /Max-Age=0/);
  const statusResponse = await fetch(origin + '/api/google/status');
  assert.equal(statusResponse.headers.get('cache-control'), 'no-store');
  const status = await statusResponse.json();
  assert.equal(status.accountConnected, true);
  assert.equal(status.callbackUrl, origin + GOOGLE_CALLBACK_PATH);
  for (const path of ['/api/google/status', '/api/google/channels', '/api/export']) {
    const body = await (await fetch(origin + path)).text();
    for (const secret of [credentials.clientSecret, credentials.apiKey, 'private-access-token', 'private-refresh-token']) assert.ok(!body.includes(secret));
  }
  for (const path of ['/.env', '/.data/oauth/google.key', '/.data/oauth/google.enc.json']) assert.equal((await fetch(origin + path)).status, 404);
  const invalid = await fetch(origin + GOOGLE_CALLBACK_PATH + '?state=forged&code=private-auth-code&error_description=private-provider-error', { redirect: 'manual' });
  assert.equal(invalid.headers.get('location'), '/#settings/google/state_invalid');
  assert.ok(!(await invalid.text()).includes('private-'));
});
