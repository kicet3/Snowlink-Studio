import { createHash } from 'node:crypto';

const idFor = (...parts) => createHash('sha256').update(parts.join('\0')).digest('hex').slice(0, 24);
const key = text => String(text).normalize('NFKC').trim().toLocaleLowerCase();
const bad = message => Object.assign(new Error(message), { status: 422 });
const str = (value, max) => typeof value === 'string' && value.trim() && value.length <= max;
export const countCharacters = (text, countSpaces = true) => Array.from(String(text || '').replace(/\r\n?/g, '\n').replace(countSpaces ? /\r/g : /\s/g, '')).length;

export function validateMemory(series, episode, input, content) {
  if (!input || !str(input.summary, 1800) || !Array.isArray(input.facts) || !input.facts.length || input.facts.length > 40 || !Array.isArray(input.introduced) || input.introduced.length > 12 || !Array.isArray(input.developments) || input.developments.length > 24) throw bad('원고의 요약·사실·떡밥 기억 형식이 올바르지 않습니다.');
  const evidence = value => {
    if (!str(value, 1200) || !content.includes(value.trim())) throw bad('기억의 근거 문장이 해당 화의 원고에서 확인되지 않습니다.');
    return value.trim();
  };
  const facts = input.facts.map(fact => {
    if (!fact || !str(fact.subject, 120) || !str(fact.relation, 120) || !str(fact.object, 500)) throw bad('이야기 사실의 주체·관계·내용을 확인해주세요.');
    return { subject: fact.subject.trim(), relation: fact.relation.trim(), object: fact.object.trim(), evidence: evidence(fact.evidence) };
  });
  const seen = new Set();
  const introduced = input.introduced.map(thread => {
    if (!thread || !str(thread.key, 100) || !str(thread.title, 160) || !str(thread.description, 1000)) throw bad('새 떡밥의 이름과 내용을 확인해주세요.');
    if (seen.has(key(thread.key))) throw bad('같은 화에 중복된 떡밥 식별자가 있습니다.');
    seen.add(key(thread.key));
    const payoffEpisode = thread.payoffEpisode ?? null;
    if (payoffEpisode !== null && (!Number.isInteger(payoffEpisode) || payoffEpisode <= episode.number || payoffEpisode > series.episodeCount)) throw bad('떡밥의 회수 예정 화는 현재 화 이후, 작품의 전체 화수 이내여야 합니다.');
    return { id: 'thread_' + idFor(series.id, episode.id, key(thread.key)), key: thread.key.trim(), title: thread.title.trim(), description: thread.description.trim(), evidence: evidence(thread.evidence), payoffEpisode };
  });
  const before = retrieveStoryContext(series, { beforeEpisode: episode.number, limit: 40 });
  const open = new Map(before.threads.map(thread => [thread.id, thread]));
  const developed = new Set();
  const developments = input.developments.map(item => {
    if (!item || !['advance', 'resolve'].includes(item.action) || !str(item.description, 1200) || !open.has(item.threadId)) throw bad('이전 화에서 심어 둔 미회수 떡밥만 전개하거나 회수할 수 있습니다.');
    if (developed.has(item.threadId)) throw bad('하나의 떡밥에 중복된 전개·회수 기록이 있습니다.');
    developed.add(item.threadId);
    return { threadId: item.threadId, action: item.action, description: item.description.trim(), evidence: evidence(item.evidence) };
  });
  return { summary: input.summary.trim(), facts, introduced, developments };
}

