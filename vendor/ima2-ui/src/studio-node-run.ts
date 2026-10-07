import type { AppState } from './store/storeTypes';
import { mapSessionToGraph } from './store/storeGraphSave';

const active = new Set<string>();
async function action(name: string, args: Record<string, unknown>): Promise<any> {
  const response = await fetch('/api/studio/actions', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name, arguments: args }), signal: AbortSignal.timeout(45000) });
  const data = await response.json();
  if (!response.ok) throw new Error(data.error || '제작 요청에 실패했습니다.');
  return data;
}
export async function runStudioNode(id: string, set: (value: Partial<AppState>) => void, get: () => AppState): Promise<string | null> {
  const sessionId = get().activeSessionId, key = `${sessionId}:${id}`;
  if (!sessionId || active.has(key)) return null;
  active.add(key);
  set({ activeGenerations: get().activeGenerations + 1 });
  try {
    await get().flushGraphSave();
    const version = get().activeSessionGraphVersion;
    if (version === null) throw new Error('노드 작업실을 다시 불러와주세요.');
    const original = get().graphNodes.find(n => n.id === id)?.data;
    const prompt = original?.prompt;
    let job = await action('studio_graph_run', { sessionId, nodeId: id, graphVersion: version, idempotencyKey: crypto.randomUUID() });
    get().showToast('장면을 생성하고 있습니다. 시나리오 화면에서도 작업 상태를 확인할 수 있습니다.');
    const started = Date.now();
    while (['queued', 'running', 'checking'].includes(job.status) && Date.now() - started < 20 * 60 * 1000) {
      await new Promise(resolve => setTimeout(resolve, 4000));
      job = await action('studio_job', { id: job.id });
    }
    if (job.status !== 'done') { get().showToast(job.message || '시나리오 화면에서 생성 결과를 확인해주세요.', true); return null; }
    if (job.attached && get().activeSessionId === sessionId) {
      const session = await action('studio_graphs', { sessionId });
      const mapped = mapSessionToGraph(session);
      const result = mapped.graphNodes.find(n => n.id === id);
      // Preserve local positions/other edits; only merge this unchanged prompt's result.
      const current = get().graphNodes.find(n => n.id === id)?.data;
      if (result && current?.prompt === prompt && current?.imageUrl === original?.imageUrl && session.graphVersion === (get().activeSessionGraphVersion ?? -1) + 1) {
        set({ activeSessionGraphVersion: session.graphVersion, graphNodes: get().graphNodes.map(n => n.id === id ? { ...n, data: result.data } : n) });
      }
    }
    get().showToast(job.message);
    return job.result?.nodeId || (job.attached ? id : null);
  } catch (error) {
    get().showToast(error instanceof Error ? error.message : '생성 상태를 확인하지 못했습니다. 시나리오 화면에서 확인해주세요.', true); return null;
  } finally { active.delete(key); set({ activeGenerations: Math.max(0, get().activeGenerations - 1) }); }
}
