export const dynamic = 'force-dynamic';
import { pageMetadata } from '../../_lib/seo';
export async function generateMetadata({ params }) {
  const { requestId } = await params;
  return pageMetadata({ path: `/oauth/${encodeURIComponent(requestId)}`, title: 'MCP 연결 승인 · 네티움 스튜디오', description: '요청한 MCP 앱과 권한을 확인하고 내 작업실 접근을 승인합니다.' });
}
import { OAuthConsent } from '../../_components/OAuthConsent';
export default function Page() { return <OAuthConsent/>; }
