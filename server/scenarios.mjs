import { mkdirSync, existsSync, readFileSync, writeFileSync, renameSync } from 'node:fs';
import { join } from 'node:path';
import { randomUUID } from 'node:crypto';
import { buildStoryGraph, countCharacters, validateMemory } from './storyGraph.mjs';

const bad = (message, status = 400) => Object.assign(new Error(message), { status });
const text = (value, max, label, required = false) => {
  if (typeof value !== 'string' || value.length > max || required && !value.trim()) throw bad(`${label} 입력을 확인해주세요. (최대 ${max.toLocaleString('ko-KR')}자)`);
  return value.trim();
};
export function episodeLength(series, episode) {
  const minChars = episode.minChars ?? series.minChars, maxChars = episode.maxChars ?? series.maxChars;
  const count = countCharacters(episode.content, series.countSpaces);
  return { count, minChars, maxChars, countSpaces: series.countSpaces, valid: count >= minChars && count <= maxChars, missing: Math.max(0, minChars - count), excess: Math.max(0, count - maxChars) };
}
export function nextStoryStep(series) {
  if (!series.overallPlot) return { stage: 'overall', label: '전체 플롯' };
  const plot = series.episodes.find(episode => episode.plotStatus !== 'ready');
  if (plot) return { stage: 'plot', episodeNumber: plot.number, label: `${plot.number}화 플롯` };
  const episode = series.episodes.find(episode => episode.status !== 'ready');
  if (!episode) return null;
  return { stage: episode.status === 'needs_memory' && episodeLength(series, episode).valid ? 'memory' : 'content', episodeNumber: episode.number, label: `${episode.number}화 ${episode.status === 'needs_memory' ? '이야기 기억 구조화' : '상세 원고'}` };
}

