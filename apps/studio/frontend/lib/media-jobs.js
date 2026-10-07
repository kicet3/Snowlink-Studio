import { toolApi, toolPath } from './integration-api.js';
import { mediaAssets, updateJob } from './media-data.js';

const KEY = 'snowfall-studio.media-jobs.v1';
export const jobs = new Map();
let channel;
let syncing = false;
let initialized = false;
function changed() {
  try { localStorage.setItem(KEY, JSON.stringify([...jobs.values()].slice(-24))); } catch { /* Browser storage can be disabled; the server retains results. */ }
  document.dispatchEvent(new Event('media-jobs-updated'));
}
export function initializeJobs() {
  if (initialized) return; initialized = true;
  try {
    const stored = JSON.parse(localStorage.getItem(KEY) || '[]');
    if (Array.isArray(stored)) stored.filter(j => typeof j.id === 'string' && j.id.length < 100).forEach(j => jobs.set(j.id, j.status === 'submitting' ? { ...j, status: 'checking' } : j));
  } catch { /* A damaged local cache does not prevent opening the studio. */ }
  channel = new EventSource(toolPath('ima2', '/api/events'));
  for (const event of ['phase', 'image', 'done', 'error', 'submitted', 'progress', 'planning']) channel.addEventListener(event, message => {
    if (!message.data) return;
    try {
      const data = JSON.parse(message.data); const id = data.jobId || data.requestId;
      if (!jobs.has(id)) return;
      jobs.set(id, updateJob(jobs.get(id), event, data)); changed();
    } catch { /* A malformed SSE message is recovered from server snapshots. */ }
  });
  channel.addEventListener('open', () => void reconcileJobs());
  channel.addEventListener('replay-gap', () => void reconcileJobs());
  setInterval(() => { if (!document.hidden && [...jobs.values()].some(j => !['done', 'error', 'canceled'].includes(j.status))) void reconcileJobs(); }, 15000);
  void reconcileJobs(); changed();
}
async function waitForChannel() {
  if (channel.readyState === EventSource.OPEN) return;
  await new Promise((resolve, reject) => {
    const finish = () => { clearTimeout(timer); channel.removeEventListener('open', ready); };
    const ready = () => { finish(); resolve(); };
    const timer = setTimeout(() => { finish(); reject(new Error('진행 상황 채널에 연결하지 못했습니다. 잠시 후 다시 시도해주세요.')); }, 10000);
    channel.addEventListener('open', ready);
  });
}
export async function submitJob(request, mode, prompt) {
  await waitForChannel();
  const id = request.body.requestId;
  jobs.set(id, { id, mode, prompt, status: 'submitting', message: '요청을 보내고 있습니다', assets: [], createdAt: Date.now() }); changed();
  try {
    const result = await toolApi('ima2', request.endpoint, { method: 'POST', body: request.body, timeout: mode === 'edit' ? 900000 : 120000 });
    const job = jobs.get(id);
    if (result.filename || result.images) jobs.set(id, updateJob(job, 'done', result));
    else if (!['done', 'error'].includes(job.status)) jobs.set(id, { ...job, status: 'running', message: '생성 작업 진행 중' });
  } catch (error) {
    // A lost POST response does not prove the generation failed. Never auto-submit again.
    const job = jobs.get(id);
    if (!['done', 'error'].includes(job.status)) jobs.set(id, { ...job, status: error.status && error.status < 500 ? 'error' : 'checking', message: error.status && error.status < 500 ? error.message : `${error.message} 결과 확인 버튼으로 서버 상태를 확인해주세요.` });
  }
  changed(); void reconcileJobs();
}
export async function cancelJob(id) {
  await toolApi('ima2', `/api/inflight/${encodeURIComponent(id)}`, { method: 'DELETE' });
  await reconcileJobs();
}
export async function reconcileJobs() {
  if (syncing) return; syncing = true;
  try {
    const snapshot = await toolApi('ima2', '/api/inflight?includeTerminal=1', { timeout: 20000 });
    for (const [id, job] of jobs) {
      if (['done', 'error', 'canceled', 'submitting'].includes(job.status)) continue;
      const active = snapshot.jobs?.find(j => j.requestId === id);
      const terminal = snapshot.terminalJobs?.find(j => j.requestId === id);
      if (active) { jobs.set(id, { ...job, status: 'running', message: '서버에서 생성 작업이 진행 중입니다' }); continue; }
      if (terminal && terminal.status !== 'completed') {
        jobs.set(id, { ...job, status: terminal.status === 'canceled' ? 'canceled' : 'error', message: terminal.status === 'canceled' ? '생성을 취소했습니다.' : `생성 실패 · ${terminal.errorCode || terminal.status}` }); continue;
      }
      const result = await toolApi('ima2', `/api/history?limit=30&requestId=${encodeURIComponent(id)}`);
      if (jobs.get(id) !== job) continue;
      const assets = mediaAssets(result);
      if (assets.length) jobs.set(id, { ...job, status: 'done', message: '제작 완료', assets });
      else jobs.set(id, { ...job, status: 'checking', message: '서버에 확인되는 결과가 없습니다. 생성 기록을 확인해주세요. 자동으로 재요청하지 않습니다.' });
    }
    changed();
  } catch { /* SSE reconnect/poll will retry only status reads, never generation. */ }
  finally { syncing = false; }
}
