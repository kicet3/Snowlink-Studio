import { StudioShell } from '../frontend/components/StudioShell';
import '../public/styles/tokens.css';
import '../public/styles/base.css';
import '../public/styles/components.css';
import '../public/styles/workspace.css';
import '../public/styles/forms.css';
import '../public/cuts.css';
import '../public/styles/studio.css';
import '../public/styles/character-studio.css';
import '../public/styles/scenarios.css';
import '../public/styles/account.css';
import tokens from '../design/tokens.resolved.json';

export const metadata = {
  title: 'snowlink-studio · 콘텐츠 작업실',
  robots: { index: false, follow: false, noimageindex: true, nosnippet: true },
  icons: { icon: '/logo.svg' },
};
export const viewport = { themeColor: tokens['color-background'], width: 'device-width', initialScale: 1 };
export const dynamic = 'force-dynamic';

export default function RootLayout({ children }) {
  return <html lang="ko"><body><StudioShell>{children}</StudioShell></body></html>;
}
