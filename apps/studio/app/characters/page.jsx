export const dynamic = 'force-dynamic';
import { pageMetadata } from '../_lib/seo';

export const metadata = pageMetadata({'path': '/characters', 'title': '캐릭터 시트 · Snowlink Studio', 'description': '참고 사진이나 캐릭터 설정을 바탕으로 AI와 대화하고 캐릭터 시트와 프롬프트 템플릿을 관리합니다.'});

import { Characters } from '../_components/Characters';

export default function Page() {
  return <Characters active={true}/>;
}
