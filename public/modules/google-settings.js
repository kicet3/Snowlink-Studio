import { badge, button } from './components.js';
import { escape as e, toast } from './ui.js';
import { api } from './state.js';

const MESSAGES = {
  connected: 'Google 연결이 완료되었습니다. YouTube 채널을 확인할 수 있어요.',
  access_denied: 'Google 연결을 취소했습니다. 원할 때 다시 연결할 수 있어요.',
  authorization_failed: 'Google에서 연결을 승인하지 않았습니다. OAuth 앱 설정을 확인해주세요.',
  state_invalid: '연결 요청이 만료되었거나 시작한 브라우저와 다릅니다. 이 화면에서 다시 연결해주세요.',
  scope_required: 'YouTube 계정 조회 권한을 허용해야 채널을 연결할 수 있습니다.',
  refresh_required: '지속 연결 권한을 받지 못했습니다. Google에 다시 연결해주세요.',
  token_failed: '인증을 완료하지 못했습니다. Google 클라이언트 ID·시크릿과 등록한 콜백 URL을 확인해주세요.',
  network_error: 'Google 서버에 연결하지 못했습니다. 잠시 후 다시 시도해주세요.',
  youtube_api_error: '채널을 조회하지 못했습니다. Google Cloud에서 YouTube Data API v3 활성화 상태와 할당량을 확인해주세요.',
  storage_error: '연결 정보를 저장하지 못했습니다. 서버의 파일 접근 권한을 확인해주세요.',
  cancelled: '연결 요청이 취소되거나 다른 연결로 바뀌었습니다. 다시 시작해주세요.',
  failed: 'Google 연결을 완료하지 못했습니다. 다시 시도해주세요.',
};
let card;
let notice = '';
let busy = false;

