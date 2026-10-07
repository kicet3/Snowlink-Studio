import { mkdirSync, existsSync, readFileSync, writeFileSync, renameSync } from 'node:fs';
import { join } from 'node:path';
import { randomUUID } from 'node:crypto';

export function createStudioJobs(directory) {
  mkdirSync(directory, { recursive: true, mode: 0o700 });
  const file = join(directory, 'studio-jobs.json');
  let jobs = existsSync(file) ? JSON.parse(readFileSync(file, 'utf8')) : [];
  const persist = () => { writeFileSync(file + '.tmp', JSON.stringify(jobs, null, 2), { mode: 0o600 }); renameSync(file + '.tmp', file); };
  let changed = false;
  for (const job of jobs) if (['queued', 'running'].includes(job.status)) {
    job.status = job.kind === 'media' ? 'checking' : 'interrupted';
    job.message = job.kind === 'media' ? '서버 재시작 후 생성 결과를 확인해야 합니다. 자동 재요청하지 않습니다.' : '서버가 재시작되었습니다. 저장된 단계부터 다시 시작할 수 있습니다.';
    changed = true;
  }
  if (changed) persist();
  const read = id => { const job = jobs.find(item => item.id === id); if (!job) throw Object.assign(new Error('작업을 찾을 수 없습니다.'), { status: 404 }); return structuredClone(job); };
  return {
    list: () => structuredClone(jobs), read,
    create(kind, input = {}) {
      const job = { ...input, id: randomUUID(), kind, status: 'queued', createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(), steps: [] };
      jobs.push(job);
      // Keep generation idempotency keys/results across restarts and long histories.
      const terminal = jobs.filter(item => item.kind !== 'media' && !['queued', 'running', 'checking'].includes(item.status));
      if (terminal.length > 100) { const remove = new Set(terminal.slice(0, terminal.length - 100).map(item => item.id)); jobs = jobs.filter(item => !remove.has(item.id)); }
      persist(); return structuredClone(job);
    },
    update(id, patch) {
      const previous = read(id), next = { ...previous, ...patch, id, kind: previous.kind, updatedAt: new Date().toISOString() };
      jobs = jobs.map(job => job.id === id ? next : job); persist(); return structuredClone(next);
    },
  };
}
