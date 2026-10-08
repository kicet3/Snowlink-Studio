import { api, state } from './state.js';
import { escape as e, toast } from './ui.js';

async function clearPreviousAccount(id) {
  try {
    if (localStorage.getItem('snowfall.account-id') === id) return;
    localStorage.clear(); sessionStorage.clear();
    localStorage.setItem('snowfall.account-id', id);
  } catch { /* Storage can be disabled. */ }
  try { for (const db of await indexedDB.databases()) if (db.name) indexedDB.deleteDatabase(db.name); } catch { /* Storage can be disabled. */ }
}
export async function ensureAccount() {
  const session = await api('/api/auth/session');
  if (session.user) { state.user = session.user; await clearPreviousAccount(session.user.id); mountAccount(); return; }
  document.body.classList.add('auth-locked');
  const screen = document.createElement('div'); screen.className = 'auth-screen';
  document.body.prepend(screen);
  await new Promise(resolve => {
    let register = false;
    function paint(error = '') {
      screen.innerHTML = `<div class="auth-intro"><a class="brand" href="/"><img src="/logo.svg" alt=""><span>Snowlink Studio</span></a><p class="eyebrow">A PLACE FOR YOUR STORIES</p><h1>작은 영감에서,<br>당신의 이야기까지.</h1><p>캐릭터를 만들고, 이야기를 이어 쓰고,<br>한 편의 영상으로 완성하는 나의 작업실.</p><div class="auth-features"><span>캐릭터 시트</span><span>시나리오 · 이야기 기억</span><span>애니메이션 · 실사 영화</span></div></div><section class="auth-card surface-card"><p class="eyebrow">YOUR CREATIVE SPACE</p><h2>${register ? '나의 작업실 만들기' : '다시 만나 반가워요'}</h2><p class="muted">${register ? '계정을 만들면 나만의 캐릭터와 시나리오를 저장할 수 있어요.' : '계정으로 로그인하고 만들던 이야기를 이어가세요.'}</p><form><label class="field"><span>아이디</span><input name="username" required minlength="3" maxlength="80" autocomplete="username" placeholder="영문·숫자 또는 이메일 형식"></label>${register ? '<label class="field"><span>이름</span><input name="name" required maxlength="80" autocomplete="nickname" placeholder="작업실에서 사용할 이름"></label>' : ''}<label class="field"><span>비밀번호</span><input name="password" type="password" required minlength="10" maxlength="128" autocomplete="${register ? 'new-password' : 'current-password'}" placeholder="10자 이상 입력해주세요"></label>${register ? '<label class="field"><span>비밀번호 확인</span><input name="confirm" type="password" required minlength="10" maxlength="128" autocomplete="new-password"></label>' : ''}<p class="auth-error" role="alert">${e(error)}</p><button type="submit" class="button primary">${register ? '회원가입' : '로그인'}</button></form><p class="auth-switch">${register ? '이미 계정이 있나요?' : '처음 방문하셨나요?'} <button type="button" class="text-button" data-switch>${register ? '로그인' : '회원가입'}</button></p></section>`;
      screen.querySelector('[data-switch]').onclick = () => { register = !register; paint(); };
      screen.querySelector('form').onsubmit = async event => {
        event.preventDefault(); const form = event.target, submit = form.querySelector('[type=submit]');
        const values = Object.fromEntries(new FormData(form));
        if (register && values.password !== values.confirm) { screen.querySelector('[role=alert]').textContent = '비밀번호 확인이 일치하지 않습니다.'; return; }
        submit.disabled = true;
        try {
          const result = await api(`/api/auth/${register ? 'register' : 'login'}`, 'POST', { username: values.username, password: values.password, ...(register ? { name: values.name } : {}) });
          state.user = result.user; await clearPreviousAccount(result.user.id); screen.remove(); document.body.classList.remove('auth-locked'); mountAccount(); resolve();
        } catch (error) { screen.querySelector('[role=alert]').textContent = error.message; }
        finally { submit.disabled = false; }
      };
    }
    paint();
  });
}
function mountAccount() {
  const footer = document.querySelector('.sidebar-footer .local-badge');
  footer.innerHTML = `<i></i> ${e(state.user.name || state.user.username)}`;
  const logout = document.createElement('button'); logout.className = 'text-button'; logout.textContent = '로그아웃';
  logout.onclick = async () => { try { await api('/api/auth/logout', 'POST', {}); localStorage.clear(); sessionStorage.clear(); location.reload(); } catch (error) { toast(error.message); } };
  document.querySelector('.sidebar-footer').append(logout);
}
export function mountAccountSettings(target) {
  const section = document.createElement('section'); section.className = 'surface-card settings-card settings-preference';
  section.innerHTML = `<p class="eyebrow">MY ACCOUNT</p><h2>${e(state.user?.name || '')} · 계정</h2><p class="muted">아이디: ${e(state.user?.username || '')}</p><details><summary>비밀번호 변경</summary><form><label class="field"><span>현재 비밀번호</span><input name="currentPassword" type="password" autocomplete="current-password" required></label><label class="field"><span>새 비밀번호</span><input name="password" type="password" autocomplete="new-password" minlength="10" maxlength="128" required></label><label class="field"><span>새 비밀번호 확인</span><input name="confirm" type="password" autocomplete="new-password" minlength="10" maxlength="128" required></label><p class="small muted">변경하면 다른 기기의 로그인 세션이 해제됩니다.</p><button type="submit" class="button secondary">비밀번호 변경</button></form></details>`;
  section.querySelector('form').onsubmit = async event => { event.preventDefault(); const form = event.target, values = Object.fromEntries(new FormData(form)), button = form.querySelector('button'); if (values.password !== values.confirm) return toast('새 비밀번호 확인이 일치하지 않습니다.'); button.disabled = true; try { await api('/api/auth/password', 'POST', { currentPassword: values.currentPassword, password: values.password }); form.reset(); toast('비밀번호를 변경했습니다.'); } catch (error) { toast(error.message); } finally { button.disabled = false; } };
  target.append(section);
}
