import { spawn } from 'node:child_process';
import { mkdirSync, openSync, closeSync, readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { setTimeout as delay } from 'node:timers/promises';
import { config, DATA, ROOT } from '../server/config.mjs';

async function health() {
  try {
    const response = await fetch(`http://127.0.0.1:${config.port}/api/health`, { signal: AbortSignal.timeout(1200) });
    const body = await response.json();
    // Accept the previous name so an already-running server can be restarted after rebranding.
    if (!['snowlink-studio', 'snowfall-studio'].includes(body.app) || body.root !== ROOT) throw new Error('이 포트에서 다른 서버가 실행 중입니다.');
    return body;
  } catch (error) {
    if (error.cause?.code === 'ECONNREFUSED') return null;
    throw error;
  }
}

try {
  const command = process.argv[2] || 'status';
  const current = await health();
  if (command === 'status') console.log(current ? `실행 중 · http://localhost:${config.port} · PID ${current.pid}` : '중지됨');
  else if (command === 'stop') {
    if (!current) console.log('이미 중지됐습니다.');
    else {
      const runtime = JSON.parse(readFileSync(join(DATA, 'runtime.json'), 'utf8'));
      if (runtime.bootId !== current.bootId || runtime.pid !== current.pid) throw new Error('프로세스 정보가 달라 중지하지 않았습니다.');
      process.kill(current.pid, 'SIGTERM');
      console.log('통합 작업실을 종료합니다. 기존에 실행 중이던 도구는 유지됩니다.');
    }
  } else if (command === 'start') {
    if (current) console.log(`이미 실행 중입니다: http://localhost:${config.port}`);
    else {
      mkdirSync(DATA, { recursive: true, mode: 0o700 });
      const fd = openSync(join(DATA, 'server.log'), 'a');
      const child = spawn(process.execPath, [join(ROOT, 'server/main.mjs')], { cwd: ROOT, detached: true, stdio: ['ignore', fd, fd] });
      closeSync(fd);
      child.unref();
      child.on('error', error => { console.error(error.message); process.exitCode = 1; });
      let ready;
      for (let i = 0; i < 60; i++) {
        await delay(250);
        ready = await health();
        if (ready) break;
        if (child.exitCode !== null) break;
      }
      if (!ready) throw new Error(`서버 시작 실패. 로그: ${join(DATA, 'server.log')}`);
      console.log(`실행 완료: http://localhost:${config.port}\nTailscale: ${config.publicOrigin}`);
    }
  } else throw new Error('사용법: npm run start | stop | status');
} catch (error) { console.error(error.message); process.exitCode = 1; }
