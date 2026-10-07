import { companyConfig } from '../lib/config';
import '../styles/tokens.css';
import '../styles/base.css';
import '../styles/controls.css';
import '../styles/company.css';

export const dynamic = 'force-dynamic';
export function generateMetadata() {
  return {
    title: `${companyConfig().name} · 회사 소개`,
    icons: { icon: '/brandmark.svg' },
  };
}
export default function Layout({ children }) {
  return <html lang="ko"><body>{children}</body></html>;
}
