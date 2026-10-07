import { readFile, stat } from 'node:fs/promises';
import { resolve, join, extname } from 'node:path';
import { json } from './http.mjs';
import { createModelSettings } from './modelSettings.mjs';

const TYPES = { '.html': 'text/html; charset=utf-8', '.css': 'text/css; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.json': 'application/json', '.svg': 'image/svg+xml', '.png': 'image/png', '.jpg': 'image/jpeg', '.webp': 'image/webp', '.woff2': 'font/woff2', '.woff': 'font/woff', '.ico': 'image/x-icon' };
export function createToolFrontend({ root, dataDir, config, id, parentOrigins, discovery }) {
  const frontend = join(root, 'vendor', id === 'ima2' ? 'ima2-ui/dist' : 'trend-ui');
  const preferences = createModelSettings(config, dataDir);
  return async (req, res) => {
    const url = new URL(req.url, 'http://localhost');
    if (id === 'ima2' && url.pathname === '/') {
      const remote = req.headers.host === new URL(config.tools.ima2.publicOrigin).host;
      res.writeHead(302, { Location: (remote ? config.publicOrigin : `http://127.0.0.1:${config.port}`) + '/#ima2', 'Cache-Control': 'no-store' }); res.end(); return true;
    }
    if (/^\/(api|generated|uploads|output|outputs)(\/|$)/.test(url.pathname)) return false;
    if (!['GET', 'HEAD'].includes(req.method)) { json(res, 405, { error: 'Method not allowed' }); return true; }
    if (url.pathname === '/_studio/preferences') { json(res, 200, preferences.read()); return true; }
    if (url.pathname === '/_studio/discovery' && discovery) { json(res, 200, await discovery(url.searchParams)); return true; }
    let base = frontend;
    let pathname = decodeURIComponent(url.pathname === '/' ? '/index.html' : url.pathname);
    if (pathname === '/_studio/tokens.css') { base = join(root, 'public/styles'); pathname = '/tokens.css'; }
    if (pathname === '/_studio/theme.css') { base = join(root, 'public/styles'); pathname = `/tool-${id}.css`; }
    const file = resolve(base, '.' + pathname);
    if (!file.startsWith(resolve(base) + '/')) { json(res, 404, { error: 'Not found' }); return true; }
    try {
      if (!(await stat(file)).isFile()) { json(res, 404, { error: 'Not found' }); return true; }
      const body = await readFile(file);
      res.setHeader('Content-Security-Policy', `frame-ancestors ${parentOrigins.join(' ')}; base-uri 'self'`);
      res.writeHead(200, { 'Content-Type': TYPES[extname(file)] || 'application/octet-stream', 'Content-Length': body.length, 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff', 'Referrer-Policy': 'strict-origin-when-cross-origin' });
      res.end(req.method === 'HEAD' ? undefined : body);
    } catch (error) {
      if (error.code !== 'ENOENT') throw error;
      json(res, 404, { error: '프런트엔드 파일이 없습니다. npm run ui:build를 실행해주세요.' });
    }
    return true;
  };
}
