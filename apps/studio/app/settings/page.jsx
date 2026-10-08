export const dynamic = 'force-dynamic';
import { pageMetadata } from '../_lib/seo';

export const metadata = pageMetadata({'path': '/settings', 'title': '설정 · Snowlink Team Studio', 'description': '내 계정의 AI 서비스 연결과 제작 환경을 관리하는 Snowlink Team Studio 설정 페이지입니다.'});

import { Settings } from '../_components/Settings';
import { RequireAccount } from '../_components/RequireAccount';

export default function Page() {
  return <RequireAccount><Settings active={true}/></RequireAccount>;
}
