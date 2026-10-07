import { spawn } from 'node:child_process';
import { existsSync, openSync, closeSync } from 'node:fs';
import { join } from 'node:path';
import { setTimeout as delay } from 'node:timers/promises';

export async function probe(id, tool) {
  try {
    const path = id === 'ima2' ? '/api/health' : '/api/categories';
    const response = await fetch(tool.target + path, { signal: AbortSignal.timeout(2000) });
    const data = await response.json();
    const online = response.ok && (id === 'ima2' ? data.ok === true && !!data.version : Array.isArray(data.categories));
    return { online, ...(online && data.version ? { version: data.version } : {}) };
  } catch { return { online: false }; }
}

export async function ensureServices(config, dataDir, internalAiUrl = `http://127.0.0.1:${config.port}/v1`) {
  const owned = [];
  for (const [id, tool] of Object.entries(config.tools)) {
    if ((await probe(id, tool)).online) continue;
    const entry = join(tool.directory, id === 'ima2' ? 'bin/ima2.js' : 'src/main.py');
    if (!existsSync(entry)) { console.warn(`[${id}] 실행 파일 없음: ${entry}`); continue; }
    const fd = openSync(join(dataDir, `${id}.log`), 'a');
    const command = id === 'ima2' ? process.execPath : (process.env.PYTHON || config.shortgpt?.python || 'python3');
    const args = id === 'ima2' ? [entry, 'start', '--port', new URL(tool.target).port] : ['-u', entry];
    const child = spawn(command, args, { cwd: tool.directory, stdio: ['ignore', fd, fd], env: {
      ...process.env, ...(id === 'trends' ? { TREND_VIEWER_PORT: new URL(tool.target).port, TREND_ANALYSIS_BASE_URL: internalAiUrl, TREND_ANALYSIS_MODEL: 'studio-default' } : {}),
    } });
    closeSync(fd);
    if (id === 'trends') owned.push(child);
    child.on('error', error => console.error(`[${id}] ${error.message}`));
    child.on('exit', code => { if (code) console.warn(`[${id}] 종료 코드 ${code}`); });
  }
  // Readiness is also reflected live in the UI; slow/offline tools don't hide the board.
  await delay(600);
  return () => owned.forEach(child => { if (child.exitCode === null) child.kill('SIGTERM'); });
}