// A materialized property graph, rebuilt atomically with the owning story revision.
// Stale episodes remain in the graph for inspection but cannot enter retrieval.
export function buildStoryGraph(series) {
  const nodes = [], edges = [], entities = new Map();
  const addEdge = (source, target, relation, episodeNumber) => edges.push({ id: 'edge_' + idFor(source, target, relation, String(episodeNumber)), source, target, relation, episodeNumber });
  const entity = name => {
    const normalized = key(name);
    if (!entities.has(normalized)) {
      const node = { id: 'entity_' + idFor(series.id, normalized), type: 'entity', name: String(name).trim() };
      entities.set(normalized, node); nodes.push(node);
    }
    return entities.get(normalized).id;
  };
  for (const episode of series.episodes) {
    const active = episode.status === 'ready' && !!episode.memory;
    const source = { episodeId: episode.id, episodeNumber: episode.number, revision: episode.contentRevision || 0, active };
    nodes.push({ id: episode.id, type: 'episode', name: `${episode.number}화 · ${episode.title}`, summary: episode.memory?.summary || '', ...source });
    if (episode.number > 1) addEdge(series.episodes[episode.number - 2].id, episode.id, 'PRECEDES', episode.number);
    if (!episode.memory) continue;
    episode.memory.facts.forEach((fact, index) => {
      const id = 'fact_' + idFor(episode.id, String(episode.contentRevision), String(index));
      nodes.push({ id, type: 'fact', text: `${fact.subject} — ${fact.relation} → ${fact.object}`, ...fact, ...source });
      addEdge(episode.id, id, 'ESTABLISHES', episode.number);
      addEdge(entity(fact.subject), id, 'HAS_FACT', episode.number);
      // Objects can be states/sentences; only short objects become traversable entity vertices.
      if (fact.object.length <= 120) addEdge(id, entity(fact.object), 'RELATES_TO', episode.number);
    });
    for (const thread of episode.memory.introduced) {
      nodes.push({ ...thread, type: 'thread', ...source });
      addEdge(episode.id, thread.id, 'PLANTS', episode.number);
      for (const fact of episode.memory.facts) if (`${thread.description} ${thread.evidence}`.includes(fact.subject)) addEdge(entity(fact.subject), thread.id, 'INVOLVED_IN', episode.number);
    }
    episode.memory.developments.forEach((development, index) => {
      const id = 'development_' + idFor(episode.id, String(episode.contentRevision), String(index));
      nodes.push({ id, type: 'development', ...development, ...source });
      addEdge(episode.id, id, 'ESTABLISHES', episode.number);
      addEdge(id, development.threadId, development.action === 'resolve' ? 'RESOLVES' : 'ADVANCES', episode.number);
    });
  }
  return { version: 1, storyRevision: series.revision, nodes, edges };
}

export function retrieveStoryContext(series, { beforeEpisode = series.episodeCount + 1, query = '', entities = [], limit = 16 } = {}) {
  const graph = series.graph || buildStoryGraph(series);
  const eligible = node => node.type === 'entity' || node.active && node.episodeNumber < beforeEpisode;
  const nodes = graph.nodes.filter(eligible), byId = new Map(nodes.map(node => [node.id, node]));
  const edges = graph.edges.filter(edge => edge.episodeNumber < beforeEpisode && byId.has(edge.source) && byId.has(edge.target));
  const tokens = [...entities.map(key), ...key(query).split(/[^\p{L}\p{N}_]+/u)].filter(token => token.length > 1).slice(0, 40);
  const score = node => tokens.reduce((n, token) => n + (key([node.name, node.text, node.title, node.description, node.evidence].filter(Boolean).join(' ')).includes(token) ? 4 : 0), 0);
  const seeds = nodes.filter(node => score(node) > 0).sort((a, b) => score(b) - score(a)).slice(0, 20);
  const visits = new Map(seeds.map(node => [node.id, { depth: 0, path: [node.id] }]));
  let frontier = seeds.map(node => node.id);
  for (let depth = 0; depth < 2; depth++) {
    const next = [];
    for (const id of frontier) for (const edge of edges) {
      const other = edge.source === id ? edge.target : edge.target === id ? edge.source : null;
      if (other && !visits.has(other)) { visits.set(other, { depth: depth + 1, path: [...visits.get(id).path, edge.relation, other] }); next.push(other); }
    }
    frontier = next;
  }
  const facts = nodes.filter(node => node.type === 'fact').sort((a, b) => (score(b) + (visits.has(b.id) ? 8 - visits.get(b.id).depth : 0) + b.episodeNumber / 100) - (score(a) + (visits.has(a.id) ? 8 - visits.get(a.id).depth : 0) + a.episodeNumber / 100)).slice(0, limit).map(node => ({ ...node, retrievalPath: visits.get(node.id)?.path || [node.episodeId, 'ESTABLISHES', node.id] }));
  const allThreads = nodes.filter(node => node.type === 'thread').map(thread => {
    const developments = nodes.filter(node => node.type === 'development' && node.threadId === thread.id).sort((a, b) => a.episodeNumber - b.episodeNumber);
    const resolution = developments.find(node => node.action === 'resolve');
    return { ...thread, status: resolution ? 'resolved' : 'open', developments, resolutionEpisode: resolution?.episodeNumber ?? null, due: !resolution && !!thread.payoffEpisode && thread.payoffEpisode <= beforeEpisode };
  });
  const threads = allThreads.filter(thread => thread.status === 'open').sort((a, b) => Number(b.due) - Number(a.due) || score(b) - score(a) || a.episodeNumber - b.episodeNumber);
  return {
    beforeEpisode, storyRevision: series.revision,
    previousEpisodes: nodes.filter(node => node.type === 'episode').sort((a, b) => b.episodeNumber - a.episodeNumber).slice(0, 3).reverse(),
    facts, threads, resolvedThreads: allThreads.filter(thread => thread.status === 'resolved').slice(-12),
    provenance: { method: 'lexical-seeds + two-hop property-graph traversal + recent continuity + unresolved threads', nodeCount: graph.nodes.length, edgeCount: graph.edges.length, excludedFutureAndStale: true },
  };
}
