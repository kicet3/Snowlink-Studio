import { readFileSync } from 'node:fs';
import { parseEnv } from 'node:util';
import { randomBytes, createHash, timingSafeEqual } from 'node:crypto';
import { createGoogleVault } from './googleVault.mjs';

export const GOOGLE_CALLBACK_PATH = '/api/google/oauth/callback';
export const GOOGLE_SCOPES = ['https://www.googleapis.com/auth/youtube.readonly'];
const TOKEN_URL = 'https://oauth2.googleapis.com/token';
const REVOKE_URL = 'https://oauth2.googleapis.com/revoke';
const COOKIE = 'snowfall_google_oauth';
const LIFETIME = 10 * 60 * 1000;
const hash = value => createHash('sha256').update(value).digest('hex');
const error = (message, status = 400, code = 'failed') => Object.assign(new Error(message), { status, code });

export function loadGoogleCredentials(envPath, environment = process.env) {
  let file = {};
  try { file = parseEnv(readFileSync(envPath, 'utf8')); }
  catch (cause) {
    if (cause.code !== 'ENOENT') throw error('Google 설정 파일을 읽지 못했습니다. .env 파일 형식과 접근 권한을 확인해주세요.', 503);
  }
  const value = key => String(environment[key] ?? file[key] ?? '').trim();
  return Object.freeze({ clientId: value('GOOGLE_CLIENT_ID'), clientSecret: value('GOOGLE_CLIENT_SECRET'), apiKey: value('YOUTUBE_API_KEY') });
}

