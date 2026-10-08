export const dynamic = 'force-dynamic';
import { pageMetadata } from '../_lib/seo';

export const metadata = pageMetadata({'path': '/shortgpt', 'title': 'ShortGPT · 컷 편집 · Snowlink Team Studio', 'description': '대본을 장면으로 나누고 내레이션, 연출, 길이를 편집해 무음 콘티로 확인합니다.'});

import { Cuts } from '../_components/Cuts';

export default function Page() {
  return <Cuts active={true}/>;
}
