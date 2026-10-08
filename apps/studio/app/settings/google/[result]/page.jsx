export const dynamic = 'force-dynamic';
import { pageMetadata } from '../../../_lib/seo';
export async function generateMetadata({ params }) {
  const { result } = await params;
  return pageMetadata({ path: `/settings/google/${encodeURIComponent(result)}`, title: 'Google 연결 결과 · Snowlink Team Studio', description: '내 계정의 Google 연결 결과를 확인하는 설정 페이지입니다.' });
}
export { default } from '../../page';
