import { StudioShell } from './_components/StudioShell';
import { pageMetadata } from './_lib/seo';
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
import './_styles/guide.css';

export const metadata = {
  metadataBase: new URL('https://studio.snowlink.team'),
  ...pageMetadata({ path: '/', title: '네티움 스튜디오 · 콘텐츠 작업실' }),
  applicationName: '네티움 스튜디오',
  // Public ownership token issued by Search Console; keep it after verification.
  verification: { google: 'WWxgi8V7nRehj6Buk0diT3OqAMcIt-NXruyrw8weTYA' },
  // Each public page explicitly opts into indexing. Account and workspace pages stay excluded.
  icons: { icon: '/logo.svg' },
};
export const viewport = { themeColor: '#080808', width: 'device-width', initialScale: 1 };

export default function RootLayout({ children }) {
  return <html lang="ko"><body><StudioShell>{children}</StudioShell></body></html>;
}
