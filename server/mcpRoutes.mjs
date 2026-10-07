import { existsSync, readFileSync, writeFileSync, chmodSync } from 'node:fs';
import { join } from 'node:path';
import { randomBytes, timingSafeEqual } from 'node:crypto';
import { createMcpHandler } from '@modelcontextprotocol/server';
import { toNodeHandler } from '@modelcontextprotocol/node';
import { studioMcpServer } from './mcpServer.mjs';
import { studioToolDefinitions } from './studioTools.mjs';
import { json, readJson } from './http.mjs';

export function createMcpRoutes({ root, dataDir, config, actions, account }) {
  const file = join(dataDir, 'mcp-token');
  if (!existsSync(file)) writeFileSync(file, randomBytes(32).toString('base64url'), { mode: 0o600, flag: 'wx' });
  chmodSync(file, 0o600);
  const token = readFileSync(file, 'utf8').trim();
  const handler = createMcpHandler(() => studioMcpServer(actions.execute), { responseMode: 'json', maxRequestBodySize: 9 * 1024 * 1024 });
  const nodeHandler = toNodeHandler(handler);
  function authenticated(req) {
    const candidate = Buffer.from(String(req.headers.authorization || '').replace(/^Bearer /, ''));
    const expected = Buffer.from(token);
    return req.headers.authorization?.startsWith('Bearer ') && expected.length === candidate.length && timingSafeEqual(candidate, expected);
  }
  return {
    close: () => handler.close(),
    async handle(req, res, url, authorized = false) {
      if (url.pathname === '/mcp' || url.pathname === '/api/mcp/execute') {
        if (!authorized && !authenticated(req)) { res.setHeader('WWW-Authenticate', 'Bearer realm="snowlink-studio"'); json(res, 401, { error: 'MCP 로그인이 필요합니다.' }); return true; }
        if (url.pathname === '/mcp') await nodeHandler(req, res);
        else if (req.method === 'POST') { const body = await readJson(req); json(res, 200, await actions.execute(body.name, body.arguments)); }
        else json(res, 405, { error: 'POST 요청이 필요합니다.' });
        return true;
      }
      if (url.pathname === '/api/mcp/status' && req.method === 'GET') {
        json(res, 200, { enabled: true, endpoint: (config.publicOrigin || `http://127.0.0.1:${config.port || 3400}`) + '/mcp', authentication: 'OAuth 2.1 + PKCE', toolCount: Object.keys(studioToolDefinitions).length, stdio: { command: process.execPath, args: [join(root, 'scripts/mcp-stdio.mjs')], ...(account?.role === 'member' ? { env: { SNOWFALL_DATA_DIR: dataDir } } : {}) }, note: 'Claude와 Codex에서 URL을 등록한 뒤 웹 계정으로 로그인하고 접근을 승인합니다. 연결 해제는 이 화면에서 할 수 있습니다.' }); return true;
      }
      // Token disclosure is an explicit same-origin UI action, never an MCP tool/resource.
      if (url.pathname === '/api/mcp/token' && req.method === 'POST') { json(res, 200, { token }); return true; }
      if (url.pathname === '/api/studio/actions' && req.method === 'POST') {
        const body = await readJson(req); json(res, 200, await actions.execute(body.name, body.arguments)); return true;
      }
      return false;
    },
  };
}
