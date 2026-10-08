import { metadata as companyMetadata } from '../lib/seo';
import '../styles/tokens.css';
import '../styles/base.css';
import '../styles/controls.css';
import '../styles/company.css';

export const metadata = companyMetadata;
export default function Layout({ children }) {
  return <html lang="ko"><body>{children}</body></html>;
}
