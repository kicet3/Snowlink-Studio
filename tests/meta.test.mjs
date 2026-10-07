import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, writeFileSync, readFileSync, existsSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { loadMetaCredentials, metaSetupStatus } from '../server/meta.mjs';
import { createApp } from '../server/app.mjs';
import { config, ROOT } from '../server/config.mjs';

function fixture(t) {
  const dir = mkdtempSync(join(tmpdir(), 'snowfall-meta-test-'));
  t.after(() => rmSync(dir, { recursive: true, force: true }));
  return dir;
}

test('Meta env loading preserves the file and environment, ignores unrelated credentials, and honors explicit overrides', t => {
  const path = join(fixture(t), '.env');
  const contents = '# preserved comment\nMETA_APP_ID="123456789"\nMETA_APP_SECRET="fake-test-secret#with-hash"\nOPENAI_API_KEY=do-not-load\nX_BEARER_TOKEN=do-not-load\n';
  writeFileSync(path, contents);
  const environment = { META_APP_ID: '987654321', META_APP_SECRET: '' };
  const credentials = loadMetaCredentials(path, environment);
  assert.deepEqual(credentials, { appId: '987654321', appSecret: '' });
  assert.deepEqual(environment, { META_APP_ID: '987654321', META_APP_SECRET: '' });
  assert.equal(loadMetaCredentials(path, {}).appSecret, 'fake-test-secret#with-hash');
  assert.equal(readFileSync(path, 'utf8'), contents);
  assert.equal(Object.keys(credentials).length, 2);
});

test('missing optional env does not create files; read errors omit raw file contents and paths', t => {
  const dir = fixture(t), path = join(dir, '.env');
  assert.deepEqual(loadMetaCredentials(path, {}), { appId: '', appSecret: '' });
  assert.equal(existsSync(path), false);
  assert.throws(() => loadMetaCredentials(dir, {}), error => !error.message.includes(dir) && /설정 파일/.test(error.message));
});

test('credential presence never implies authenticated Instagram or enabled collection/publishing', () => {
  for (const credentials of [{}, { appId: 'not-an-id', appSecret: 'fake-secret' }, { appId: '123456789', appSecret: 'fake-secret' }]) {
    const status = metaSetupStatus(credentials);
    assert.equal(status.accountConnected, false);
    assert.equal(status.credentialsVerified, false);
    assert.equal(status.oauthImplemented, false);
    assert.equal(status.callbackUrl, null);
    assert.ok(Object.values(status.capabilities).every(enabled => enabled === false));
    assert.ok(!JSON.stringify(status).includes('fake-secret'));
    assert.ok(!JSON.stringify(status).includes('123456789'));
  }
  assert.equal(metaSetupStatus({ appId: 'not-an-id' }).credentials.appId, 'invalid');
  assert.equal(metaSetupStatus({ appId: '123456789', appSecret: 'fake-secret' }).status, 'credentials_present');
});

test('status API is origin-protected, omits credentials, keeps exports clean and exposes no fake OAuth callback', async t => {
  const dataDir = fixture(t);
  const allowedOrigins = [];
  const app = createApp({ testAuthBypass: true, root: ROOT, dataDir, config, allowedOrigins, toolUrls: () => ({}), bootId: 'meta-qa', metaCredentials: { appId: '123456789', appSecret: 'fake-sensitive-secret' } });
  await new Promise(resolve => app.listen(0, '127.0.0.1', resolve));
  t.after(() => new Promise(resolve => { app.closeAllConnections(); app.close(resolve); }));
  const base = `http://127.0.0.1:${app.address().port}`;
  allowedOrigins.push(base);
  const response = await fetch(base + '/api/meta/status');
  assert.equal(response.status, 200);
  assert.equal(response.headers.get('cache-control'), 'no-store');
  const status = await response.json();
  assert.equal(status.status, 'credentials_present');
  assert.equal(status.accountConnected, false);
  assert.ok(!JSON.stringify(status).includes('fake-sensitive-secret'));
  assert.ok(!JSON.stringify(status).includes('123456789'));
  assert.equal((await fetch(base + '/api/meta/status', { headers: { Origin: 'https://untrusted.example' } })).status, 403);
  assert.equal((await fetch(base + '/.env')).status, 404);
  assert.equal((await fetch(base + '/api/meta/oauth/callback')).status, 404);
  const backup = await (await fetch(base + '/api/export')).text();
  assert.ok(!backup.includes('fake-sensitive-secret'));
  assert.ok(!backup.includes('123456789'));
});
