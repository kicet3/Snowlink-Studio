import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync, readFileSync, writeFileSync, statSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { randomUUID } from 'node:crypto';
import { createPersonaChat } from '../server/personaChat.mjs';
import { createStore } from '../server/store.mjs';
import { createScenarioStore } from '../server/scenarios.mjs';
import { studioFixture } from './helpers/studio-fixture.mjs';

function fixture(t, complete) {
  const dataDir = mkdtempSync(join(tmpdir(), 'snowlink-persona-'));
  t.after(() => rmSync(dataDir, { recursive: true, force: true }));
  const calls = [], store = createStore(dataDir), scenarios = createScenarioStore(dataDir);
  const ai = { async complete(messages, provider, role) {
    calls.push({ messages, provider, role });
    return complete ? complete(messages) : { content: '나는 서린이야. 편지를 함께 배달할래?', provider: 'gpt', model: 'test-persona' };
  } };
  const args = { dataDir, store, scenarios, ai };
  return { ...args, chat: createPersonaChat(args), calls, restart: () => createPersonaChat(args) };
}
const startPublic = chat => chat.start({ source: 'public', characterId: 'character-seorin', throughEpisode: 1 });
const sendInput = (c, message = '내 이름은 별이야.') => ({ id: c.id, revision: c.revision, requestId: randomUUID(), message });

test('public persona is distinct from sheet assistant; completed turns persist and are used on the next request', async t => {
  const f = fixture(t), catalog = f.chat.catalog();
  assert.equal(catalog.characters.length, 3);
  let c = startPublic(f.chat);
  assert.equal(c.context, undefined);
  c = await f.chat.send(sendInput(c));
  assert.equal(c.messages.length, 2);
  const restored = f.restart().get({ id: c.id });
  assert.deepEqual(restored, c);
  await f.chat.send(sendInput(restored, '내 이름을 기억해?'));
  assert.equal(f.calls[1].role, 'chat');
  assert.match(f.calls[1].messages[0].content, /시트를 설계하는 도우미가 아닙니다/);
  assert.equal(f.calls[1].messages[2].content, '내 이름은 별이야.');
  const context = JSON.parse(f.calls[0].messages[1].content);
  assert.equal(context.persona.name, '서린');
  assert.equal(context.story.chapters.length, 1);
  assert.equal(context.story.chapters[0].number, 1);
  assert.doesNotMatch(JSON.stringify(context), /기억했다\. 불이 나던 밤/);
  assert.equal(restored.messages[1].model, 'test-persona');
  assert.equal(f.chat.list().conversations[0].messages, undefined);
  assert.equal(f.chat.list().conversations[0].context, undefined);
  assert.equal(statSync(join(f.dataDir, 'persona-chats.json')).mode & 0o777, 0o600);
});

test('retrying a turn shares in-flight work and cannot double-bill or duplicate messages', async t => {
  let release;
  const f = fixture(t, () => new Promise(resolve => { release = () => resolve({ content: '반가워, 별.', provider: 'gpt', model: 'test' }); }));
  const c = startPublic(f.chat), input = sendInput(c);
  const first = f.chat.send(input), duplicate = f.chat.send(input);
  await assert.rejects(f.chat.send(sendInput(c, '다른 메시지')), { status: 409 });
  assert.throws(() => f.chat.remove({ id: c.id, revision: 0 }), { status: 409 });
  release();
  const [a, b] = await Promise.all([first, duplicate]);
  assert.deepEqual(a, b); assert.equal(f.calls.length, 1);
  assert.deepEqual(await f.chat.send(input), a); assert.equal(f.calls.length, 1);
  await assert.rejects(f.chat.send({ ...input, message: '바뀐 메시지' }), { status: 409 });
  await assert.rejects(f.chat.send(sendInput(c)), { status: 409 });
  assert.throws(() => f.chat.remove({ id: c.id, revision: 0 }), { status: 409 });
  f.chat.remove({ id: c.id, revision: 1 });
  assert.equal(f.restart().list().conversations.length, 0);
});

test('upstream failures and malformed answers preserve history and allow a safe retry', async t => {
  let fail = true;
  const f = fixture(t, () => { if (fail) throw new Error('offline'); return { content: '안녕', provider: 'gpt', model: 'test' }; });
  const c = startPublic(f.chat), input = sendInput(c);
  await assert.rejects(f.chat.send(input), /offline/);
  assert.equal(f.chat.get(c).messages.length, 0);
  fail = false;
  assert.equal((await f.chat.send(input)).messages.length, 2);
  const empty = fixture(t, () => ({ content: '' }));
  const e = startPublic(empty.chat);
  await assert.rejects(empty.chat.send(sendInput(e)), { status: 502 });
  assert.equal(empty.chat.get(e).revision, 0);
});

test('only recent bounded turns go to the model while the full transcript survives restart', async t => {
  const f = fixture(t);
  let c = startPublic(f.chat);
  for (let n = 0; n < 13; n++) c = await f.chat.send(sendInput(c, `대화 ${n}`));
  assert.equal(f.calls.at(-1).messages.length, 23); // system + fixed context + 20 messages + current input
  assert.equal(f.calls.at(-1).messages[2].content, '대화 2');
  assert.equal(f.restart().get(c).messages.length, 26);
});

