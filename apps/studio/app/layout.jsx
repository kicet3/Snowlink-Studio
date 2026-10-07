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
import tokens from './_styles/tokens.resolved.json';

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
