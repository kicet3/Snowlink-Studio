export const dynamic = 'force-dynamic';
import { pageMetadata } from '../_lib/seo';

export const metadata = pageMetadata({'path': '/scenarios', 'title': '소설·시나리오 제작 · 네티움 스튜디오', 'description': '전체 플롯부터 회차별 플롯과 상세 원고까지 순서대로 작성하고 인물·사건·복선을 관리합니다.'});

import { Scenarios } from '../_components/Scenarios';

export default function Page() {
  return <Scenarios active={true}/>;
}
