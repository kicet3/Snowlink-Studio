import { json, readJson } from './http.mjs';
import { responseMessages } from './ai.mjs';
import { chatEdit } from './cuts.mjs';

export async function handleAi(req, res, pathname, { ai, store, cutStore, render }) {
  if (pathname === '/api/ai/settings' && req.method === 'GET') { json(res, 200, { ...ai.settings.read(), catalog: await ai.catalog() }); return true; }
  if (pathname === '/api/ai/settings' && req.method === 'PUT') {
    const input = await readJson(req);
    const catalog = await ai.catalog();
    if (!catalog[input.role]?.[input.value?.provider]?.some(m => m.id === input.value?.model)) throw Object.assign(new Error('이 작업에서 지원하지 않는 모델입니다.'), { status: 400 });
    json(res, 200, { ...ai.settings.save(input.role, input.value, input.revision), catalog }); return true;
  }
  if (pathname === '/api/ai/status' && req.method === 'GET') { json(res, 200, await ai.status()); return true; }
  if (pathname === '/api/ai/provider' && req.method === 'PUT') {
    ai.select((await readJson(req)).provider); json(res, 200, await ai.status()); return true;
  }
  if (['/v1/chat/completions', '/v1/responses'].includes(pathname) && req.method === 'POST') {
    const input = await readJson(req);
    const provider = input.model === 'grok-oauth' ? 'grok' : input.model === 'gpt-oauth' ? 'gpt' : undefined;
    const responses = pathname.endsWith('/responses');
    let keepAlive;
    if (responses && input.stream) {
      res.writeHead(200, { 'Content-Type': 'text/event-stream', 'Cache-Control': 'no-store' });
      res.write(': connected\n\n');
      keepAlive = setInterval(() => res.write(': waiting\n\n'), 5000);
      res.once('close', () => clearInterval(keepAlive));
    }
    try {
      const answer = await ai.complete(responses ? responseMessages(input) : input.messages, provider, 'planning');
      if (responses && input.stream) {
        res.write(`data: ${JSON.stringify({ type: 'response.output_text.done', output_index: 0, content_index: 0, text: answer.content })}\n\n`);
        res.end('data: [DONE]\n\n');
      } else json(res, 200, { id: 'snowfall-' + Date.now(), object: 'chat.completion', model: answer.model, choices: [{ index: 0, message: { role: 'assistant', content: answer.content }, finish_reason: 'stop' }] });
    } finally { clearInterval(keepAlive); }
    return true;
  }
  const match = /^\/api\/edits\/([\w-]+)(?:\/(chat|undo|render))?$/.exec(pathname);
  if (!match) return false;
  const [, id, action] = match;
  const workspace = store.read();
  const production = workspace.productions.find(p => p.id === id);
  if (!production) throw Object.assign(new Error('먼저 제작 보드에 콘텐츠를 등록해주세요.'), { status: 404 });
  const current = cutStore.read(id);
  if (req.method === 'GET' && !action) { json(res, 200, current); return true; }
  const input = await readJson(req);
  if (input.revision !== current.revision) throw Object.assign(new Error('다른 화면에서 컷이 변경됐습니다. 다시 불러와주세요.'), { status: 409 });
  if (action === 'render' && req.method === 'POST') { json(res, 202, render.start(production, current, workspace.characters)); return true; }
  if (action === 'undo' && req.method === 'POST') { json(res, 200, cutStore.undo(id, input.revision)); return true; }
  if (action === 'chat' && req.method === 'POST') {
    const selected = workspace.characters.filter(c => production.characterIds.includes(c.id));
    const result = await chatEdit(ai, input, production, selected, current);
    const messages = [{ role: 'user', text: input.message }, { role: 'assistant', text: result.reply, provider: result.provider }];
    json(res, 200, cutStore.save(id, { revision: current.revision, cuts: result.cuts }, selected.map(c => c.id), messages));
    return true;
  }
  if (!action && req.method === 'PUT') {
    json(res, 200, cutStore.save(id, input, production.characterIds)); return true;
  }
  throw Object.assign(new Error('허용되지 않는 편집 요청입니다.'), { status: 405 });
}
