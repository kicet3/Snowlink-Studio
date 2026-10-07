import { api } from './state.js';
import { escape as e, toast } from './ui.js';

export async function mountMcpSettings(target) {
  const section = document.createElement('section'); section.className = 'surface-card settings-card settings-preference';
  section.innerHTML = '<h2>MCP · Claude와 Codex 연결</h2><p>연결 정보를 불러오고 있습니다…</p>'; target.append(section);
  try {
    const status = await api('/api/mcp/status');
    const codex = `codex mcp add snowlink-studio --url ${status.endpoint}\ncodex mcp login snowlink-studio`;
    const claude = `claude mcp add --transport http snowlink-studio ${status.endpoint}\nclaude mcp login snowlink-studio`;
    section.innerHTML = `<p class="eyebrow">CONNECTED WORKFLOWS</p><h2>MCP · Claude와 Codex 연결</h2><p>웹 계정으로 로그인하고 연결을 승인하면 내 캐릭터·시나리오·이미지·영상 노드를 대화로 다룰 수 있습니다.</p><p class="small muted">${status.toolCount}개 도구 · OAuth + PKCE</p><label class="field"><span>MCP 접속 주소</span><input readonly value="${e(status.endpoint)}"></label><div class="story-actions"><button class="button secondary" data-copy-codex>Codex 연결 명령 복사</button><button class="button secondary" data-copy-claude>Claude Code 연결 명령 복사</button></div><p class="small muted">앱에서 URL을 추가한 뒤 로그인 버튼을 눌러도 됩니다. Claude Code에서는 /mcp 메뉴에서도 인증할 수 있습니다. Tailscale 주소에 접근 가능한 기기에서 연결하세요. Claude 웹의 클라우드 커넥터에는 외부에서 접근 가능한 HTTPS 주소가 필요합니다.</p><h3>승인한 연결</h3><div data-oauth-grants></div><details><summary>고급 · 이 Mac의 로컬 프로세스로 연결</summary><p class="small muted">로컬 stdio 연결은 이 Mac의 계정별 연결 파일을 사용합니다. OAuth 로그인을 사용하려면 위 URL 방식으로 연결하세요.</p><button class="button secondary" data-copy-stdio>로컬 설정 복사</button></details>`;
    const copy = value => async () => { try { await navigator.clipboard.writeText(value); toast('연결 설정을 복사했습니다.'); } catch { toast('클립보드를 사용할 수 없습니다. README의 MCP 설정을 확인해주세요.'); } };
    section.querySelector('[data-copy-codex]').onclick = copy(codex);
    section.querySelector('[data-copy-claude]').onclick = copy(claude);
    section.querySelector('[data-copy-stdio]').onclick = copy(JSON.stringify({ mcpServers: { 'snowlink-studio': status.stdio } }, null, 2));
    async function grants() {
      const { grants: entries } = await api('/api/oauth/grants');
      const list = section.querySelector('[data-oauth-grants]');
      list.innerHTML = entries.length ? entries.map(g => `<div class="story-job"><div><strong>${e(g.clientName)}</strong><p>${e(new Date(g.createdAt).toLocaleDateString('ko-KR'))} 승인</p></div><button class="button secondary" data-revoke="${e(g.id)}">연결 해제</button></div>`).join('') : '<p class="small muted">승인한 MCP 연결이 없습니다.</p>';
      list.querySelectorAll('[data-revoke]').forEach(button => button.onclick = async () => { button.disabled = true; try { await api('/api/oauth/grants/revoke', 'POST', { id: button.dataset.revoke }); await grants(); toast('MCP 연결을 해제했습니다.'); } catch (error) { toast(error.message); button.disabled = false; } });
    }
    await grants();
  } catch (error) { section.querySelector('p').textContent = error.message; }
}
