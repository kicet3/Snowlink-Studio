import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createScenarioStore, nextStoryStep } from '../server/scenarios.mjs';
import { retrieveStoryContext, countCharacters } from '../server/storyGraph.mjs';
import { studioFixture } from './helpers/studio-fixture.mjs';

const first = '서아는 푸른 열쇠를 발견했다.', second = '서아는 푸른 열쇠로 문을 열었다.';
const content = quote => quote + ' 조용한 마을에서 친구를 만났다.'.repeat(8);
const memory = (quote, extra = {}) => ({ summary: quote, facts: [{ subject: '서아', relation: '행동', object: '푸른 열쇠', evidence: quote }], introduced: [], developments: [], ...extra });
test('stories enforce ordered plots/details, Unicode lengths, exact evidence, graph retrieval and stale propagation across restarts', () => {
  const directory = mkdtempSync(join(tmpdir(), 'story-test-')); const store = createScenarioStore(directory);
  try {
    let s = store.create({ title: '문', premise: '열쇠를 찾아 문을 연다.', episodeCount: 2, minChars: 100, maxChars: 1000 });
    assert.throws(() => store.savePlot(s.id, 1, { revision: s.revision, plot: '시작' }), /전체 플롯/);
    s = store.saveOverall(s.id, { revision: s.revision, plot: '발견 후 해결' });
    assert.throws(() => store.savePlot(s.id, 2, { revision: s.revision, plot: '끝' }), /이전 화/);
    s = store.savePlot(s.id, 1, { revision: s.revision, plot: '발견' }); s = store.savePlot(s.id, 2, { revision: s.revision, plot: '해결' });
    assert.throws(() => store.saveContent(s.id, 2, { revision: s.revision, content: content(second) }), /1화부터/);
    assert.throws(() => store.saveContent(s.id, 1, { revision: s.revision, content: content(first), memory: memory('존재하지 않는 인용') }), /근거/);
    s = store.saveContent(s.id, 1, { revision: s.revision, content: first, memory: memory(first) }); assert.equal(s.episodes[0].status, 'needs_revision');
    s = store.saveContent(s.id, 1, { revision: s.revision, content: content(first), memory: memory(first, { introduced: [{ key: 'key', title: '열쇠', description: '서아가 발견한 열쇠의 비밀', evidence: first, payoffEpisode: 2 }] }) });
    const context = retrieveStoryContext(s, { beforeEpisode: 2, query: '서아 열쇠' }); assert.equal(context.threads.length, 1); assert.ok(context.facts[0].retrievalPath.length); assert.equal(context.facts[0].episodeNumber, 1);
    s = store.saveContent(s.id, 2, { revision: s.revision, content: content(second), memory: memory(second, { developments: [{ threadId: context.threads[0].id, action: 'resolve', description: '문을 열었다.', evidence: second }] }) });
    assert.equal(nextStoryStep(s), null); assert.equal(retrieveStoryContext(s).threads.length, 0); assert.equal(retrieveStoryContext(s).resolvedThreads.length, 1);
    assert.equal(retrieveStoryContext(s, { beforeEpisode: 2 }).threads.length, 1); assert.ok(retrieveStoryContext(s, { beforeEpisode: 2 }).facts.every(f => f.episodeNumber < 2));
    s = store.saveContent(s.id, 1, { revision: s.revision, content: content(first) + ' 달이 떴다.', memory: memory(first) }); assert.equal(s.episodes[1].status, 'stale');
    assert.ok(retrieveStoryContext(s).facts.every(f => f.episodeNumber === 1)); assert.equal(retrieveStoryContext(s).resolvedThreads.length, 0);
    assert.equal(createScenarioStore(directory).read(s.id).graph.storyRevision, s.revision);
    assert.throws(() => store.update(s.id, { revision: 1, title: '오래된 저장' }), /다른 화면/);
    assert.equal(countCharacters('한 😀\r\n글'), 5); assert.equal(countCharacters('한 😀\r\n글', false), 3);
  } finally { rmSync(directory, { recursive: true, force: true }); }
});

test('AI serial generation retrieves prior graph facts, resolves planted thread, applies chosen video template, and stops below minimum', async () => {
  const f = await studioFixture(); const cookie = await f.login();
  const act = async (name, args = {}) => { const response = await fetch(f.base + '/api/studio/actions', { method: 'POST', headers: { 'Content-Type': 'application/json', Cookie: cookie }, body: JSON.stringify({ name, arguments: args }) }); const result = await response.json(); assert.equal(response.status, 200, JSON.stringify(result)); return result; };
  const wait = async id => { for (let i = 0; i < 100; i++) { const job = await act('studio_job', { id }); if (!['queued', 'running'].includes(job.status)) return job; await new Promise(r => setTimeout(r, 20)); } throw new Error('Job timeout'); };
  try {
    let s = await act('studio_scenario', { operation: 'create', values: { title: '푸른 열쇠', premise: '문을 여는 이야기', episodeCount: 2, minChars: 100, maxChars: 600, videoTemplateId: 'live-action' } });
    const job = await act('studio_story_generate', { id: s.id, revision: s.revision, all: true });
    assert.equal((await wait(job.id)).status, 'done'); s = await act('studio_scenario', { operation: 'read', id: s.id });
    assert.deepEqual(s.episodes.map(e => e.status), ['ready', 'ready']); assert.equal(s.episodes[1].retrieval.threads.length, 1); assert.equal((await act('studio_story_context', { id: s.id })).resolvedThreads.length, 1);
    assert.ok(f.captured.chats.some(m => m[1].content.includes('실사 영화')));
    const scenes = await act('studio_episode_nodes', { id: s.id, revision: s.revision, episodeNumber: 1 }); const result = await wait(scenes.id); assert.equal(result.status, 'done');
    const graph = await act('studio_graphs', { sessionId: result.result.sessionId }); assert.equal(graph.nodes.length, 4); assert.ok(graph.nodes.every(n => n.data.prompt.includes('실사 영화')));
    const short = await act('studio_scenario', { operation: 'create', values: { title: '짧은 초안', premise: '부족한 분량', episodeCount: 2, minChars: 100, maxChars: 600 } }); f.behavior.short = true;
    const shortJob = await act('studio_story_generate', { id: short.id, revision: short.revision, all: true }); assert.equal((await wait(shortJob.id)).status, 'needs_revision');
    const saved = await act('studio_scenario', { operation: 'read', id: short.id }); assert.equal(saved.episodes[0].status, 'needs_revision'); assert.equal(saved.episodes[1].content, '');
  } finally { await f.close(); }
});
