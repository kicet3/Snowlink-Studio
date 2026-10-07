import { api } from './state.js';
import { escape as e } from './ui.js';

export async function openOAuthConsent() {
  const panel = document.querySelector('#panel-oauth');
  const id = location.hash.split('/')[1];
  panel.innerHTML = '<div class="studio-page"><p>연결 요청을 확인하고 있습니다…</p></div>';
  try {
    if (!/^[A-Za-z0-9_-]{43}$/.test(id || '')) throw new Error('인증 요청이 올바르지 않습니다. MCP 클라이언트에서 다시 로그인해주세요.');
    const request = await api(`/api/oauth/requests/${id}`);
    panel.innerHTML = `<div class="studio-page"><section class="surface-card oauth-consent"><p class="eyebrow">CONNECT YOUR WORKSPACE</p><h1>MCP 연결을 승인할까요?</h1><p><strong>${e(request.clientName)}</strong>이 <strong>${e(request.username)}</strong>님의 작업실에 접근하려고 합니다.</p><ul><li>내 캐릭터·시나리오·노드와 생성 결과 조회</li><li>템플릿·플롯·원고·이야기 기억 작성 및 수정</li><li>요청한 이미지·영상 생성 실행 · 모델 사용 비용이 발생할 수 있습니다</li></ul><p class="small muted">클라이언트 이름은 연결 앱에서 제공한 표시 이름입니다. 직접 시작한 연결인지 확인해주세요.</p><label class="field"><span>승인 결과를 보낼 주소</span><input readonly value="${e(request.redirectUri)}"></label><p role="alert" class="auth-error"></p><div class="story-actions"><button class="button primary" data-approve="true">내 작업실 접근 허용</button><button class="button secondary" data-approve="false">취소</button></div><p class="small muted">다른 회원의 작업에는 접근할 수 없습니다. 설정에서 언제든 연결을 해제할 수 있습니다.</p></section></div>`;
    panel.querySelectorAll('[data-approve]').forEach(button => button.onclick = async () => {
      panel.querySelectorAll('button').forEach(b => b.disabled = true);
      try { const result = await api(`/api/oauth/requests/${id}`, 'POST', { approve: button.dataset.approve === 'true' }); location.assign(result.redirect); }
      catch (error) { panel.querySelector('[role=alert]').textContent = error.message; }
    });
  } catch (error) { panel.innerHTML = `<div class="studio-page"><section class="surface-card oauth-consent"><h2>연결을 완료하지 못했습니다</h2><p>${e(error.message)}</p><a class="button secondary" href="#settings">설정으로 돌아가기</a></section></div>`; }
}
