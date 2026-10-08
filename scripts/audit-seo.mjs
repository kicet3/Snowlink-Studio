// Read-only audit of the built HTML or deployed pages; never starts a frontend server.
// node scripts/audit-seo.mjs [--local]
import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
import { PUBLIC_PAGES, AI_CRAWLERS } from '../apps/studio/app/_lib/seo.js';

const local = process.argv.includes('--local');
const company = 'https://www.snowlink.team';
const studio = 'https://studio.snowlink.team';
let assertions = 0;
function check(value, message) { assert(value, message); assertions++; }
async function read(origin, path, index = true) {
  if (local) {
    const app = origin === company ? 'company' : 'studio';
    const file = path === '/' ? 'index.html' : /\.(txt|xml)$/.test(path) ? path.slice(1) + '.body' : path.slice(1) + '.html';
    return fs.readFile(`apps/${app}/.next/server/app/${file}`, 'utf8');
  }
  const response = await fetch(origin + path, { headers: { 'User-Agent': 'Googlebot' }, signal: AbortSignal.timeout(25000) });
  check(response.status === 200, `${origin}${path}: HTTP ${response.status}`);
  if (index) check(!/noindex/i.test(response.headers.get('x-robots-tag') || ''), `${path}: contradictory X-Robots-Tag`);
  return response.text();
}
function attrs(tag) { return Object.fromEntries([...tag.matchAll(/([\w:-]+)="([^"]*)"/g)].map(match => [match[1], match[2]])); }
function pageCheck(html, url, index, structured = false) {
  const metas = [...html.matchAll(/<meta\b[^>]*>/g)].map(match => attrs(match[0]));
  const meta = key => metas.find(item => (item.name || item.property) === key)?.content;
  const links = [...html.matchAll(/<link\b[^>]*>/g)].map(match => attrs(match[0]));
  const canonicals = links.filter(item => item.rel === 'canonical');
  check(canonicals.length === 1, `${url}: one canonical`);
  check(new URL(canonicals[0].href).href === new URL(url).href, `${url}: canonical matches route`);
  check(!!html.match(/<title>[^<]+<\/title>/), `${url}: title`);
  check(!!meta('description'), `${url}: description`);
  check((html.match(/<h1[ >]/g) || []).length === 1, `${url}: one visible main heading`);
  check(/<html[^>]*lang="ko"/.test(html), `${url}: Korean document language`);
  check(index ? !/noindex/.test(meta('robots') || '') && /\bindex\b/.test(meta('robots') || '') : /noindex/.test(meta('robots') || ''), `${url}: correct indexing policy`);
  for (const key of ['og:title', 'og:description', 'og:image', 'og:image:alt', 'og:url', 'twitter:card']) check(!!meta(key), `${url}: ${key}`);
  check(new URL(meta('og:url')).href === new URL(url).href, `${url}: OG URL matches canonical`);
  if (structured) {
    const entries = [...html.matchAll(/<script[^>]*type="application\/ld\+json"[^>]*>([\s\S]*?)<\/script>/g)].map(match => JSON.parse(match[1]));
    check(entries.length > 0, `${url}: valid structured data in server HTML`);
    const nodes = entries.flatMap(entry => entry['@graph'] || [entry]);
    for (const faq of nodes.filter(node => node['@type'] === 'FAQPage')) for (const item of faq.mainEntity) check(html.includes(item.acceptedAnswer.text), `${url}: FAQ matches visible answer`);
  }
  console.log(`PASS ${url} (${index ? 'index' : 'noindex'})`);
}

pageCheck(await read(company, '/'), company + '/', true, true);
for (const page of PUBLIC_PAGES) pageCheck(await read(studio, page.path), studio + page.path, true, true);
for (const origin of [company, studio]) {
  const robots = await read(origin, '/robots.txt');
  for (const bot of AI_CRAWLERS) check(new RegExp(`User-[Aa]gent: ${bot}\\s+Allow: /`).test(robots), `${origin}: explicit allowance for ${bot}`);
  check(robots.includes(`Sitemap: ${origin}/sitemap.xml`), `${origin}: sitemap discovery`);
  const sitemap = await read(origin, '/sitemap.xml');
  const expected = origin === company ? [origin + '/'] : PUBLIC_PAGES.map(page => origin + page.path);
  const urls = [...sitemap.matchAll(/<loc>(.*?)<\/loc>/g)].map(match => new URL(match[1]).href);
  check(JSON.stringify(urls.sort()) === JSON.stringify(expected.map(url => new URL(url).href).sort()), `${origin}: sitemap contains only canonical public pages`);
  check(!/login|checkout|oauth|profile|settings/.test(sitemap), `${origin}: no private sitemap entries`);
  for (const path of ['/llms.txt', '/llms-full.txt']) {
    const body = await read(origin, path);
    check(body.includes('Snowlink Studio') && body.includes('출시 예정') && body.includes('목업'), `${origin}${path}: current product scope`);
  }
  if (!local) {
    const image = await fetch(origin + '/opengraph-image', { signal: AbortSignal.timeout(25000) });
    check(image.status === 200 && image.headers.get('content-type')?.includes('image/png'), `${origin}: share image HTTP 200`);
    const bytes = Buffer.from(await image.arrayBuffer());
    check(bytes.readUInt32BE(16) === 1200 && bytes.readUInt32BE(20) === 630, `${origin}: share image 1200×630`);
  }
}
if (!local) {
  for (const path of ['/board', '/characters', '/scenarios', '/ima2', '/shortgpt', '/trends', '/login', '/settings', '/profile', '/checkout', '/explore/moon-post-office', '/creators/moon-writer', '/ima2/graph/seo-audit', '/settings/google/success', '/oauth/seo-audit']) pageCheck(await read(studio, path, false), studio + path, false);
  for (const path of ['/?utm_source=audit', '/checkout?plan=pro&cycle=yearly']) {
    const html = await read(studio, path, !path.startsWith('/checkout'));
    const canonical = [...html.matchAll(/<link\b[^>]*>/g)].map(match => attrs(match[0])).find(link => link.rel === 'canonical')?.href;
    check(new URL(canonical).href === new URL(studio + path.split('?')[0]).href, `${path}: query-free canonical`);
  }
  const redirect = await fetch(studio + '/explore', { redirect: 'manual', signal: AbortSignal.timeout(25000) });
  check(redirect.status === 308 && new URL(redirect.headers.get('location'), studio).href === studio + '/', 'legacy explore redirects permanently');
  for (const path of ['/explore/missing-seo-audit', '/creators/missing-seo-audit']) {
    const response = await fetch(studio + path, { headers: { 'User-Agent': 'Googlebot' }, signal: AbortSignal.timeout(25000) });
    check(response.status === 404, `${path}: missing fixtures return HTTP 404`);
  }
  for (const origin of [company, studio]) for (const userAgent of ['OAI-SearchBot', 'Claude-SearchBot']) {
    const response = await fetch(origin, { headers: { 'User-Agent': userAgent }, signal: AbortSignal.timeout(25000) });
    check(response.status === 200 && (await response.text()).includes('Snowlink Studio'), `${origin}: public HTML accessible to ${userAgent}`);
  }
}
console.log(`PASS: ${assertions} technical assertions (${local ? 'built HTML' : 'deployed HTML'}). This is not a Lighthouse or GEO score.`);
