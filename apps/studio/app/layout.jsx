import { StudioShell } from './_components/StudioShell';
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

export const metadata = {
  title: 'snowlink-studio · 콘텐츠 작업실',
  robots: { index: false, follow: false, noimageindex: true, nosnippet: true },
  icons: { icon: '/logo.svg' },
};
export const viewport = { themeColor: '#080808', width: 'device-width', initialScale: 1 };
export const dynamic = 'force-dynamic';

export default function RootLayout({ children }) {
  return <html lang="ko"><body><StudioShell>{children}</StudioShell></body></html>;
}
