export const dynamic = 'force-dynamic';
import { pageMetadata } from '../_lib/seo';

export const metadata = pageMetadata({'path': '/board', 'title': '내 제작 보드 · Snowlink Team Studio', 'description': '콘텐츠 기획과 대본, 출연 캐릭터를 정리하고 제작 단계를 관리하는 개인 작업실입니다.'});

import { Board } from '../_components/Board';

export default function Page() {
  return <Board active={true}/>;
}
