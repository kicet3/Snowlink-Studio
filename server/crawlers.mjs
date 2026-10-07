import { readFileSync } from 'node:fs';

export const ROBOTS_TAG = 'noindex, nofollow, nosnippet, noimageindex';
const robots = readFileSync(new URL('../public/robots.txt', import.meta.url));

// Each public origin serves its own policy before login redirects or upstream proxying.
export function handleRobots(req, res) {
  if (new URL(req.url, 'http://localhost').pathname !== '/robots.txt') return false;
  if (!['GET', 'HEAD'].includes(req.method)) {
    res.writeHead(405, { Allow: 'GET, HEAD' }); res.end(); return true;
  }
  res.writeHead(200, { 'Content-Type': 'text/plain; charset=utf-8', 'Content-Length': robots.length, 'Cache-Control': 'no-store' });
  res.end(req.method === 'HEAD' ? undefined : robots);
  return true;
}
