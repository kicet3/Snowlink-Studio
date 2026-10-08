import { siteUrl } from '../lib/seo';

export default function robots() {
  const agents = ['*', 'OAI-SearchBot', 'ChatGPT-User', 'GPTBot', 'Claude-SearchBot', 'Claude-User', 'ClaudeBot', 'PerplexityBot', 'Perplexity-User', 'Google-Extended'];
  return { rules: agents.map(userAgent => ({ userAgent, allow: '/' })), sitemap: `${siteUrl}/sitemap.xml` };
}
