import { mkdirSync, writeFileSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { randomUUID } from 'node:crypto';
import http from 'node:http';
import { config, ROOT, DATA, origins, toolUrls, metaCredentials, googleCredentials } from './config.mjs';
import { createApp } from './app.mjs';
import { ensureServices } from './services.mjs';
import { authorize } from './http.mjs';
import { createAuth } from './auth.mjs';
import { createProxy } from './proxy.mjs';
import { createToolFrontend } from './toolFrontend.mjs';
import { createDiscovery } from './discovery.mjs';
import { handleScopedIntegration } from './scopedIntegration.mjs';
import { ROBOTS_TAG, handleRobots } from './crawlers.mjs';

mkdirSync(DATA, { recursive: true, mode: 0o700 });
const bootId = randomUUID();
const servers = [];
let stopServices = () => {};
let stopping = false;
let ownsRuntime = false;
const runtimeFile = join(DATA, 'runtime.json');
function shutdown() {
  if (stopping) return;
  stopping = true;
  stopServices();
  for (const server of servers) { server.close(); server.closeAllConnections(); }
  if (ownsRuntime) rmSync(runtimeFile, { force: true });
  setTimeout(() => process.exit(process.exitCode || 0), 300).unref();
}
process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);

async function listen(server, port) {
  servers.push(server);
  await new Promise((resolve, reject) => {
    server.once('error', reject);
    server.listen(port, '127.0.0.1', resolve);
  });
}

try {
  const auth = createAuth(DATA);
  const app = createApp({ root: ROOT, dataDir: DATA, config, allowedOrigins: origins(config), toolUrls, bootId, metaCredentials, googleCredentials, auth });
  await listen(app, config.port);
  const localAi = http.createServer(app.handleLocalAi);
  await listen(localAi, 0);
  const discovery = createDiscovery(config);
  for (const [id, tool] of Object.entries(config.tools)) {
    if (id === 'trends') {
      const frontends = new Map();
      await listen(createProxy({ target: tool.target, allowedOrigins: origins(tool), parentOrigins: origins(config), frontend: async (req, res) => {
        const account = auth.user(req);
        if (!account) { res.writeHead(302, { Location: config.publicOrigin || `http://127.0.0.1:${config.port}`, 'Cache-Control': 'no-store' }); res.end(); return true; }
        const url = new URL(req.url, 'http://localhost');
        if (url.pathname.startsWith('/api/')) {
          url.pathname = '/integrations/trends' + url.pathname;
          return handleScopedIntegration(req, res, url, config, { account });
        }
        if (!frontends.has(account.id)) frontends.set(account.id, createToolFrontend({ root: ROOT, dataDir: auth.dataDirectory(account), config, id, parentOrigins: origins(config), discovery }));
        return frontends.get(account.id)(req, res);
      } }), tool.port);
      continue;
    }
    // Legacy public tool ports must not bypass workspace authentication.
    await listen(http.createServer((req, res) => {
      res.setHeader('X-Robots-Tag', ROBOTS_TAG);
      try {
        authorize(req, origins(tool));
        if (handleRobots(req, res)) return;
        const remote = tool.publicOrigin && req.headers.host === new URL(tool.publicOrigin).host;
        const base = remote ? config.publicOrigin : `http://127.0.0.1:${config.port}`;
        const url = new URL(req.url, 'http://localhost');
        const path = /^\/(api|generated)\//.test(url.pathname) ? `/integrations/${id}${url.pathname}${url.search}` : `/#${id}`;
        res.writeHead(307, { Location: base + path, 'Cache-Control': 'no-store' }); res.end();
      } catch { res.writeHead(403); res.end(); }
    }), tool.port);
  }
  writeFileSync(runtimeFile, JSON.stringify({ pid: process.pid, bootId, root: ROOT }), { mode: 0o600 });
  ownsRuntime = true;
  stopServices = await ensureServices(config, DATA, `http://127.0.0.1:${localAi.address().port}/v1`);
  console.log(`snowlink-studio: http://127.0.0.1:${config.port}`);
  console.log(`Tailscale: ${config.publicOrigin}`);
} catch (error) {
  console.error(error);
  shutdown();
  process.exitCode = 1;
}
