import assert from 'node:assert/strict';
import { test } from 'node:test';
import { api } from '../app/_lib/api.js';
import { toolApi } from '../app/_lib/integration-api.js';
import { readApiResponse } from '../app/_lib/api-response.js';

test('session and integrated APIs report upstream HTML errors without JSON syntax errors', async t => {
  t.mock.method(globalThis, 'fetch', async () => new Response('<html><h1>502 Bad Gateway</h1></html>', {
    status: 502, headers: { 'content-type': 'text/html' },
  }));
  for (const request of [() => api('/api/auth/session'), () => toolApi('trends', '/api/categories')]) {
    await assert.rejects(request, error => error.status === 502 && error.code === 'API_UNAVAILABLE'
      && error.message.includes('서버에 연결하지 못했습니다') && !error.message.includes('<html>'));
  }
});

test('a frontend HTML fallback is rejected even when the HTTP status is 200', async () => {
  await assert.rejects(() => readApiResponse(new Response('<!DOCTYPE html><html>Studio</html>', {
    headers: { 'content-type': 'text/html' },
  })), { code: 'INVALID_API_RESPONSE', status: 200 });
});

test('invalid JSON gets a safe message, and valid sessions keep their original data', async () => {
  await assert.rejects(() => readApiResponse(new Response('{', {
    headers: { 'content-type': 'application/json' },
  })), { code: 'INVALID_API_RESPONSE' });
  assert.deepEqual(await readApiResponse(Response.json({ user: null, registration: true })), {
    user: null, registration: true,
  });
});

test('API validation messages and HTTP status survive parsing', async () => {
  await assert.rejects(() => readApiResponse(Response.json({ error: '아이디 또는 비밀번호를 확인해주세요.' }, {
    status: 401,
  })), { status: 401, message: '아이디 또는 비밀번호를 확인해주세요.' });
  await assert.rejects(() => readApiResponse(Response.json({ code: 'API_UNAVAILABLE', error: 'Temporary outage' }, {
    status: 503,
  })), { status: 503, code: 'API_UNAVAILABLE', message: '서버에 연결하지 못했습니다. 잠시 후 다시 시도해주세요.' });
});
