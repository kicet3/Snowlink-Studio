export const dynamic = 'force-dynamic';
import { pageMetadata } from '../_lib/seo';

export const metadata = pageMetadata({'path': '/trends', 'title': '트렌드 탐색 · Snowlink Team Studio', 'description': '검색어와 영상 트렌드를 살펴보고 다음 콘텐츠에 활용할 소재를 탐색합니다.'});

import { Trends } from '../_components/Trends';

export default function Page() {
  return <Trends active={true}/>;
}
