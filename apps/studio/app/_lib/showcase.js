import data from './showcase-data.json';

export const WORK_KINDS = { novel: '소설', character: '캐릭터', content: '콘텐츠' };
export const showcaseCreators = data.creators;
// Only explicit, published public fixtures can enter the showcase.
export const showcaseWorks = data.works.filter(work => work.visibility === 'public' && work.status === 'published');
export const getCreator = id => showcaseCreators.find(creator => creator.id === id);
export const getWork = id => showcaseWorks.find(work => work.id === id);

export function filterWorks(works, { kind = 'all', query = '', creatorId = '', sort = 'recent' } = {}) {
  const search = query.trim().toLocaleLowerCase('ko-KR');
  const filtered = works.filter(work => (kind === 'all' || work.kind === kind) && (!creatorId || work.creatorId === creatorId)
    && (!search || [work.title, work.summary, ...work.tags, getCreator(work.creatorId)?.name].join(' ').toLocaleLowerCase('ko-KR').includes(search)));
  return [...filtered].sort((a, b) => sort === 'title' ? a.title.localeCompare(b.title, 'ko') : b.publishedAt.localeCompare(a.publishedAt));
}
