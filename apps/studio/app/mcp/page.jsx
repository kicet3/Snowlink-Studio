import { McpGuide } from '../_components/McpGuide';

const title = 'MCP 연결 안내 · Snowlink Studio';
const description = 'Claude Code·Codex에 Snowlink Studio MCP를 연결하는 방법과 OAuth 인증을 안내합니다. 대화로 캐릭터 시트, 회차별 시나리오와 이미지·영상 장면 노드를 만들고 웹에서 이어서 편집하세요.';
const url = 'https://studio.snowlink.team/mcp';
const images = [{ url: 'https://www.snowlink.team/opengraph-image', width: 1200, height: 630, alt: 'Snowlink Studio — AI 콘텐츠 제작 작업실' }];
export const metadata = {
  title, description, alternates: { canonical: url },
  robots: { index: true, follow: true },
  openGraph: { type: 'website', locale: 'ko_KR', siteName: 'Snowlink Studio', title, description, url, images },
  twitter: { card: 'summary_large_image', title, description, images },
};

export default function Page() { return <McpGuide/>; }
