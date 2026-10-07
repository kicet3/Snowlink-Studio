import { spawn } from 'node:child_process';
import { mkdirSync, writeFileSync, openSync, closeSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { randomUUID } from 'node:crypto';

export function createRenderer(config, root, dataDir) {
  const jobs = new Map();
  let active = false;
  return { status: id => jobs.get(id), start(production, edit, characters) {
    if (active) throw Object.assign(new Error('콘티를 출력 중입니다. 완료 후 다시 시도해주세요.'), { status: 409 });
    if (!edit.cuts.length) throw Object.assign(new Error('먼저 컷을 구성해주세요.'), { status: 400 });
    if (!existsSync(config.shortgpt.python)) throw Object.assign(new Error('ShortGPT Python 환경이 설치되지 않았습니다.'), { status: 503 });
    const id = randomUUID();
    const dir = join(dataDir, 'renders', id);
    mkdirSync(dir, { recursive: true, mode: 0o700 });
    const cuts = edit.cuts.map(cut => {
      const sheet = characters.find(c => c.id === cut.characterId)?.image;
      return { ...cut, image: sheet ? join(dataDir, sheet.slice(1)) : null };
    });
    const manifest = join(dir, 'manifest.json');
    writeFileSync(manifest, JSON.stringify({ format: production.format, cuts }), { mode: 0o600 });
    const fd = openSync(join(dir, 'render.log'), 'a');
    const child = spawn(config.shortgpt.python, [join(root, 'scripts/render_shortgpt.py'), config.shortgpt.directory, manifest, join(dir, 'storyboard.mp4')], { stdio: ['ignore', fd, fd] });
    closeSync(fd);
    active = true;
    const job = { id, state: 'rendering', productionId: production.id, revision: edit.revision, startedAt: new Date().toISOString() };
    jobs.set(id, job);
    while (jobs.size > 50) jobs.delete(jobs.keys().next().value);
    const timer = setTimeout(() => child.kill('SIGTERM'), 300000);
    child.on('error', () => { job.state = 'failed'; job.error = '렌더러를 실행하지 못했습니다.'; active = false; clearTimeout(timer); });
    child.on('exit', code => {
      clearTimeout(timer); active = false;
      job.state = code === 0 ? 'done' : 'failed';
      if (code === 0) job.url = `/renders/${id}/storyboard.mp4`;
      else job.error = '콘티 출력에 실패했습니다. .data/renders 폴더의 render.log를 확인해주세요.';
    });
    return job;
  } };
}
