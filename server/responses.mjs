/** Some OAuth responses finish with output:[]; preserve the streamed text events. */
export async function collectResponseText(body) {
  if (!body) throw Object.assign(new Error('GPT 응답 스트림이 없습니다.'), { status: 502 });
  const decoder = new TextDecoder();
  const parts = new Map();
  let buffer = '', completed = false, failed = false;
  function consume(block) {
    const text = block.split(/\r?\n/).filter(line => line.startsWith('data:')).map(line => line.slice(5).trimStart()).join('\n');
    if (!text || text === '[DONE]') return;
    let event;
    try { event = JSON.parse(text); } catch { return; }
    const key = `${event.output_index || 0}:${event.content_index || 0}`;
    if (event.type === 'response.output_text.delta') parts.set(key, (parts.get(key) || '') + (event.delta || ''));
    if (event.type === 'response.output_text.done') parts.set(key, event.text || '');
    if (event.type === 'response.completed' || event.type === 'response.done') completed = event.response?.status !== 'failed' && event.response?.status !== 'incomplete';
    if (['error', 'response.failed', 'response.incomplete'].includes(event.type)) failed = true;
  }
  for await (const chunk of body) {
    buffer += decoder.decode(chunk, { stream: true });
    const blocks = buffer.split(/\r?\n\r?\n/);
    buffer = blocks.pop();
    blocks.forEach(consume);
    if (buffer.length > 2 * 1024 * 1024) throw Object.assign(new Error('GPT 응답이 너무 큽니다.'), { status: 502 });
  }
  buffer += decoder.decode();
  if (buffer.trim()) consume(buffer);
  if (failed || !completed) throw Object.assign(new Error('GPT 응답이 완료되지 않았습니다. 기존 편집 내용은 유지됩니다.'), { status: 502 });
  return [...parts.entries()].sort(([a], [b]) => a.localeCompare(b, undefined, { numeric: true })).map(([, value]) => value).join('');
}
