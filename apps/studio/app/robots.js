import { AI_CRAWLERS, STUDIO_URL } from './_lib/seo';

export default function robots() {
  // Explicit rules retain the owner's allow-all policy, including AI search and training bots.
  // Authentication protects account data; noindex is supplied by individual workspace pages.
  return { rules: ['*', ...AI_CRAWLERS].map(userAgent => ({ userAgent, allow: '/' })), sitemap: `${STUDIO_URL}/sitemap.xml` };
}
