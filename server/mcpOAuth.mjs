import { existsSync, readFileSync, writeFileSync, renameSync } from 'node:fs';
import { join } from 'node:path';
import { randomBytes, randomUUID, createHash, timingSafeEqual } from 'node:crypto';
import { json, readJson } from './http.mjs';

const token = () => randomBytes(32).toString('base64url');
const hash = value => createHash('sha256').update(String(value)).digest('hex');
const equal = (a, b) => { const x = Buffer.from(a), y = Buffer.from(b); return x.length === y.length && timingSafeEqual(x, y); };
const fail = (code, description, status = 400) => Object.assign(new Error(description), { oauthError: code, status });
const SCOPE = 'studio:access', ACCESS_SECONDS = 3600, REFRESH_MS = 30 * 86400000;
const redirectAllowed = value => {
  try { const url = new URL(value); return !url.username && !url.password && !url.hash && (url.protocol === 'https:' || url.protocol === 'http:' && ['localhost', '127.0.0.1', '[::1]'].includes(url.hostname)); } catch { return false; }
};
async function readForm(req) {
  if (!req.headers['content-type']?.startsWith('application/x-www-form-urlencoded')) throw fail('invalid_request', '폼 형식의 OAuth 요청이 필요합니다.');
  let size = 0; const chunks = [];
  for await (const chunk of req) { size += chunk.length; if (size > 16000) throw fail('invalid_request', 'OAuth 요청이 너무 큽니다.', 413); chunks.push(chunk); }
  const params = new URLSearchParams(Buffer.concat(chunks).toString());
  for (const key of params.keys()) if (params.getAll(key).length !== 1) throw fail('invalid_request', '중복된 OAuth 매개변수입니다.');
  return Object.fromEntries(params);
}
export function createMcpOAuth({ directory, auth, allowedOrigins, frontendOrigin }) {
  const file = join(directory, 'mcp-oauth.json');
  let state = existsSync(file) ? JSON.parse(readFileSync(file, 'utf8')) : { version: 1, clients: [], requests: [], codes: [], access: [], refresh: [], grants: [] };
  const rates = new Map();
  const persist = () => {
    const now = Date.now();
    state.requests = state.requests.filter(x => x.expiresAt > now); state.codes = state.codes.filter(x => x.expiresAt > now);
    state.access = state.access.filter(x => x.expiresAt > now); state.refresh = state.refresh.filter(x => x.expiresAt > now);
    writeFileSync(file + '.tmp', JSON.stringify(state, null, 2), { mode: 0o600 }); renameSync(file + '.tmp', file);
  };
  const origin = req => allowedOrigins.find(value => new URL(value).host === req.headers.host);
  const resource = req => origin(req) + '/mcp';
  function rate(req) { const key = req.socket.remoteAddress, now = Date.now(); for (const [id, item] of rates) if (item.until < now) rates.delete(id); const entry = rates.get(key) || { count: 0, until: now + 60000 }; if (++entry.count > 120) throw fail('temporarily_unavailable', 'OAuth 요청이 많습니다. 잠시 후 다시 시도해주세요.', 429); rates.set(key, entry); }
  function client(id, issuer) { const found = state.clients.find(c => c.client_id === id && c.issuer === issuer); if (!found) throw fail('invalid_client', 'OAuth 클라이언트를 다시 연결해주세요.'); return found; }
  function validGrant(grant) { const account = grant && auth.getUser(grant.userId); return account?.password && account.role !== 'guest' && !grant.revoked && grant.passwordVersion === hash(account.password.hash) ? account : null; }
  function issue(grant) {
    const access = token(), refresh = token();
    state.access.push({ hash: hash(access), grantId: grant.id, expiresAt: Date.now() + ACCESS_SECONDS * 1000 });
    state.refresh.push({ hash: hash(refresh), grantId: grant.id, expiresAt: Date.now() + REFRESH_MS, used: false });
    persist(); return { access_token: access, token_type: 'Bearer', expires_in: ACCESS_SECONDS, refresh_token: refresh, scope: SCOPE };
  }
  function bearerUser(req) {
    const raw = /^Bearer ([A-Za-z0-9_-]{43})$/.exec(req.headers.authorization || '')?.[1]; if (!raw) return null;
    const access = state.access.find(t => t.hash === hash(raw) && t.expiresAt > Date.now());
    const grant = access && state.grants.find(g => g.id === access.grantId && g.resource === resource(req));
    return validGrant(grant);
  }
  function challenge(req, res) { res.setHeader('WWW-Authenticate', `Bearer resource_metadata="${origin(req)}/.well-known/oauth-protected-resource/mcp", scope="${SCOPE}"`); }
  const pending = (id, req) => {
    const item = state.requests.find(r => r.id === id && r.issuer === origin(req) && r.expiresAt > Date.now());
    if (!item) throw fail('invalid_request', '인증 요청이 만료됐습니다. MCP 클라이언트에서 다시 로그인해주세요.'); return item;
  };
  return {
    bearerUser, challenge,
    async handle(req, res, url) {
      const path = url.pathname;
      if (!path.startsWith('/.well-known/oauth-') && !path.startsWith('/oauth/') && !path.startsWith('/api/oauth/')) return false;
      try {
        const issuer = origin(req);
        if (['/.well-known/oauth-protected-resource', '/.well-known/oauth-protected-resource/mcp'].includes(path) && req.method === 'GET') { json(res, 200, { resource: resource(req), authorization_servers: [issuer], scopes_supported: [SCOPE], bearer_methods_supported: ['header'], resource_name: '네티움 스튜디오' }); return true; }
        if (path === '/.well-known/oauth-authorization-server' && req.method === 'GET') { json(res, 200, { issuer, authorization_endpoint: issuer + '/oauth/authorize', token_endpoint: issuer + '/oauth/token', registration_endpoint: issuer + '/oauth/register', revocation_endpoint: issuer + '/oauth/revoke', response_types_supported: ['code'], grant_types_supported: ['authorization_code', 'refresh_token'], token_endpoint_auth_methods_supported: ['none'], revocation_endpoint_auth_methods_supported: ['none'], code_challenge_methods_supported: ['S256'], scopes_supported: [SCOPE] }); return true; }
        if (path === '/oauth/register' && req.method === 'POST') {
          rate(req); const input = await readJson(req);
          if (!Array.isArray(input.redirect_uris) || !input.redirect_uris.length || input.redirect_uris.length > 10 || input.redirect_uris.some(uri => typeof uri !== 'string' || uri.length > 2000 || !redirectAllowed(uri))) throw fail('invalid_redirect_uri', '콜백은 HTTPS 또는 로컬 HTTP 주소여야 합니다.');
          if (input.token_endpoint_auth_method && input.token_endpoint_auth_method !== 'none') throw fail('invalid_client_metadata', 'PKCE를 사용하는 public OAuth 클라이언트만 지원합니다.');
          if (input.grant_types && (!Array.isArray(input.grant_types) || input.grant_types.some(g => !['authorization_code', 'refresh_token'].includes(g)))) throw fail('invalid_client_metadata', '지원하지 않는 grant 유형입니다.');
          if (input.response_types && (!Array.isArray(input.response_types) || input.response_types.some(t => t !== 'code'))) throw fail('invalid_client_metadata', 'code 응답 유형만 지원합니다.');
          if (state.clients.length >= 5000) throw fail('temporarily_unavailable', 'OAuth 클라이언트 등록 한도에 도달했습니다.', 429);
          const registered = { client_id: randomUUID(), client_id_issued_at: Math.floor(Date.now() / 1000), client_name: String(input.client_name || 'MCP 클라이언트').slice(0, 120), redirect_uris: [...new Set(input.redirect_uris)], token_endpoint_auth_method: 'none', grant_types: ['authorization_code', 'refresh_token'], response_types: ['code'], scope: SCOPE };
          state.clients.push({ ...registered, issuer }); persist(); json(res, 201, registered); return true;
        }
        if (path === '/oauth/authorize' && req.method === 'GET') {
          rate(req); const p = url.searchParams;
          for (const key of p.keys()) if (p.getAll(key).length !== 1) throw fail('invalid_request', '중복된 OAuth 매개변수입니다.');
          const registered = client(p.get('client_id'), issuer), redirectUri = p.get('redirect_uri');
          if (!registered.redirect_uris.includes(redirectUri)) throw fail('invalid_request', '등록된 콜백 주소와 일치하지 않습니다.');
          if (p.get('response_type') !== 'code' || p.get('code_challenge_method') !== 'S256' || !/^[A-Za-z0-9_-]{43}$/.test(p.get('code_challenge') || '')) throw fail('invalid_request', 'S256 PKCE 인증 코드 요청이 필요합니다.');
          if (p.get('resource') !== resource(req)) throw fail('invalid_target', '이 MCP 서버의 resource 주소를 지정해주세요.');
          if (p.get('scope') && p.get('scope') !== SCOPE) throw fail('invalid_scope', '지원하는 권한은 studio:access입니다.');
          if ((p.get('state') || '').length > 2000) throw fail('invalid_request', 'state가 너무 깁니다.');
          const request = { id: token(), issuer, resource: resource(req), clientId: registered.client_id, redirectUri, state: p.get('state') || '', challenge: p.get('code_challenge'), scope: SCOPE, expiresAt: Date.now() + 10 * 60000 };
          state.requests.push(request); persist();
          res.writeHead(302, { Location: frontendOrigin ? frontendOrigin + '/oauth/' + request.id : issuer + '/#oauth/' + request.id, 'Cache-Control': 'no-store', 'Referrer-Policy': 'no-referrer' }); res.end(); return true;
        }
        if (path.startsWith('/api/oauth/')) {
          const account = auth.user(req); if (!account || account.role === 'guest') throw fail('login_required', 'MCP 연결을 승인하려면 계정으로 로그인해주세요.', 401);
          const match = /^\/api\/oauth\/requests\/([\w-]+)$/.exec(path);
          if (match && req.method === 'GET') {
            const request = pending(match[1], req);
            if (request.userId && (request.userId !== account.id || request.session !== auth.sessionBinding(req))) throw fail('invalid_request', '현재 로그인에서 시작한 인증 요청이 아닙니다.');
            request.userId = account.id; request.session = auth.sessionBinding(req); persist();
            const registered = client(request.clientId, issuer);
            json(res, 200, { id: request.id, clientName: registered.client_name, redirectUri: request.redirectUri, scope: request.scope, username: account.username }); return true;
          }
          if (match && req.method === 'POST') {
            const input = await readJson(req), request = pending(match[1], req);
            if (request.userId !== account.id || request.session !== auth.sessionBinding(req) || typeof input.approve !== 'boolean') throw fail('invalid_request', '현재 로그인에서 인증 요청을 먼저 확인해주세요.');
            state.requests = state.requests.filter(r => r.id !== request.id);
            const callback = new URL(request.redirectUri); if (request.state) callback.searchParams.set('state', request.state);
            if (input.approve) {
              const code = token();
              state.codes.push({ hash: hash(code), ...request, passwordVersion: hash(account.password.hash), expiresAt: Date.now() + 5 * 60000 });
              callback.searchParams.set('code', code); callback.searchParams.set('iss', issuer);
            } else callback.searchParams.set('error', 'access_denied');
            persist(); json(res, 200, { redirect: callback.href }); return true;
          }
          if (path === '/api/oauth/grants' && req.method === 'GET') { json(res, 200, { grants: state.grants.filter(g => g.userId === account.id && validGrant(g) && state.refresh.some(r => r.grantId === g.id && !r.used && r.expiresAt > Date.now())).map(g => ({ id: g.id, clientName: state.clients.find(c => c.client_id === g.clientId)?.client_name || 'MCP', createdAt: g.createdAt, scope: g.scope })) }); return true; }
          if (path === '/api/oauth/grants/revoke' && req.method === 'POST') { const input = await readJson(req); const grant = state.grants.find(g => g.id === input.id && g.userId === account.id); if (!grant) throw fail('invalid_request', '연결을 찾을 수 없습니다.', 404); grant.revoked = true; persist(); json(res, 200, { ok: true }); return true; }
        }
        if (path === '/oauth/token' && req.method === 'POST') {
          rate(req); const input = await readForm(req); client(input.client_id, issuer);
          if (input.resource !== resource(req)) throw fail('invalid_target', 'MCP resource 주소가 일치하지 않습니다.');
          if (input.grant_type === 'authorization_code') {
            const code = state.codes.find(c => c.hash === hash(input.code) && c.expiresAt > Date.now());
            if (!code || code.clientId !== input.client_id || code.issuer !== issuer || code.redirectUri !== input.redirect_uri || code.resource !== input.resource || !/^[A-Za-z0-9._~-]{43,128}$/.test(input.code_verifier || '') || !equal(createHash('sha256').update(input.code_verifier).digest('base64url'), code.challenge)) throw fail('invalid_grant', '인증 코드 또는 PKCE 검증에 실패했습니다.');
            const account = auth.getUser(code.userId); if (!account || code.passwordVersion !== hash(account.password.hash)) throw fail('invalid_grant', '계정 인증 정보가 변경됐습니다. 다시 로그인해주세요.');
            state.codes = state.codes.filter(c => c !== code);
            const grant = { id: randomUUID(), clientId: code.clientId, userId: code.userId, issuer, resource: input.resource, scope: SCOPE, passwordVersion: code.passwordVersion, createdAt: new Date().toISOString(), revoked: false };
            state.grants.push(grant); json(res, 200, issue(grant)); return true;
          }
          if (input.grant_type === 'refresh_token') {
            const refresh = state.refresh.find(t => t.hash === hash(input.refresh_token) && t.expiresAt > Date.now());
            const grant = refresh && state.grants.find(g => g.id === refresh.grantId && g.clientId === input.client_id && g.resource === input.resource && g.issuer === issuer);
            if (!refresh || !validGrant(grant)) throw fail('invalid_grant', '갱신 토큰이 유효하지 않습니다. 다시 로그인해주세요.');
            if (refresh.used) { grant.revoked = true; persist(); throw fail('invalid_grant', '이미 사용한 갱신 토큰입니다. 연결을 다시 승인해주세요.'); }
            if (input.scope && input.scope !== SCOPE) throw fail('invalid_scope', '권한을 확장할 수 없습니다.');
            refresh.used = true; json(res, 200, issue(grant)); return true;
          }
          throw fail('unsupported_grant_type', '지원하지 않는 OAuth grant입니다.');
        }
        if (path === '/oauth/revoke' && req.method === 'POST') {
          rate(req); const input = await readForm(req); client(input.client_id, issuer);
          const record = [...state.access, ...state.refresh].find(t => t.hash === hash(input.token));
          const grant = record && state.grants.find(g => g.id === record.grantId && g.clientId === input.client_id && g.issuer === issuer);
          if (grant) { grant.revoked = true; persist(); } json(res, 200, {}); return true;
        }
        throw fail('invalid_request', '지원하지 않는 OAuth 요청입니다.', 404);
      } catch (error) { json(res, error.oauthError ? error.status : 400, { error: error.oauthError || 'invalid_request', error_description: error.oauthError ? error.message : 'OAuth 요청을 확인해주세요.' }); return true; }
    },
  };
}
