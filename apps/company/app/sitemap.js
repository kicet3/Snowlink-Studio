import { companyConfig } from '../lib/config';

export default function sitemap() {
  const c = companyConfig();
  return [{ url: `${c.siteUrl}/`, lastModified: c.contentUpdated }];
}
