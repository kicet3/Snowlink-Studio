import { StudioShell } from './_components/StudioShell';
import { PRODUCT_NAME } from './_lib/branding';
import './_styles/tokens.css';
import './_styles/base.css';
import './_styles/components.css';
import './_styles/workspace.css';
import './_styles/forms.css';
import './_styles/cuts.css';
import './_styles/studio.css';
import './_styles/character-studio.css';
import './_styles/scenarios.css';
import './_styles/account.css';
import './_styles/monochrome.css';
import './_styles/wordmark.css';
import './_styles/membership.css';
import './_styles/explore.css';

export const metadata = {
  metadataBase: new URL('https://studio.snowlink.team'),
  title: `${PRODUCT_NAME} · 콘텐츠 작업실`,
  description: 'AI 캐릭터 시트, 회차별 소설·시나리오와 이미지·영상 제작을 연결하는 Snowlink Studio 작업실입니다.',
  // Workspace pages contain session-specific UI. The public MCP guide opts in separately.
  robots: { index: false, follow: true },
  icons: { icon: '/logo.svg' },
};
export const viewport = { themeColor: '#080808', width: 'device-width', initialScale: 1 };
export const dynamic = 'force-dynamic';

export default function RootLayout({ children }) {
  return <html lang="ko"><body><StudioShell>{children}</StudioShell></body></html>;
}
