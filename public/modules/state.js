export const state = { characters: [], productions: [], connections: {}, loaded: false };
export async function api(path, method = 'GET', body) {
  const response = await fetch(path, { method, headers: body ? { 'Content-Type': 'application/json' } : {}, body: body ? JSON.stringify(body) : undefined, signal: AbortSignal.timeout(path.endsWith('/chat') ? 135000 : path.startsWith('/api/google/') ? 45000 : 20000) });
  const data = await response.json();
  if (!response.ok) throw new Error(data.error || '요청을 완료하지 못했습니다.');
  return data;
}
export async function refresh() {
  Object.assign(state, await api('/api/workspace'), { loaded: true });
  document.dispatchEvent(new Event('workspace-updated'));
}
export async function save(kind, values, existing) {
  await api(`/api/${kind}${existing ? '/' + existing.id : ''}`, existing ? 'PUT' : 'POST', { ...existing, ...values });
  await refresh();
}
