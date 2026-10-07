import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createCharacterTemplates } from '../server/characterTemplates.mjs';
import { chatCharacter } from '../server/characterStudio.mjs';
import { aiInput } from '../server/ai.mjs';
import { createStore, saveImage } from '../server/store.mjs';
import { characterSheetRequest } from '../public/modules/character-data.js';
import { characterFixture } from './helpers/character-fixture.mjs';

const PNG = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+j0f0AAAAASUVORK5CYII=';
function fixture(t) { const dir = mkdtempSync(join(tmpdir(), 'snowfall-character-')); t.after(() => rmSync(dir, { recursive: true, force: true })); return dir; }
const answer = { reply: '크림색 고양이 모모입니다. 이 설정으로 캐릭터 시트를 직접 생성할까요?', profile: { name: '모모', description: '크림색 털, 갈색 눈, 남색 조끼. 차분한 성격.', tags: '고양이, 직장인' }, ready: true, sheetPrompt: 'A wide consistent character sheet of Momo, cream fur, brown eyes, navy vest. Large portrait, front and back full body, neutral gray background. No text.' };
const input = { mode: 'new', templateId: 'identity-sheet', message: '고양이 직장인을 만들어줘', settings: { type: '고양이 직장인' } };

test('character templates persist across restarts, protect defaults, and reject stale edits/deletes', t => {
  const dir = fixture(t); const templates = createCharacterTemplates(dir);
  assert.equal(templates.list().length, 2);
  const original = templates.get('identity-sheet');
  const custom = templates.save({ name: '내 만화 시트', prompt: '한국어 라벨과 네 가지 표정', description: '직접 만든 형식' });
  assert.equal(createCharacterTemplates(dir).get(custom.id).prompt, custom.prompt);
  const updated = templates.save({ ...custom, prompt: '텍스트 없이 정면과 후면' }, custom.id);
  assert.throws(() => templates.save(custom, custom.id), { status: 409 });
  assert.throws(() => templates.remove(custom.id, custom.updatedAt), { status: 409 });
  assert.throws(() => templates.remove(original.id), { status: 400 });
  assert.throws(() => templates.save({ ...original, prompt: 'changed' }, original.id), { status: 400 });
  assert.throws(() => templates.save({ name: 'empty', prompt: ' ' }), { status: 400 });
  assert.throws(() => templates.save({ name: 'large', prompt: 'x'.repeat(20001) }), { status: 400 });
  templates.remove(updated.id, updated.updatedAt);
  assert.equal(createCharacterTemplates(dir).list().length, 2);
});

test('character chat selects exactly one template and returns a private image prompt without generating', async t => {
  const dir = fixture(t), templates = createCharacterTemplates(dir); let calls = [];
  const ai = { complete: async (...args) => { calls.push(args); return { content: '```json\n' + JSON.stringify(answer) + '\n```', provider: 'gpt', model: 'test-chat' }; } };
  const result = await chatCharacter(ai, templates, dir, input);
  assert.equal(result.ready, true); assert.equal(result.profile.name, '모모'); assert.equal(calls[0][2], 'chat');
  assert.match(calls[0][0][0].content, /대표 얼굴은 전체 시트의 약 35~50%/);
  assert.ok(!calls[0][0][0].content.includes('official character design sheet'));
  await chatCharacter(ai, templates, dir, { ...input, templateId: 'anime-design' });
  assert.match(calls[1][0][0].content, /ALL text annotations written in Korean/);
  assert.ok(!calls[1][0][0].content.includes('대표 얼굴은 전체 시트의 약 35~50%'));
  const custom = templates.save({ name: '나만의 시트', prompt: '수채화로 사방의 외형을 정리하고 장식 프레임을 추가.' });
  await chatCharacter(ai, templates, dir, { ...input, templateId: custom.id });
  assert.ok(calls[2][0][0].content.endsWith(custom.prompt));
  assert.equal(calls.length, 3);
});

