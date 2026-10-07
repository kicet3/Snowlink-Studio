import http from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import { join, extname, resolve } from 'node:path';
import { authorize, readJson, json, failure } from './http.mjs';
import { createStore, saveImage } from './store.mjs';
import { probe } from './services.mjs';
import { createAi } from './ai.mjs';
import { createCutStore } from './cuts.mjs';
import { handleAi } from './aiRoutes.mjs';
import { createRenderer } from './render.mjs';
import { handleIntegration } from './integrations.mjs';
import { metaSetupStatus } from './meta.mjs';
import { createGoogleConnection } from './google.mjs';
import { handleGoogle } from './googleRoutes.mjs';
import { createCharacterTemplates } from './characterTemplates.mjs';
import { handleCharacterStudio } from './characterStudio.mjs';
import { createStudioActions } from './studioActions.mjs';
import { createMcpRoutes } from './mcpRoutes.mjs';
import { createAuth } from './auth.mjs';
import { createMediaOwnership } from './mediaOwnership.mjs';
import { handleScopedIntegration } from './scopedIntegration.mjs';
import { createMcpOAuth } from './mcpOAuth.mjs';
import { ROBOTS_TAG, handleRobots } from './crawlers.mjs';

const TYPES = { '.html': 'text/html; charset=utf-8', '.css': 'text/css; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.json': 'application/json', '.woff2': 'font/woff2', '.woff': 'font/woff', '.svg': 'image/svg+xml', '.png': 'image/png', '.jpg': 'image/jpeg', '.webp': 'image/webp', '.mp4': 'video/mp4' };
async function staticFile(res, root, pathname) {
  const file = resolve(root, '.' + pathname);
  if (!file.startsWith(resolve(root) + '/')) return json(res, 404, { error: 'Not found' });
  try {
    const info = await stat(file);
    if (!info.isFile()) return json(res, 404, { error: 'Not found' });
    const body = await readFile(file);
    res.writeHead(200, { 'Content-Type': TYPES[extname(file)] || 'application/octet-stream', 'Content-Length': body.length, 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff' });
    res.end(body);
  } catch (error) { if (error.code === 'ENOENT') json(res, 404, { error: 'Not found' }); else throw error; }
}

export function createApp({ root, dataDir, config, allowedOrigins, toolUrls, bootId, metaCredentials, googleCredentials, googleFetch, ai: suppliedAi, auth: suppliedAuth, testAuthBypass = false }) {
  const auth = suppliedAuth || createAuth(dataDir);
  const oauth = createMcpOAuth({ directory: dataDir, auth, allowedOrigins, frontendOrigin: config.frontendOrigin });
  const ownershipFor = createMediaOwnership(dataDir), contexts = new Map();
  function context(account) {
    if (contexts.has(account.id)) return contexts.get(account.id);
    const directory = testAuthBypass ? dataDir : auth.dataDirectory(account);
    const store = createStore(directory), ai = suppliedAi || createAi(config, directory);
    const templates = createCharacterTemplates(directory), cutStore = createCutStore(directory);
    const render = createRenderer(config, root, directory);
    const google = createGoogleConnection({ credentials: googleCredentials, dataDir: directory, allowedOrigins, fetchImpl: googleFetch,
      apiOrigin: config.publicOrigin, frontendOrigin: config.frontendOrigin });
    const ownership = ownershipFor(account);
    const actions = createStudioActions({ config, dataDir: directory, store, ai, templates, ownership });
    const mcp = createMcpRoutes({ root, dataDir: directory, config, actions, account });
    const value = { directory, store, ai, templates, cutStore, render, google, actions, mcp, ownership };
    contexts.set(account.id, value); return value;
  }
  const server = http.createServer(async (req, res) => {
    res.setHeader('X-Robots-Tag', ROBOTS_TAG);
    try {
      authorize(req, allowedOrigins, {
        frontendOrigins: [config.frontendOrigin, ...(config.frontendOrigins || [])].filter(Boolean) });
      if (handleRobots(req, res)) return;
      res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
      res.setHeader('X-Content-Type-Options', 'nosniff');
      const frames = Object.values(toolUrls(req.headers.host)).join(' ');
      res.setHeader('Content-Security-Policy', `default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob: https:; media-src 'self' blob: https:; connect-src 'self'; frame-src ${frames}; frame-ancestors 'none'; base-uri 'self'; form-action 'self'`);
      const url = new URL(req.url, 'http://localhost');
      if (config.backendOnly && !/^(\/api\/|\/v1\/|\/mcp(?:$|\/)|\/media\/|\/renders\/|\/generated\/|\/integrations\/|\/oauth\/|\/\.well-known\/oauth-)/.test(url.pathname)) {
        if (url.pathname === '/' && req.method === 'GET') {
          res.writeHead(302, { Location: config.frontendOrigin, 'Cache-Control': 'no-store' }); res.end(); return;
        }
        return json(res, 404, { error: 'API 서버입니다. Studio 웹에서 접속해주세요.' });
      }
      if (testAuthBypass && url.pathname === '/api/auth/session') return json(res, 200, { user: { id: 'test-owner', username: 'fixture', name: '테스트 작업실', role: 'admin' }, registration: false });
      if (await oauth.handle(req, res, url)) return;
      if (await auth.handle(req, res, url)) return;
      if (req.method === 'GET' && url.pathname === '/api/health') return json(res, 200, { app: 'snowlink-studio', ok: true, pid: process.pid, root, bootId });
      const protectedPath = /^(\/api\/|\/v1\/|\/mcp(?:$|\/)|\/media\/|\/renders\/|\/generated\/|\/integrations\/)/.test(url.pathname);
      const mcpRequest = url.pathname === '/mcp' || url.pathname === '/api/mcp/execute';
      const account = testAuthBypass ? { id: 'test-owner', role: 'admin', username: 'test-owner' } : mcpRequest ? oauth.bearerUser(req) || (url.pathname === '/api/mcp/execute' ? auth.bearerUser(req) : null) : auth.user(req);
      if (protectedPath && !account) { if (mcpRequest) oauth.challenge(req, res); return json(res, 401, { error: '로그인이 필요합니다.' }); }
      if (!protectedPath && !account) return await staticFile(res, join(root, 'public'), url.pathname === '/' ? '/index.html' : decodeURIComponent(url.pathname));
      const { directory, store, ai, templates, cutStore, render, google, mcp, ownership } = context(account);
      if (await mcp.handle(req, res, url, mcpRequest && !!account)) return;
      if (await handleGoogle(req, res, url, google, config.publicOrigin && req.headers.host === new URL(config.publicOrigin).host ? config.frontendOrigin : undefined)) return;
      if (url.pathname.startsWith('/generated/')) url.pathname = '/integrations/ima2' + url.pathname;
      if (testAuthBypass ? handleIntegration(req, res, url, config) : await handleScopedIntegration(req, res, url, config, ownership)) return;
      if (req.method === 'GET' && url.pathname.startsWith('/studio-media/')) return await staticFile(res, join(root, 'vendor/ima2-ui/dist'), decodeURIComponent(url.pathname.slice('/studio-media'.length)));
      if (req.method === 'GET' && url.pathname === '/api/meta/status') return json(res, 200, metaSetupStatus(metaCredentials));
      if (req.method === 'GET' && url.pathname === '/api/workspace') return json(res, 200, store.read());
      if (await handleAi(req, res, url.pathname, { ai, store, cutStore, render })) return;
      if (await handleCharacterStudio(req, res, url.pathname, { ai, templates, dataDir: directory })) return;
      const renderStatus = /^\/api\/renders\/([\w-]+)$/.exec(url.pathname);
      if (renderStatus && req.method === 'GET') {
        const job = render.status(renderStatus[1]);
        return json(res, job ? 200 : 404, job || { error: '출력 작업을 찾을 수 없습니다.' });
      }
      if (req.method === 'GET' && url.pathname === '/api/connections') {
        const entries = await Promise.all(Object.entries(config.tools).map(async ([id, tool]) => [id, { ...await probe(id, tool), name: tool.name, url: toolUrls(req.headers.host)[id] }]));
        return json(res, 200, Object.fromEntries(entries));
      }
      if (req.method === 'GET' && url.pathname === '/api/export') {
        res.setHeader('Content-Disposition', 'attachment; filename="snowlink-backup.json"');
        return json(res, 200, store.read());
      }
      if (req.method === 'POST' && url.pathname === '/api/media') {
        const body = await readJson(req);
        return json(res, 201, { image: saveImage(directory, body.data) });
      }
      const record = /^\/api\/(characters|productions)(?:\/([\w-]+))?$/.exec(url.pathname);
      if (record && (req.method === 'POST' && !record[2] || req.method === 'PUT' && record[2])) {
        return json(res, record[2] ? 200 : 201, store.upsert(record[1], await readJson(req), record[2]));
      }
      if (req.method !== 'GET' && req.method !== 'HEAD') return json(res, 405, { error: '허용되지 않은 요청입니다.' });
      if (url.pathname.startsWith('/api/')) return json(res, 404, { error: 'Not found' });
      if (/^\/media\/[\w-]+\.(png|jpg|webp)$/.test(url.pathname)) return await staticFile(res, directory, url.pathname);
      if (/^\/renders\/[\w-]+\/storyboard\.mp4$/.test(url.pathname)) return await staticFile(res, directory, url.pathname);
      return await staticFile(res, join(root, 'public'), url.pathname === '/' ? '/index.html' : decodeURIComponent(url.pathname));
    } catch (error) { failure(res, error); }
  });
  server.on('close', () => { for (const value of contexts.values()) void value.mcp.close(); });
  // Used only by a separate loopback listener, never routed from the public app.
  server.handleLocalAi = async (req, res) => {
    try {
      const url = new URL(req.url, 'http://localhost');
      if (req.headers.origin || req.headers['sec-fetch-site'] || !/^(127\.0\.0\.1|localhost)(:\d+)?$/.test(req.headers.host || '') || !['/v1/responses', '/v1/chat/completions'].includes(url.pathname)) return json(res, 403, { error: '로컬 서비스 전용 연결입니다.' });
      const account = auth.admin(); if (!account) return json(res, 503, { error: '관리자 계정이 필요합니다.' });
      const { ai, store, cutStore, render } = context(account);
      if (!await handleAi(req, res, url.pathname, { ai, store, cutStore, render })) json(res, 404, { error: 'Not found' });
    } catch (error) { failure(res, error); }
  };
  return server;
}
