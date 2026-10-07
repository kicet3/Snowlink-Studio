export async function studioAction(name, args = {}) {
  const response = await fetch('/api/studio/actions', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name, arguments: args }), signal: AbortSignal.timeout(140000) });
  const data = await response.json();
  if (!response.ok) throw new Error(data.error || '작업을 완료하지 못했습니다.');
  return data;
}
