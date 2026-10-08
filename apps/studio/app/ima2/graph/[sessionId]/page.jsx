export const dynamic = 'force-dynamic';
import { pageMetadata } from '../../../_lib/seo';
export async function generateMetadata({ params }) {
  const { sessionId } = await params;
  return pageMetadata({ path: `/ima2/graph/${encodeURIComponent(sessionId)}`, title: '장면 노드 작업실 · Snowlink Team Studio', description: '이미지·영상 생성 장면과 연결을 관리하는 개인 노드 작업실입니다.' });
}
export { default } from '../../page';
