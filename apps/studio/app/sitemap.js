import { PUBLIC_PAGES, STUDIO_URL, CONTENT_UPDATED } from './_lib/seo';
export default function sitemap() {
  return PUBLIC_PAGES.map(page => ({ url: new URL(page.path, STUDIO_URL).href, lastModified: CONTENT_UPDATED }));
}
