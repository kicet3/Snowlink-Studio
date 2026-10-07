import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { serveStdio } from '@modelcontextprotocol/server/stdio';
import { studioMcpServer } from '../server/mcpServer.mjs';
import { config, DATA } from '../server/config.mjs';

const base = new URL(process.env.SNOWFALL_STUDIO_URL || `http://127.0.0.1:${config.port}`);
if (!(base.protocol === 'https:' || base.protocol === 'http:' && ['127.0.0.1', 'localhost'].includes(base.hostname)) || base.username || base.password) throw new Error('MCP 연결은 로컬 HTTP 또는 HTTPS 주소를 사용해주세요.');
const handle = serveStdio(() => studioMcpServer(async (name, args) => {
  let token;
  try { token = process.env.SNOWFALL_MCP_TOKEN || readFileSync(join(DATA, 'mcp-token'), 'utf8').trim(); }
  catch { throw Object.assign(new Error('snowlink-studio를 먼저 시작해주세요: npm start'), { status: 503 }); }
  const response = await fetch(new URL('/api/mcp/execute', base), { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` }, body: JSON.stringify({ name, arguments: args }), signal: AbortSignal.timeout(140000), redirect: 'error' });
  const result = await response.json();
  if (!response.ok) throw Object.assign(new Error(result.error || '작업실 연결에 실패했습니다.'), { status: response.status });
  return result;
}), { onerror: () => console.error('MCP 통신 오류가 발생했습니다.') });
process.once('SIGTERM', () => void handle.close());
process.once('SIGINT', () => void handle.close());
