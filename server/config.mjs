import { readFileSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { resolve, join } from 'node:path';
import { loadMetaCredentials } from './meta.mjs';
import { loadGoogleCredentials } from './google.mjs';

export const ROOT = fileURLToPath(new URL('../', import.meta.url));
export const metaCredentials = loadMetaCredentials(join(ROOT, '.env'));
export const googleCredentials = loadGoogleCredentials(join(ROOT, '.env'));
const base = JSON.parse(readFileSync(join(ROOT, 'config.json'), 'utf8'));
const localPath = join(ROOT, 'config.local.json');
const local = existsSync(localPath) ? JSON.parse(readFileSync(localPath, 'utf8')) : {};
export const config = { ...base, ...local, tools: { ...base.tools } };
for (const id of Object.keys(base.tools)) {
  config.tools[id] = { ...base.tools[id], ...local.tools?.[id] };
  config.tools[id].directory = resolve(ROOT, config.tools[id].directory);
  const target = new URL(config.tools[id].target);
  if (target.protocol !== 'http:' || !['127.0.0.1', 'localhost'].includes(target.hostname)) {
    throw new Error('도구 서버는 로컬 HTTP 주소를 사용해야 합니다.');
  }
}
export const DATA = process.env.SNOWFALL_DATA_DIR || join(ROOT, '.data');
config.ai = { ...base.ai, ...local.ai };
config.shortgpt = { ...base.shortgpt, ...local.shortgpt };
config.shortgpt.directory = resolve(ROOT, config.shortgpt.directory);
config.shortgpt.python = resolve(ROOT, config.shortgpt.python);
export const origins = item => [`http://127.0.0.1:${item.port}`, `http://localhost:${item.port}`, item.publicOrigin].filter(Boolean);
export function toolUrls(host) {
  const remote = config.publicOrigin && host === new URL(config.publicOrigin).host;
  const hostname = host?.startsWith('localhost:') ? 'localhost' : '127.0.0.1';
  return Object.fromEntries(Object.entries(config.tools).map(([id, tool]) => [id, remote ? tool.publicOrigin : `http://${hostname}:${tool.port}`]));
}