export function createScenarioStore(directory) {
  mkdirSync(directory, { recursive: true, mode: 0o700 });
  const file = join(directory, 'scenarios.json');
  let state = existsSync(file) ? JSON.parse(readFileSync(file, 'utf8')) : { version: 1, series: [] };
  if (state.version !== 1 || !Array.isArray(state.series)) throw new Error('시나리오 저장 형식을 확인해주세요.');
  const read = id => { const series = state.series.find(item => item.id === id); if (!series) throw bad('시나리오를 찾을 수 없습니다.', 404); return structuredClone(series); };
  function commit(series) {
    series.revision++; series.updatedAt = new Date().toISOString();
    series.graph = buildStoryGraph(series);
    const next = { ...state, series: state.series.some(item => item.id === series.id) ? state.series.map(item => item.id === series.id ? series : item) : [...state.series, series] };
    writeFileSync(file + '.tmp', JSON.stringify(next, null, 2), { mode: 0o600 }); renameSync(file + '.tmp', file); state = next;
    return structuredClone(series);
  }
  function editable(id, revision) { const series = read(id); if (revision !== series.revision) throw bad('시나리오가 다른 화면에서 변경됐습니다. 다시 불러와주세요.', 409); return series; }
  function invalidate(series, from = 1, plots = false) {
    for (const episode of series.episodes) if (episode.number >= from) {
      if (plots && episode.plot) episode.plotStatus = 'stale';
      if (episode.content) episode.status = 'stale';
    }
  }
  function settings(input) {
    const episodeCount = Number(input.episodeCount), minChars = Number(input.minChars), maxChars = Number(input.maxChars);
    if (!Number.isInteger(episodeCount) || episodeCount < 1 || episodeCount > 50) throw bad('전체 화수는 1~50화로 설정해주세요.');
    if (!Number.isInteger(minChars) || minChars < 100 || minChars > 20000 || !Number.isInteger(maxChars) || maxChars < minChars || maxChars > 30000) throw bad('화별 최소 글자 수는 100~20,000자, 최대는 최소 이상~30,000자로 설정해주세요.');
    if (!Array.isArray(input.characterIds) || input.characterIds.some(id => typeof id !== 'string') || input.characterIds.length > 30) throw bad('출연 캐릭터를 확인해주세요.');
    return { title: text(input.title, 160, '제목', true), premise: text(input.premise, 10000, '작품 구상', true), genre: text(input.genre || '', 300, '장르'), tone: text(input.tone || '', 1000, '분위기'), world: text(input.world || '', 10000, '고정 설정'), episodeCount, minChars, maxChars, countSpaces: input.countSpaces !== false, characterIds: [...new Set(input.characterIds)], videoTemplateId: text(input.videoTemplateId || 'animation', 100, '영상 템플릿') };
  }
  function episodes(count, previous = []) {
    return Array.from({ length: count }, (_, index) => previous[index] || { id: randomUUID(), number: index + 1, title: `${index + 1}화`, plot: '', plotStatus: 'empty', content: '', status: 'empty', memory: null, contentRevision: 0, retrieval: null });
  }
  const store = {
    list: () => state.series.map(({ graph, episodes, ...series }) => ({ ...series, episodes: episodes.map(({ content, memory, retrieval, ...episode }) => ({ ...episode, length: episodeLength(series, { ...episode, content }), summary: memory?.summary || '' })) })),
    read,
    create(input) {
      const values = settings({ episodeCount: 3, minChars: 2000, maxChars: 5000, characterIds: [], ...input });
      return commit({ ...values, id: randomUUID(), revision: 0, createdAt: new Date().toISOString(), overallPlot: '', overallRevision: 0, episodes: episodes(values.episodeCount), messages: [], archived: false });
    },
    update(id, input) {
      const series = editable(id, input.revision), values = settings({ ...series, ...input });
      if (values.episodeCount < series.episodeCount && series.episodes.slice(values.episodeCount).some(episode => episode.plot || episode.content)) throw bad('이미 작성한 화는 화수를 줄여 삭제할 수 없습니다. 원고를 보존하려면 새 시나리오를 만들어주세요.');
      const changed = ['premise', 'genre', 'tone', 'world', 'episodeCount', 'characterIds'].some(key => JSON.stringify(values[key]) !== JSON.stringify(series[key]));
      if (changed && series.overallPlot) { series.previousOverallPlot = series.overallPlot; series.overallPlot = ''; invalidate(series, 1, true); }
      Object.assign(series, values); series.episodes = episodes(values.episodeCount, series.episodes);
      for (const episode of series.episodes) if (episode.status === 'ready' && !episodeLength(series, episode).valid) episode.status = 'needs_revision';
      // Later memories must not survive a newly invalid earlier installment.
      const invalid = series.episodes.find(episode => episode.status !== 'ready');
      if (invalid) invalidate(series, invalid.number + 1);
      if (input.archived !== undefined) series.archived = input.archived === true;
      return commit(series);
    },
    saveOverall(id, { revision, plot }) {
      const series = editable(id, revision);
      const value = text(plot, 20000, '전체 플롯', true);
      if (value !== series.overallPlot) { invalidate(series, 1, true); series.overallRevision++; }
      series.overallPlot = value; return commit(series);
    },
    savePlot(id, number, { revision, title, plot }) {
      const series = editable(id, revision), episode = series.episodes[number - 1];
      if (!episode || !series.overallPlot || series.episodes.slice(0, number - 1).some(item => item.plotStatus !== 'ready')) throw bad('전체 플롯과 이전 화의 플롯부터 순서대로 작성해주세요.', 409);
      const value = text(plot, 12000, '화별 플롯', true);
      if (episode.plot !== value) { invalidate(series, number); invalidate(series, number + 1, true); }
      episode.title = text(title || episode.title, 160, '화 제목', true); episode.plot = value; episode.plotStatus = 'ready';
      return commit(series);
    },
    saveContent(id, number, input) {
      const series = editable(id, input.revision), episode = series.episodes[number - 1];
      if (!episode || series.episodes.some(item => item.plotStatus !== 'ready') || series.episodes.slice(0, number - 1).some(item => item.status !== 'ready')) throw bad('화별 플롯을 먼저 완성하고 상세 원고는 1화부터 순서대로 작성해주세요.', 409);
      const content = text(input.content, 60000, '상세 원고', true);
      const minChars = input.minChars ?? episode.minChars, maxChars = input.maxChars ?? episode.maxChars;
      settings({ ...series, minChars: minChars ?? series.minChars, maxChars: maxChars ?? series.maxChars });
      const memory = input.memory ? validateMemory(series, episode, input.memory, content) : null;
      if (content !== episode.content || JSON.stringify(memory) !== JSON.stringify(episode.memory)) invalidate(series, number + 1);
      Object.assign(episode, { content, minChars, maxChars, memory, contentRevision: episode.contentRevision + 1, retrieval: input.retrieval || null });
      const length = episodeLength(series, episode);
      episode.status = !length.valid ? 'needs_revision' : memory ? 'ready' : 'needs_memory';
      episode.lastIssue = length.valid ? memory ? '' : '다음 화를 쓰기 전에 이야기 기억을 구조화해야 합니다.' : `현재 ${length.count}자 · ${length.minChars}~${length.maxChars}자 필요`;
      return commit(series);
    },
    setEpisodeLimits(id, number, { revision, minChars, maxChars }) {
      const series = editable(id, revision), episode = series.episodes[number - 1];
      if (!episode) throw bad('해당 화를 찾을 수 없습니다.', 404);
      settings({ ...series, minChars, maxChars });
      Object.assign(episode, { minChars, maxChars });
      if (episode.status === 'ready' && !episodeLength(series, episode).valid) {
        episode.status = 'needs_revision'; invalidate(series, number + 1);
      }
      return commit(series);
    },
    linkProduction(id, number, revision, productionId) {
      const series = editable(id, revision), episode = series.episodes[number - 1];
      if (!episode || episode.status !== 'ready') throw bad('완료된 화만 제작 보드에 연결할 수 있습니다.');
      episode.productionId = productionId; return commit(series);
    },
    linkGraph(id, number, revision, graphId) {
      const series = editable(id, revision), episode = series.episodes[number - 1];
      if (!episode || episode.status !== 'ready') throw bad('완료된 화만 장면 노드로 연결할 수 있습니다.');
      episode.graphId = graphId; return commit(series);
    },
  };
  return store;
}
