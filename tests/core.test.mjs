import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createStore, saveImage } from '../server/store.mjs';
import { createCutStore, chatEdit, validateCuts } from '../server/cuts.mjs';
import { collectResponseText } from '../server/responses.mjs';
import { authorize } from '../server/http.mjs';

function fixture(t) {
  const dir = mkdtempSync(join(tmpdir(), 'snowfall-test-'));
  t.after(() => rmSync(dir, { recursive: true, force: true }));
  return dir;
}
test('records persist, validate character references, reject stale writes, and archive reversibly', t => {
  const dir = fixture(t), store = createStore(dir);
  const c = store.upsert('characters', { name: '모모', description: '검증용', image: '', tags: '고양이' });
  const p = store.upsert('productions', { title: '첫 출근', format: 'story', stage: 'idea', characterIds: [c.id] });
  assert.equal(createStore(dir).read().productions[0].id, p.id);
  assert.throws(() => store.upsert('productions', { ...p, updatedAt: 'stale' }, p.id), { status: 409 });
  assert.throws(() => store.upsert('productions', { ...p, characterIds: ['missing'] }, p.id), { status: 400 });
  const archived = store.upsert('productions', { ...p, archived: true }, p.id);
  assert.equal(store.upsert('productions', { ...archived, archived: false }, p.id).archived, false);
});
test('uploads reject SVG, fake PNG and arbitrary filesystem paths', t => {
  const dir = fixture(t), store = createStore(dir);
  assert.throws(() => saveImage(dir, 'data:image/svg+xml;base64,PHN2Zz4='), { status: 400 });
  assert.throws(() => saveImage(dir, 'data:image/png;base64,YWJj'), { status: 400 });
  assert.throws(() => store.upsert('characters', { name: 'bad', image: '/etc/passwd' }), { status: 400 });
});
test('cut edits are revision checked, persist chat history, and undo restores previous cuts', t => {
  const dir = fixture(t), store = createCutStore(dir);
  const first = store.save('project', { revision: 0, cuts: [{ id: 'a', title: '처음', duration: 3, characterId: 'cat' }] }, ['cat']);
  const next = store.save('project', { revision: first.revision, cuts: [{ ...first.cuts[0], duration: 2 }] }, ['cat'], [{ role: 'user', text: '줄여줘' }]);
  assert.equal(createCutStore(dir).read('project').cuts[0].duration, 2);
  assert.throws(() => store.save('project', { revision: 0, cuts: first.cuts }, ['cat']), { status: 409 });
  const restored = store.undo('project', next.revision);
  assert.equal(restored.cuts[0].duration, 3);
  assert.equal(restored.messages.length, 0);
});
test('AI edits validate returned cuts and only send selected character context', async () => {
  let captured;
  const ai = { complete: async (messages, provider) => { captured = { messages, provider }; return { content: JSON.stringify({ reply: '줄였습니다.', cuts: [{ id: 'a', duration: 2, title: 'A', characterId: 'cat' }] }), provider }; } };
  const result = await chatEdit(ai, { message: '2초로', provider: 'grok' }, { title: '검증' }, [{ id: 'cat', name: '모모', description: '설정', image: '/private.png' }], { cuts: [], messages: [] });
  assert.equal(result.cuts[0].duration, 2);
  assert.equal(captured.provider, 'grok');
  assert.ok(!JSON.stringify(captured).includes('/private.png'));
  assert.throws(() => validateCuts([{ duration: 0 }], []), { status: 400 });
  assert.throws(() => validateCuts([{ duration: 3, characterId: 'invented' }], []), { status: 400 });
});
function stream(events) {
  const bytes = new TextEncoder().encode(events.map(event => `data: ${JSON.stringify(event)}\r\n\r\n`).join(''));
  return new ReadableStream({ start(controller) { for (let i = 0; i < bytes.length; i += 7) controller.enqueue(bytes.slice(i, i + 7)); controller.close(); } });
}
test('OAuth text survives output:[] at completion and multi-byte chunk boundaries', async () => {
  const content = await collectResponseText(stream([{ type: 'response.output_text.delta', delta: '안녕' }, { type: 'response.output_text.done', text: '안녕하세요' }, { type: 'response.completed', response: { status: 'completed', output: [] } }]));
  assert.equal(content, '안녕하세요');
});
test('partial or failed OAuth output never becomes a successful edit', async () => {
  await assert.rejects(collectResponseText(stream([{ type: 'response.output_text.delta', delta: 'partial' }, { type: 'response.failed' }])), { status: 502 });
});
test('host and origin allowlists reject cross-site writes', () => {
  const allowed = ['http://127.0.0.1:3400'];
  assert.throws(() => authorize({ headers: { host: 'evil.test:3400' }, method: 'GET' }, allowed), { status: 403 });
  assert.throws(() => authorize({ headers: { host: '127.0.0.1:3400', origin: 'https://evil.test' }, method: 'POST' }, allowed), { status: 403 });
  assert.doesNotThrow(() => authorize({ headers: { host: '127.0.0.1:3400', origin: allowed[0] }, method: 'POST' }, allowed));
});

test('split deployment accepts only configured frontend origins and still checks API hosts', () => {
  const allowed = ['https://api.snowlink.team'];
  const options = { frontendOrigins: ['https://studio.snowlink.team'] };
  const request = { method: 'POST', headers: { host: 'api.snowlink.team', origin: 'https://studio.snowlink.team', 'sec-fetch-site': 'same-origin' } };
  assert.doesNotThrow(() => authorize(request, allowed, options));
  for (const patch of [{ origin: 'https://unknown.example' }, { host: 'unknown.example' }, { 'sec-fetch-site': 'cross-site' }]) {
    assert.throws(() => authorize({ ...request, headers: { ...request.headers, ...patch } }, allowed, options), { status: 403 });
  }
});