test('own character uses only eligible story graph context and a frozen snapshot without rewriting canon', async t => {
  const f = fixture(t);
  const character = f.store.upsert('characters', { name: '루나', description: '등대지기. 차분한 존댓말을 쓴다.', tags: '' });
  let s = f.scenarios.create({ title: '별의 등대', premise: '루나가 항해자를 안내한다.', characterIds: [character.id], episodeCount: 2, minChars: 100, maxChars: 1000 });
  s = f.scenarios.saveOverall(s.id, { revision: s.revision, plot: '전체 결말 비밀은 숨겨진 별이다.' });
  for (let n = 1; n <= 2; n++) s = f.scenarios.savePlot(s.id, n, { revision: s.revision, plot: `아직 읽지 않은 미래 플롯 ${n}` });
  for (let n = 1; n <= 2; n++) {
    const evidence = n === 1 ? '루나는 푸른 열쇠를 주웠다.' : '루나는 숨겨진 별의 정체를 알았다.';
    s = f.scenarios.saveContent(s.id, n, { revision: s.revision, content: evidence + ' 등대 아래에 잔잔한 파도가 밀려왔다.'.repeat(10), memory: { summary: evidence, facts: [{ subject: '루나', relation: '발견', object: n === 1 ? '푸른 열쇠' : '숨겨진 별', evidence }], introduced: [], developments: [] } });
  }
  const before = f.scenarios.read(s.id);
  let c = f.chat.start({ source: 'workspace', characterId: character.id, scenarioId: s.id, throughEpisode: 1 });
  c = await f.chat.send(sendInput(c, '그 열쇠는 어디에서 찾았어?'));
  const context = JSON.parse(f.calls[0].messages[1].content);
  assert.match(JSON.stringify(context), /푸른 열쇠/);
  assert.doesNotMatch(JSON.stringify(context), /숨겨진 별|미래 플롯|전체 결말/);
  assert.equal(context.story.facts[0].episode, 1);
  assert.deepEqual(f.scenarios.read(s.id), before);
  f.store.upsert('characters', { ...character, description: '변경한 캐릭터' }, character.id);
  await f.chat.send(sendInput(c));
  assert.equal(JSON.parse(f.calls[1].messages[1].content).persona.description, character.description);
  const stranger = f.store.upsert('characters', { name: '다른 인물', description: '이 작품에 나오지 않는다.', tags: '' });
  assert.throws(() => f.chat.start({ source: 'workspace', characterId: stranger.id, scenarioId: s.id, throughEpisode: 1 }), { status: 400 });
  s = f.scenarios.saveOverall(s.id, { revision: s.revision, plot: '바뀐 플롯' });
  assert.throws(() => f.chat.start({ source: 'workspace', characterId: character.id, scenarioId: s.id, throughEpisode: 1 }), { status: 400 });
  assert.deepEqual(f.chat.catalog().characters.find(c => c.id === character.id).works[0].episodes, []);
});

test('damaged storage fails closed instead of losing histories; cross-workspace IDs stay private', t => {
  const a = fixture(t), b = fixture(t), c = startPublic(a.chat);
  assert.throws(() => b.chat.get(c), { status: 404 });
  assert.throws(() => a.chat.start({ source: 'public', characterId: '../../private' }), { status: 404 });
  const file = join(a.dataDir, 'persona-chats.json');
  writeFileSync(file, 'broken');
  assert.throws(() => a.chat.list(), { status: 503 });
  assert.throws(() => startPublic(a.chat), { status: 503 });
  assert.equal(readFileSync(file, 'utf8'), 'broken');
});

test('HTTP actions require a session, validate input, and isolate two visitor histories', async t => {
  const f = await studioFixture(0, { publicAccess: true }); t.after(() => f.close());
  const request = (cookie, name, args = {}) => fetch(f.base + '/api/studio/actions', { method: 'POST', headers: { 'Content-Type': 'application/json', Origin: f.base, ...(cookie ? { Cookie: cookie } : {}) }, body: JSON.stringify({ name, arguments: args }) });
  assert.equal((await request('', 'studio_persona_catalog')).status, 401);
  async function guest() { const r = await fetch(f.base + '/api/auth/guest', { method: 'POST', headers: { 'Content-Type': 'application/json', Origin: f.base }, body: '{}' }); assert.equal(r.status, 201); return r.headers.get('set-cookie').split(';')[0]; }
  const a = await guest(), b = await guest();
  const created = await request(a, 'studio_persona_start', { source: 'public', characterId: 'character-seorin', throughEpisode: 1 });
  assert.equal(created.status, 200); const c = await created.json();
  assert.equal((await request(b, 'studio_persona_conversation', { id: c.id })).status, 404);
  assert.equal((await request(b, 'studio_persona_remove', { id: c.id, revision: 0 })).status, 404);
  assert.equal((await request(a, 'studio_persona_send', { ...sendInput(c), message: ' ' })).status, 400);
  assert.equal((await request(a, 'studio_persona_send', { ...sendInput(c), message: 'x'.repeat(2001) })).status, 400);
  assert.equal((await request(a, 'studio_persona_conversations')).status, 200);
  assert.deepEqual((await (await request(b, 'studio_persona_conversations')).json()).conversations, []);
});
