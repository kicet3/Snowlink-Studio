import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, writeFile, mkdir, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createModelSettings } from '../server/modelSettings.mjs';
import { createAi } from '../server/ai.mjs';
import { createDiscovery } from '../server/discovery.mjs';

const aiConfig = { provider: 'gpt', gptModel: 'gpt-6-luna', grokModel: 'grok-4.3' };
test('model roles persist independently, migrate legacy preference and reject stale saves', async t => {
  const dir = await mkdtemp(join(tmpdir(), 'snowfall-models-')); t.after(() => rm(dir, { recursive: true, force: true }));
  await writeFile(join(dir, 'ai.json'), JSON.stringify({ provider: 'grok' }));
  const settings = createModelSettings({ ai: aiConfig }, dir);
  assert.equal(settings.read().roles.planning.provider, 'grok');
  settings.save('chat', { provider: 'gpt', model: 'gpt-6-astra' }, 0);
  settings.save('image', { provider: 'gpt', model: 'gpt-6-sol' }, 1);
  const restored = createModelSettings({ ai: aiConfig }, dir).read();
  assert.equal(restored.roles.chat.model, 'gpt-6-astra');
  assert.equal(restored.roles.planning.provider, 'grok');
  assert.equal(restored.roles.image.model, 'gpt-6-sol');
  assert.throws(() => settings.save('video', { provider: 'gpt', model: 'gpt-6-sol' }, 2), /Grok/);
  assert.throws(() => settings.save('chat', { provider: 'gpt', model: 'gpt-6-sol' }, 0), /다른 화면/);
});
test('selected GPT model reaches OAuth inference separately for planning and cut conversation', async t => {
  const dir = await mkdtemp(join(tmpdir(), 'snowfall-model-routing-')); t.after(() => rm(dir, { recursive: true, force: true }));
  await mkdir(join(dir, 'lib/codexBackend'), { recursive: true });
  await writeFile(join(dir, 'lib/codexBackend/index.js'), `export async function codexFetch(path, options) { const { model } = JSON.parse(options.body); return new Response('data: ' + JSON.stringify({ type:'response.output_text.done', text:model }) + '\\n\\ndata: '+ JSON.stringify({ type:'response.completed', response:{status:'completed',output:[]} }) +'\\n\\n'); }`);
  const ai = createAi({ ai: aiConfig, tools: { ima2: { directory: dir } } }, dir);
  ai.settings.save('planning', { provider: 'gpt', model: 'gpt-6-sol' });
  ai.settings.save('chat', { provider: 'gpt', model: 'gpt-6-astra' });
  const messages = [{ role: 'user', content: '원고 정리' }];
  assert.equal((await ai.complete(messages, undefined, 'planning')).content, 'gpt-6-sol');
  assert.equal((await ai.complete(messages)).content, 'gpt-6-astra');
});
test('keyword discovery encodes searches, filters collected TikTok videos and exposes partial failures', async () => {
  const requests = [];
  const discovery = createDiscovery({ tools: { trends: { target: 'http://local.test' } } }, async path => {
    const url = new URL(path); requests.push(url);
    if (url.searchParams.get('shorts') === '1') return new Response('{}', { status: 429 });
    if (url.pathname === '/api/tiktok') return Response.json({ posts: [{ id: '1', title: '가을 & 눈 산책', url: 'https://www.tiktok.com/@example/video/1' }, { id: '2', title: '다른 소재', url: 'https://www.tiktok.com/@example/video/2' }] });
    return Response.json({ videos: [{ id: '12345678901', title: '영상', thumbnail: 'javascript:alert(1)' }] });
  });
  const params = new URLSearchParams({ keyword: '가을 & 눈', country: 'JP' });
  const result = await discovery(params);
  assert.equal(requests[0].searchParams.get('q'), '가을 & 눈');
  assert.equal(result.sources[0].items[0].thumbnail, '');
  assert.equal(result.sources[1].status, 'error');
  assert.equal(result.sources[2].items.length, 1);
  assert.equal(result.sources[3].status, 'unavailable');
  assert.equal(result.sources[4].items.length, 0);
  await discovery(params); assert.equal(requests.length, 3);
  await assert.rejects(() => discovery(new URLSearchParams({ keyword: '' })), /검색어/);
});