export function mountGoogleSettings(after) {
  card = document.createElement('section');
  card.className = 'surface-card settings-card settings-preference google-settings';
  card.setAttribute('aria-label', 'Google · YouTube 연결');
  card.innerHTML = '<h2>Google · YouTube 연결</h2><p role="status">연결 상태를 확인하고 있어요.</p>';
  after.after(card);
}
function callbackNotice() {
  const match = /^#settings\/google\/([a-z_]+)$/.exec(location.hash);
  if (!match) return;
  notice = MESSAGES[match[1]] || MESSAGES.failed;
  history.replaceState(null, '', location.pathname + location.search + '#settings');
}
function count(value) {
  if (value == null) return '비공개 / 제공 안 됨';
  return /^\d+$/.test(String(value)) ? BigInt(value).toLocaleString('ko-KR') : '제공 안 됨';
}
function render(status) {
  const connected = status.accountConnected;
  const ready = status.credentials.clientId && status.credentials.clientSecret;
  const label = connected ? '연결됨' : status.status === 'reconnect_required' ? '다시 연결 필요' : ready ? '연결 대기' : '앱 설정 필요';
  const description = connected ? '연결한 YouTube 채널의 공개 통계를 확인합니다.' : ready ? 'Google에 로그인하고 조회할 YouTube 채널의 접근을 허용해주세요.' : '서버에 GOOGLE_CLIENT_ID와 GOOGLE_CLIENT_SECRET을 입력하고 재시작해주세요.';
  card.innerHTML = `<div class="provider-heading"><div><p class="eyebrow">GOOGLE · YOUTUBE</p><h2>내 YouTube 채널</h2></div>${badge(label, { tone: connected ? 'pine' : 'ochre' })}</div>
    <p>${e(description)}</p>
    <p class="notice" data-google-notice role="status" ${notice ? '' : 'hidden'}>${e(notice)}</p>
    <div class="google-channels">${connected ? status.channels.length ? status.channels.map(channel => `<div class="google-channel"><a href="${e(channel.url)}" target="_blank" rel="noopener noreferrer">${e(channel.title || channel.id)} ↗</a><dl class="google-statistics"><div><dt>누적 조회수</dt><dd>${e(count(channel.statistics.views))}</dd></div><div><dt>구독자</dt><dd>${e(count(channel.statistics.subscribers))}</dd></div><div><dt>공개 영상</dt><dd>${e(count(channel.statistics.videos))}</dd></div></dl></div>`).join('') : '<p class="small muted">이 계정에 연결된 YouTube 채널이 없습니다. 다른 Google 계정 또는 브랜드 채널로 연결해주세요.</p>' : ''}</div>
    ${status.lastVerifiedAt ? `<p class="small muted">마지막 조회: ${e(new Date(status.lastVerifiedAt).toLocaleString('ko-KR'))} · 구독자 수는 YouTube가 제공하는 반올림 수치입니다.</p>` : ''}
    <div class="login-actions">${button(connected ? '다른 채널 연결' : 'Google로 연결', { variant: 'secondary', attrs: { 'data-google-connect': true, disabled: !ready || busy } })}${connected ? button('채널 통계 새로고침', { variant: 'secondary', attrs: { 'data-google-refresh': true, disabled: busy } }) : ''}${status.canDisconnect ? button('연결 해제', { variant: 'quiet-button', attrs: { 'data-google-disconnect': true, disabled: busy } }) : ''}</div>
    <details class="google-setup"><summary>Google 앱 설정 · 콜백 URL</summary><p class="small muted">Google Cloud의 웹 애플리케이션 OAuth 클라이언트 → 승인된 리디렉션 URI에 아래 주소를 등록해주세요. 접속 주소가 바뀌면 해당 주소도 등록해야 합니다.</p><label class="field">현재 접속 주소의 콜백 URL<input data-google-callback aria-label="Google 콜백 URL" readonly value="${e(status.callbackUrl)}"></label>${button('콜백 URL 복사', { variant: 'secondary', attrs: { 'data-google-copy': true } })}<p class="small muted">클라이언트 ID: ${status.credentials.clientId ? '입력됨' : '미입력'} · 클라이언트 시크릿: ${status.credentials.clientSecret ? '입력됨' : '미입력'} · YouTube API 키: ${status.credentials.apiKey ? '입력됨' : '미입력'}</p><p class="small muted">YouTube Data API v3를 활성화하고, OAuth 앱이 테스트 상태이면 로그인할 Google 계정을 테스트 사용자로 추가해주세요. 공개 검색용 API 키는 이 계정 연결에 필요하지 않습니다.</p></details>`;
  card.querySelector('[data-google-connect]').onclick = () => perform(async () => {
    const flow = await api('/api/google/connect', 'POST', {});
    const target = new URL(flow.authorizationUrl);
    if (target.origin !== 'https://accounts.google.com' || target.pathname !== '/o/oauth2/v2/auth') throw new Error('Google 인증 주소를 확인하지 못했습니다.');
    location.assign(target.href);
  });
  card.querySelector('[data-google-refresh]')?.addEventListener('click', () => perform(async () => {
    await api('/api/google/channels');
    notice = 'YouTube 채널 통계를 새로 불러왔습니다.';
  }));
  card.querySelector('[data-google-disconnect]')?.addEventListener('click', () => perform(async () => {
    await api('/api/google/disconnect', 'POST', {});
    notice = 'Google 접근 권한을 해제하고 저장된 연결 정보를 삭제했습니다.';
  }));
  card.querySelector('[data-google-copy]').onclick = async () => {
    try { await navigator.clipboard.writeText(status.callbackUrl); toast('콜백 URL을 복사했습니다.'); }
    catch { card.querySelector('[data-google-callback]').select(); toast('선택된 콜백 URL을 복사해주세요.'); }
  };
}
async function perform(action) {
  if (busy) return;
  busy = true;
  card.querySelectorAll('button:not([data-google-copy])').forEach(button => button.disabled = true);
  try { await action(); }
  catch (error) { notice = error.message; }
  finally { busy = false; await refreshGoogleStatus(); }
}
export async function refreshGoogleStatus() {
  callbackNotice();
  try { render(await api('/api/google/status')); }
  catch {
    card.innerHTML = `<h2>Google · YouTube 연결</h2><p class="notice" role="status">Google 연결 상태를 확인하지 못했습니다. 서버 상태를 확인한 뒤 상태 새로고침을 눌러주세요.</p>`;
  }
}
