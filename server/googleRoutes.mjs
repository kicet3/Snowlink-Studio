import { json, readJson } from './http.mjs';
import { GOOGLE_CALLBACK_PATH } from './google.mjs';

export async function handleGoogle(req, res, url, google) {
  if (!url.pathname.startsWith('/api/google/')) return false;
  if (url.pathname === GOOGLE_CALLBACK_PATH && req.method === 'GET') {
    let result = 'connected';
    try { await google.callback(req, url.searchParams); }
    catch (error) {
      const codes = ['state_invalid', 'access_denied', 'authorization_failed', 'scope_required', 'refresh_required', 'token_failed', 'network_error', 'youtube_api_error', 'storage_error', 'cancelled'];
      result = codes.includes(error.code) ? error.code : 'failed';
    }
    res.writeHead(303, { Location: '/#settings/google/' + result, 'Set-Cookie': google.clearCookie(req), 'Cache-Control': 'no-store', 'Referrer-Policy': 'no-referrer' });
    res.end();
    return true;
  }
  if (req.method === 'GET' && url.pathname === '/api/google/status') { json(res, 200, google.status(req)); return true; }
  if (req.method === 'GET' && url.pathname === '/api/google/channels') { json(res, 200, await google.channels()); return true; }
  if (req.method === 'POST' && ['/api/google/connect', '/api/google/disconnect'].includes(url.pathname)) {
    // OAuth starts and revocations require a deliberate same-origin JSON action.
    if (req.headers.origin !== google.origin(req)) throw Object.assign(new Error('작업실 설정 화면에서 Google 연결을 진행해주세요.'), { status: 403 });
    await readJson(req);
    if (url.pathname.endsWith('/connect')) {
      const flow = google.start(req);
      res.setHeader('Set-Cookie', flow.cookie);
      json(res, 200, { authorizationUrl: flow.authorizationUrl });
    } else {
      const result = await google.disconnect();
      res.setHeader('Set-Cookie', google.clearCookie(req));
      json(res, 200, result);
    }
    return true;
  }
  json(res, 404, { error: 'Google 연결 경로를 찾을 수 없습니다.' });
  return true;
}
