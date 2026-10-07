import { randomBytes, createHash } from 'node:crypto';

export async function oauthGrant(base, cookie, options = {}) {
  const verifier = randomBytes(32).toString('base64url'), callback = options.callback || 'http://127.0.0.1:19381/callback';
  const registered = await fetch(base + '/oauth/register', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ client_name: options.name || 'MCP 테스트', redirect_uris: [callback], token_endpoint_auth_method: 'none' }) });
  if (registered.status !== 201) throw new Error('DCR failed');
  const client = await registered.json();
  const params = { client_id: client.client_id, redirect_uri: callback, response_type: 'code', scope: 'studio:access', resource: base + '/mcp', code_challenge_method: 'S256', code_challenge: createHash('sha256').update(verifier).digest('base64url'), state: 'test-state' };
  const begin = await fetch(base + '/oauth/authorize?' + new URLSearchParams(params), { redirect: 'manual' });
  if (begin.status !== 302) throw new Error('Authorize failed: ' + await begin.text());
  const requestId = new URL(begin.headers.get('location')).hash.split('/')[1];
  const inspect = await fetch(base + '/api/oauth/requests/' + requestId, { headers: { Cookie: cookie } });
  if (!inspect.ok) throw new Error('Consent request failed');
  const approve = await fetch(base + '/api/oauth/requests/' + requestId, { method: 'POST', headers: { Cookie: cookie, 'Content-Type': 'application/json' }, body: JSON.stringify({ approve: options.approve !== false }) });
  const result = await approve.json(), redirect = new URL(result.redirect);
  const tokenInput = { grant_type: 'authorization_code', client_id: client.client_id, redirect_uri: callback, code: redirect.searchParams.get('code'), code_verifier: verifier, resource: base + '/mcp' };
  const exchange = async input => fetch(base + '/oauth/token', { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, body: new URLSearchParams(input) });
  if (options.beforeExchange) await options.beforeExchange({ exchange, tokenInput, requestId, client, params, redirect });
  if (options.approve === false) return { redirect, client, requestId };
  const response = await exchange(tokenInput); if (!response.ok) throw new Error('Token exchange failed: ' + await response.text());
  return { tokens: await response.json(), exchange, tokenInput, client, requestId, params, redirect };
}