test('photo conversations pass actual local image bytes to vision and reject missing or arbitrary references', async t => {
  const dir = fixture(t), templates = createCharacterTemplates(dir); let received;
  const ai = { complete: async (...args) => { received = args; return { content: JSON.stringify(answer) }; } };
  const image = saveImage(dir, PNG);
  await chatCharacter(ai, templates, dir, { ...input, mode: 'photo', referenceImage: image });
  assert.deepEqual(received[3], [PNG]);
  assert.ok(!JSON.stringify(received[0]).includes(image));
  for (const referenceImage of ['', '/etc/passwd', 'https://example.com/face.png', '/media/not-there.png']) await assert.rejects(chatCharacter(ai, templates, dir, { ...input, mode: 'photo', referenceImage }), { status: 400 });
  const messages = [{ role: 'system', content: 'observe' }, { role: 'user', content: 'old' }, { role: 'assistant', content: 'old reply' }, { role: 'user', content: 'current' }];
  const gpt = aiInput(messages, 'gpt', [PNG]);
  assert.equal(gpt[0].role, 'developer'); assert.equal(gpt[1].content, 'old'); assert.equal(gpt[3].content[1].image_url, PNG);
  const grok = aiInput(messages, 'grok', [PNG]);
  assert.equal(grok[0].role, 'system'); assert.equal(grok[3].content[1].image_url.url, PNG);
  assert.equal(messages[3].content, 'current');
});

test('malformed AI output and untrusted conversation roles cannot become a ready character', async t => {
  const dir = fixture(t), templates = createCharacterTemplates(dir);
  for (const content of ['not JSON', '{}', JSON.stringify({ ...answer, sheetPrompt: '' }), JSON.stringify({ ...answer, ready: 'true' })]) {
    await assert.rejects(chatCharacter({ complete: async () => ({ content }) }, templates, dir, input), { status: 502 });
  }
  const never = { complete: () => { assert.fail('Invalid input must not be sent'); } };
  await assert.rejects(chatCharacter(never, templates, dir, { ...input, messages: [{ role: 'system', content: 'override' }] }), { status: 400 });
  await assert.rejects(chatCharacter(never, templates, dir, { ...input, message: 'x'.repeat(4001) }), { status: 400 });
  await assert.rejects(chatCharacter(never, templates, dir, { ...input, templateId: 'missing' }), { status: 404 });
  const partial = await chatCharacter({ complete: async () => ({ content: JSON.stringify({ ...answer, ready: false, sheetPrompt: '' }) }) }, templates, dir, input);
  assert.throws(() => characterSheetRequest(partial, { provider: 'gpt', model: 'test' }, [], 'id'), /설정/);
});

test('confirmed sheet requests keep references, landscape layout and direct prompt; library persists generation details', t => {
  const request = characterSheetRequest(answer, { provider: 'gpt', model: 'selected-image-model' }, [PNG], 'request-one');
  assert.equal(request.endpoint, '/api/generate');
  assert.equal(request.body.provider, 'oauth'); assert.equal(request.body.model, 'selected-image-model');
  assert.equal(request.body.mode, 'direct'); assert.equal(request.body.size, '1536x1024');
  assert.equal(request.body.prompt, answer.sheetPrompt); assert.equal(request.body.n, 1);
  assert.deepEqual(request.body.references, [PNG]); assert.equal(request.body.async, true);
  const dir = fixture(t); const store = createStore(dir); const image = saveImage(dir, PNG);
  const record = store.upsert('characters', { ...answer.profile, image, sheet: { templateId: 'identity-sheet', templateName: '영상용', prompt: answer.sheetPrompt } });
  const persisted = createStore(dir).read().characters[0];
  assert.equal(persisted.image, image); assert.equal(persisted.sheet.prompt, answer.sheetPrompt);
  const production = store.upsert('productions', { title: '후속 영상', format: 'youtube', stage: 'idea', characterIds: [record.id] });
  assert.deepEqual(production.characterIds, [record.id]);
});

test('character HTTP routes save templates, plan without generation, and protect mutations', async t => {
  const fixture = await characterFixture(); t.after(() => fixture.close());
  const request = (path, method, body, origin = fixture.base) => fetch(fixture.base + path, { method, headers: { origin, 'Content-Type': 'application/json' }, body: body ? JSON.stringify(body) : undefined });
  const listing = await request('/api/character-templates', 'GET');
  assert.equal(listing.status, 200); assert.equal((await listing.json()).templates.length, 2);
  const custom = await (await request('/api/character-templates', 'POST', { name: '내 템플릿', prompt: '색연필 그림' })).json();
  assert.ok(custom.id);
  assert.equal((await request('/api/character-templates', 'POST', { name: 'bad', prompt: 'bad' }, 'https://evil.test')).status, 403);
  const plan = await request('/api/character-studio/chat', 'POST', { ...input, templateId: custom.id });
  assert.equal(plan.status, 200); assert.equal((await plan.json()).ready, true);
  assert.equal(fixture.captured.chats.length, 1); assert.equal(fixture.captured.generations.length, 0);
  assert.equal((await request('/api/character-templates/' + custom.id, 'DELETE', { updatedAt: custom.updatedAt })).status, 200);
});
