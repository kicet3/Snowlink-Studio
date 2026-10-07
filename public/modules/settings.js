import { pageHeading, button, badge } from './components.js';
import { escape as e, toast } from './ui.js';
import { api, state } from './state.js';
import { mountAccountSettings } from './account.js';
import { loadModelSettings } from './model-settings.js';
import { toolApi, safeUrl } from './integration-api.js';
import { mountGoogleSettings, refreshGoogleStatus } from './google-settings.js';
import { mountMcpSettings } from './mcp-settings.js';

const sessions = new Map();
let initialized = false;
let loading;
const panel = () => document.querySelector('#panel-settings');
export async function openSettings() {
  if (!initialized) {
    panel().innerHTML = `<div class="studio-page">${pageHeading({ eyebrow: 'CONNECTED TO YOUR IMAGINATION', index: '06 / SETTINGS', title: '계정을 연결하고, 제작을 이어가세요', description: 'AI 계정과 YouTube 채널을 연결하고 작업실의 기본 AI를 관리합니다.', actionsHtml: button('상태 새로고침', { variant: 'secondary', iconName: 'refresh', attrs: { 'data-auth-refresh': true } }) })}<div class="settings-grid">${['gpt', 'grok'].map(providerCard).join('')}</div><section class="surface-card settings-card settings-preference"><h2>작업별 AI 모델</h2><p class="small muted">제공자와 모델을 작업별로 저장합니다. 제작 화면에서는 개별 작업의 모델을 다시 선택할 수 있습니다.</p><div id="model-settings" aria-live="polite">모델 목록을 불러오고 있습니다…</div></section><p class="subtitle small">AI 계정의 연결 정보는 이 Mac의 기존 OAuth 저장소에서 관리합니다. 로그인 완료 후 다른 기기에서도 같은 작업실을 사용할 수 있습니다.</p></div>`;
    const metaCard = document.createElement('section');
    metaCard.className = 'surface-card settings-card settings-preference';
    metaCard.innerHTML = `<div class="provider-heading"><div><p class="eyebrow">INSTAGRAM</p><h2>Instagram 연결 준비</h2></div><span data-meta-badge>${badge('확인 중')}</span></div><p data-meta-summary role="status">앱 설정 상태를 확인하고 있어요.</p><p class="small muted" data-meta-credentials></p><p class="small muted">Facebook 페이지에 연결된 비즈니스·크리에이터 계정이 필요합니다. 계정 연결과 수집·성과 조회·게시 기능은 아직 준비 중입니다.</p>`;
    panel().querySelector('.settings-grid').after(metaCard);
    mountGoogleSettings(metaCard);
    void mountMcpSettings(panel().querySelector('.studio-page'));
    mountAccountSettings(panel().querySelector('.studio-page'));
    if (state.user?.role !== 'admin') {
      panel().querySelector('.settings-grid').hidden = true;
      metaCard.hidden = true;
      panel().querySelector('.subtitle.small').textContent = 'AI 생성은 관리자가 연결한 GPT·Grok 계정을 사용합니다. 내 YouTube 연결과 모델 선택은 내 작업실에 저장됩니다.';
      panel().querySelector('.settings-preference.settings-card')?.setAttribute('data-account-managed', 'true');
    }
    panel().querySelector('[data-auth-refresh]').onclick = refreshStatus;
    panel().querySelectorAll('[data-login]').forEach(b => b.onclick = () => startLogin(b.dataset.login));
    initialized = true;
  }
  if (!loading) loading = refreshStatus().finally(() => loading = null);
  await Promise.all([loading, loadModelSettings()]);
}
function providerCard(provider) {
  const name = provider === 'gpt' ? 'GPT' : 'Grok';
  return `<section class="surface-card settings-card" data-provider="${provider}"><div class="provider-heading"><div><p class="eyebrow">${name.toUpperCase()} OAUTH</p><h2>${name} 계정</h2></div><span data-auth-badge>${badge('확인 중')}</span></div><p class="provider-account" data-auth-account>로그인 상태를 확인하고 있어요.</p><div data-login-session></div>${button(`${name} 로그인`, { variant: 'secondary', attrs: { 'data-login': provider } })}</section>`;
}
async function refreshStatus() {
  const refresh = panel().querySelector('[data-auth-refresh]');
  refresh.disabled = true;
  try { await Promise.all([refreshAiStatus(), refreshMetaStatus(), refreshGoogleStatus()]); }
  finally { refresh.disabled = false; }
}
async function refreshMetaStatus() {
  try {
    const status = await api('/api/meta/status');
    const ready = status.status === 'credentials_present';
    panel().querySelector('[data-meta-badge]').innerHTML = badge(ready ? '앱 설정 준비됨 · 계정 미연결' : '앱 설정 필요', { tone: 'ochre' });
    panel().querySelector('[data-meta-summary]').textContent = status.message;
    const labels = { present: '입력됨', missing: '미입력', invalid: '형식 확인 필요' };
    panel().querySelector('[data-meta-credentials]').textContent = `앱 ID: ${labels[status.credentials.appId]} · 앱 시크릿: ${labels[status.credentials.appSecret]}`;
  } catch {
    panel().querySelector('[data-meta-badge]').innerHTML = badge('확인 실패', { tone: 'ochre' });
    panel().querySelector('[data-meta-summary]').textContent = 'Instagram 앱 설정 상태를 확인하지 못했습니다. 서버 상태를 확인한 뒤 다시 시도해주세요.';
    panel().querySelector('[data-meta-credentials]').textContent = '';
  }
}
async function refreshAiStatus() {
  try {
    const [oauth, ai] = await Promise.all([toolApi('ima2', '/api/oauth/status'), api('/api/ai/status')]);
    for (const provider of ['gpt', 'grok']) {
      const auth = provider === 'gpt' ? oauth.auth : oauth.grokAuth;
      const card = panel().querySelector(`[data-provider=${provider}]`);
      const ready = ai.providers[provider]?.ready;
      card.querySelector('[data-auth-badge]').innerHTML = badge(ready ? '연결됨' : auth?.loggedIn ? '연결 확인 필요' : '로그인 필요', { tone: ready ? 'pine' : 'ochre' });
      card.querySelector('[data-auth-account]').textContent = [auth?.email || (auth?.loggedIn ? '저장된 OAuth 계정' : '연결된 계정이 없습니다.'), auth?.plan, !ready && auth?.loggedIn ? '세션을 확인하지 못했습니다. 다시 로그인하거나 상태를 새로고침하세요.' : ''].filter(Boolean).join(' · ');
      card.querySelector('[data-login]').textContent = auth?.loggedIn ? '다른 계정으로 로그인' : `${provider === 'gpt' ? 'GPT' : 'Grok'} 로그인`;
    }
  } catch (error) {
    panel().querySelectorAll('[data-auth-badge]').forEach(el => el.innerHTML = badge('확인 실패', { tone: 'ochre' }));
    panel().querySelectorAll('[data-auth-account]').forEach(el => el.textContent = error.message);
  }
}
async function startLogin(provider) {
  const card = panel().querySelector(`[data-provider=${provider}]`);
  const target = card.querySelector('[data-login-session]');
  card.querySelector('[data-login]').disabled = true;
  target.innerHTML = '<p class="notice" role="status">인증 코드를 준비하고 있습니다…</p>';
  try {
    const flow = await toolApi('ima2', '/api/auth/switch', { method: 'POST', body: { provider: provider === 'gpt' ? 'codex' : 'grok', flow: 'device' }, timeout: 70000 });
    const session = { ...flow, expires: Date.now() + (flow.expiresIn || 900) * 1000, timer: null };
    sessions.set(provider, session);
    const url = safeUrl(flow.verificationUrl);
    if (!url || !flow.userCode) throw new Error('인증 주소를 받지 못했습니다. 다시 시도해주세요.');
    target.innerHTML = `<div class="notice"><p>인증 페이지를 열고 아래 코드를 입력해주세요.</p><strong class="login-code">${e(flow.userCode)}</strong><div class="login-actions"><a class="primary button" href="${e(url)}" target="_blank" rel="noopener noreferrer">인증 페이지 열기 ↗</a>${button('코드 복사', { variant: 'secondary', attrs: { 'data-copy-code': true } })}${button('취소', { variant: 'quiet-button', attrs: { 'data-cancel-login': true } })}</div><p class="small" data-login-progress role="status">로그인 완료를 기다리고 있습니다.</p></div>`;
    target.querySelector('[data-copy-code]').onclick = async () => { try { await navigator.clipboard.writeText(flow.userCode); toast('인증 코드를 복사했습니다.'); } catch { toast('인증 코드를 선택해 복사해주세요.'); } };
    target.querySelector('[data-cancel-login]').onclick = () => cancelLogin(provider);
    session.timer = setTimeout(() => pollLogin(provider), 2000);
  } catch (error) { await finishLogin(provider, error.message, false); }
}
async function pollLogin(provider) {
  const session = sessions.get(provider);
  if (!session) return;
  if (Date.now() >= session.expires) return cancelLogin(provider, '인증 코드가 만료되었습니다. 다시 로그인해주세요.');
  try {
    const result = await toolApi('ima2', `/api/auth/switch/${encodeURIComponent(session.sessionId)}`, { timeout: 15000 });
    if (sessions.get(provider) !== session) return;
    if (result.status === 'complete') return finishLogin(provider, 'OAuth 연결을 완료했습니다.', true);
    if (['error', 'expired'].includes(result.status)) return finishLogin(provider, result.error || '인증이 만료되었습니다. 다시 시도해주세요.', false);
    panel().querySelector(`[data-provider=${provider}] [data-login-progress]`).textContent = `로그인 대기 중 · 약 ${Math.max(1, Math.ceil((session.expires - Date.now()) / 60000))}분 남음`;
  } catch (error) {
    if (sessions.get(provider) !== session) return;
    panel().querySelector(`[data-provider=${provider}] [data-login-progress]`).textContent = `${error.message} 연결 상태를 다시 확인하고 있습니다.`;
  }
  if (sessions.get(provider) === session) session.timer = setTimeout(() => pollLogin(provider), 2500);
}
async function cancelLogin(provider, message = '로그인을 취소했습니다.') {
  const session = sessions.get(provider);
  if (!session) return;
  clearTimeout(session.timer);
  sessions.delete(provider);
  try { await toolApi('ima2', `/api/auth/switch/${encodeURIComponent(session.sessionId)}`, { method: 'DELETE', timeout: 15000 }); }
  catch (error) { toast(error.message); }
  await finishLogin(provider, message, false);
}
async function finishLogin(provider, message, success) {
  clearTimeout(sessions.get(provider)?.timer);
  sessions.delete(provider);
  const card = panel().querySelector(`[data-provider=${provider}]`);
  card.querySelector('[data-login-session]').innerHTML = `<p class="notice" role="status">${e(message)}</p>`;
  card.querySelector('[data-login]').disabled = false;
  if (success) { toast(message); await refreshStatus(); document.dispatchEvent(new Event('oauth-updated')); }
}
