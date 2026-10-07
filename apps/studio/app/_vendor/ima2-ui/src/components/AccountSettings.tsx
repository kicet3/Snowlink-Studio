import { useOAuthStatus } from "../hooks/useOAuthStatus";
export function AccountSettings() {
  const status = useOAuthStatus();
  return <article className="provider-card"><div className="provider-card__head"><h4>Studio AI 연결</h4><span className="provider-chip">{status?.auth?.loggedIn ? '사용 가능' : '연결 확인 중'}</span></div><div className="settings-row__copy"><p>AI 연결은 서버에서 관리합니다. 제공업체에 별도로 로그인하지 않고 제작을 이어갈 수 있습니다.</p><a href="/settings">작업별 AI 모델 설정 →</a></div></article>;
}