export function createGoogleConnection({ credentials = {}, dataDir, allowedOrigins, fetchImpl = fetch, now = Date.now, apiOrigin, frontendOrigin }) {
  const vault = createGoogleVault(dataDir);
  const pending = new Map();
  const clientId = credentials.clientId || '';
  const clientSecret = credentials.clientSecret || '';
  const clientHash = hash(clientId);
  let generation = 0;
  let queue = Promise.resolve();
  function exclusive(work) {
    const result = queue.then(work);
    queue = result.catch(() => {});
    return result;
  }
  function origin(req) {
    const value = allowedOrigins.find(value => new URL(value).host === req.headers.host);
    if (!value) throw error('허용되지 않은 Google 연결 주소입니다.', 403);
    // The browser's nonce/session cookies live on the frontend, which proxies this callback.
    const parsed = new URL(value === apiOrigin && frontendOrigin ? frontendOrigin : value);
    if (parsed.protocol !== 'https:' && !(parsed.protocol === 'http:' && ['localhost', '127.0.0.1', '[::1]'].includes(parsed.hostname))) {
      throw error('Google 연결은 HTTPS 또는 localhost에서 시작해주세요.', 400);
    }
    return parsed.origin;
  }
  function cookie(value, base, maxAge = LIFETIME / 1000) {
    return `${COOKIE}=${value}; Path=${GOOGLE_CALLBACK_PATH}; HttpOnly; SameSite=Lax; Max-Age=${maxAge}${base.startsWith('https:') ? '; Secure' : ''}`;
  }
  function ensureCredentials() {
    if (!clientId || !clientSecret) throw error('GOOGLE_CLIENT_ID와 GOOGLE_CLIENT_SECRET을 입력한 뒤 서버를 재시작해주세요.', 503, 'credentials_required');
  }
  async function request(url, options = {}) {
    try { return await fetchImpl(url, { ...options, redirect: 'error', signal: AbortSignal.timeout(12000) }); }
    catch { throw error('Google 서버에 연결하지 못했습니다. 잠시 후 다시 시도해주세요.', 502, 'network_error'); }
  }
  async function body(response) {
    try { return await response.json(); }
    catch { throw error('Google 응답을 확인하지 못했습니다. 다시 시도해주세요.', 502, 'invalid_response'); }
  }
  function tokenFields(data, previous = null) {
    const expiresIn = Number(data.expires_in);
    if (typeof data.access_token !== 'string' || !data.access_token || !Number.isFinite(expiresIn) || expiresIn <= 0 || String(data.token_type).toLowerCase() !== 'bearer') {
      throw error('Google 인증 응답을 확인하지 못했습니다.', 502, 'token_failed');
    }
    const scopes = typeof data.scope === 'string' ? data.scope.split(/\s+/) : previous?.scopes || [];
    if (!GOOGLE_SCOPES.every(scope => scopes.includes(scope))) throw error('YouTube 채널 조회 권한을 허용해주세요.', 403, 'scope_required');
    const refreshToken = data.refresh_token || previous?.refreshToken;
    if (typeof refreshToken !== 'string' || !refreshToken) throw error('지속 연결 권한을 받지 못했습니다. Google 로그인을 다시 진행해주세요.', 401, 'refresh_required');
    return { accessToken: data.access_token, refreshToken, expiresAt: now() + expiresIn * 1000, scopes };
  }
  async function fetchChannel(accessToken) {
    const response = await request('https://www.googleapis.com/youtube/v3/channels?' + new URLSearchParams({ part: 'snippet,statistics', mine: 'true', maxResults: '50' }), { headers: { Authorization: `Bearer ${accessToken}` } });
    const data = await body(response);
    if (!response.ok) {
      if (response.status === 401) throw error('Google 연결이 만료되었습니다. 다시 연결해주세요.', 401, 'reconnect_required');
      const reason = data.error?.errors?.[0]?.reason;
      const message = ['accessNotConfigured', 'serviceDisabled'].includes(reason)
        ? 'Google Cloud 프로젝트에서 YouTube Data API v3를 활성화해주세요.'
        : reason === 'quotaExceeded' ? 'YouTube API 사용량 한도에 도달했습니다. 나중에 다시 시도해주세요.'
          : 'YouTube 채널을 조회하지 못했습니다. API 활성화 상태와 조회 권한을 확인해주세요.';
      throw error(message, 502, 'youtube_api_error');
    }
    if (!Array.isArray(data.items)) throw error('YouTube 채널 응답 형식을 확인하지 못했습니다.', 502, 'youtube_api_error');
    return data.items.map(item => ({
      id: String(item.id || ''), title: String(item.snippet?.title || ''),
      url: `https://www.youtube.com/channel/${encodeURIComponent(item.id || '')}`,
      statistics: { views: item.statistics?.viewCount ?? null, subscribers: item.statistics?.hiddenSubscriberCount ? null : item.statistics?.subscriberCount ?? null, videos: item.statistics?.videoCount ?? null },
    }));
  }
  function currentRecord() {
    const record = vault.read();
    if (!record || record.clientHash !== clientHash || record.reconnectRequired) throw error('Google 계정을 연결해주세요.', 401, 'reconnect_required');
    return record;
  }
  function assertGeneration(expected) {
    if (generation !== expected) throw error('연결 요청이 취소되거나 다른 연결로 바뀌었습니다. 다시 시작해주세요.', 409, 'cancelled');
  }
  async function accessToken(record, expected, force = false) {
    if (!force && record.expiresAt > now() + 60000) return record.accessToken;
    ensureCredentials();
    const response = await request(TOKEN_URL, { method: 'POST', body: new URLSearchParams({ client_id: clientId, client_secret: clientSecret, grant_type: 'refresh_token', refresh_token: record.refreshToken }) });
    const data = await body(response);
    assertGeneration(expected);
    if (!response.ok) {
      if (data.error === 'invalid_grant') {
        vault.write({ ...record, accessToken: '', refreshToken: '', reconnectRequired: true });
        throw error('Google 연결 권한이 만료되거나 해제되었습니다. 다시 연결해주세요.', 401, 'reconnect_required');
      }
      throw error('Google 연결을 갱신하지 못했습니다. OAuth 설정과 서버 연결을 확인해주세요.', 502, 'token_failed');
    }
    try { Object.assign(record, tokenFields(data, record)); }
    catch (cause) {
      if (cause.code === 'scope_required') vault.write({ ...record, reconnectRequired: true });
      throw cause;
    }
    vault.write(record);
    return record.accessToken;
  }
  return {
    origin,
    clearCookie: req => cookie('', origin(req), 0),
    status(req) {
      const record = vault.read();
      const ready = !!(clientId && clientSecret);
      const reconnect = !!record && (record.clientHash !== clientHash || record.reconnectRequired);
      const connected = ready && !!record && !reconnect;
      return {
        provider: 'google', oauthImplemented: true,
        status: !ready ? 'credentials_required' : reconnect ? 'reconnect_required' : connected ? 'connected' : 'not_connected',
        credentials: { clientId: !!clientId, clientSecret: !!clientSecret, apiKey: !!credentials.apiKey },
        accountConnected: connected, canDisconnect: !!record, callbackUrl: origin(req) + GOOGLE_CALLBACK_PATH,
        scopes: GOOGLE_SCOPES, channels: connected ? record.channels : [], lastVerifiedAt: connected ? record.verifiedAt : null,
        capabilities: { channelRead: connected, publishing: false, scheduling: false },
      };
    },
    start(req) {
      ensureCredentials();
      const base = origin(req);
      for (const [key, item] of pending) if (item.expiresAt <= now()) pending.delete(key);
      if (pending.size >= 100) throw error('진행 중인 연결 요청이 많습니다. 잠시 후 다시 시도해주세요.', 429);
      const state = randomBytes(32).toString('base64url');
      const nonce = randomBytes(32).toString('base64url');
      const verifier = randomBytes(48).toString('base64url');
      pending.set(hash(state), { nonceHash: hash(nonce), verifier, origin: base, generation, expiresAt: now() + LIFETIME });
      const params = new URLSearchParams({ client_id: clientId, redirect_uri: base + GOOGLE_CALLBACK_PATH, response_type: 'code', scope: GOOGLE_SCOPES.join(' '), access_type: 'offline', prompt: 'consent select_account', state, code_challenge: createHash('sha256').update(verifier).digest('base64url'), code_challenge_method: 'S256' });
      return { authorizationUrl: 'https://accounts.google.com/o/oauth2/v2/auth?' + params, cookie: cookie(nonce, base) };
    },
    async callback(req, params) {
      const state = params.get('state') || '';
      const attempt = state.length <= 128 && pending.get(hash(state));
      const nonce = (req.headers.cookie || '').split(';').map(part => part.trim()).find(part => part.startsWith(COOKIE + '='))?.slice(COOKIE.length + 1) || '';
      if (!attempt || attempt.expiresAt <= now() || attempt.origin !== origin(req) || !timingSafeEqual(Buffer.from(hash(nonce)), Buffer.from(attempt.nonceHash))) {
        throw error('연결 요청이 만료되었거나 시작한 브라우저와 다릅니다. 다시 연결해주세요.', 400, 'state_invalid');
      }
      pending.delete(hash(state)); // Single use, including denial and failed exchanges.
      assertGeneration(attempt.generation);
      if (params.has('error')) throw error('Google 계정 연결을 취소했습니다.', 400, params.get('error') === 'access_denied' ? 'access_denied' : 'authorization_failed');
      const code = params.get('code');
      if (!code || code.length > 8192) throw error('Google 인증 코드를 받지 못했습니다.', 400, 'token_failed');
      return exclusive(async () => {
        assertGeneration(attempt.generation);
        ensureCredentials();
        const response = await request(TOKEN_URL, { method: 'POST', body: new URLSearchParams({ code, client_id: clientId, client_secret: clientSecret, redirect_uri: attempt.origin + GOOGLE_CALLBACK_PATH, grant_type: 'authorization_code', code_verifier: attempt.verifier }) });
        const data = await body(response);
        if (!response.ok) throw error('Google 인증을 완료하지 못했습니다. 클라이언트 설정을 확인하고 다시 연결해주세요.', 502, 'token_failed');
        // Never reuse a previous account's refresh token when switching accounts.
        const tokens = tokenFields(data);
        const channels = await fetchChannel(tokens.accessToken);
        assertGeneration(attempt.generation);
        vault.write({ clientHash, ...tokens, channels, verifiedAt: new Date(now()).toISOString() });
        generation++;
        pending.clear();
      });
    },
    channels() {
      const expected = generation;
      return exclusive(async () => {
        assertGeneration(expected);
        const record = currentRecord();
        let token = await accessToken(record, expected);
        let channels;
        try { channels = await fetchChannel(token); }
        catch (cause) {
          if (cause.code !== 'reconnect_required') throw cause;
          token = await accessToken(record, expected, true);
          try { channels = await fetchChannel(token); }
          catch (retryError) {
            if (retryError.code === 'reconnect_required') {
              assertGeneration(expected);
              vault.write({ ...record, reconnectRequired: true });
            }
            throw retryError;
          }
        }
        assertGeneration(expected);
        record.channels = channels;
        record.verifiedAt = new Date(now()).toISOString();
        vault.write(record);
        return { channels, verifiedAt: record.verifiedAt };
      });
    },
    disconnect() {
      generation++;
      pending.clear();
      return exclusive(async () => {
        const record = vault.read();
        const token = record?.refreshToken || record?.accessToken;
        if (token) {
          const response = await request(REVOKE_URL, { method: 'POST', body: new URLSearchParams({ token }) });
          if (!response.ok) {
            const data = await body(response);
            if (!(response.status === 400 && data.error === 'invalid_token')) throw error('Google 권한을 해제하지 못했습니다. 연결을 유지했으니 잠시 후 다시 시도해주세요.', 502, 'revoke_failed');
          }
        }
        vault.remove();
        return { disconnected: true };
      });
    },
  };
}
