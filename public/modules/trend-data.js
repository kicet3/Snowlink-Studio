import { safeUrl, toolPath } from './integration-api.js';

export const SOURCES = { trends: '급상승 검색', youtube: 'YouTube', shorts: 'Shorts', reels: 'Instagram', tiktok: 'TikTok', x: 'X', threads: 'Threads', ai: 'AI 소식', date: '데이트 소재', analysis: 'AI 분석', saved: '보관함' };
export function trendEndpoint(source, filters = {}, force = false) {
  const query = new URLSearchParams({ country: filters.country || 'KR', category: filters.category || '전체', period: filters.period || 'week', q: filters.query || '', shorts: source === 'shorts' ? '1' : '0', enrich: '0' });
  if (force) query.set('force', '1');
  return `/api/${['youtube', 'shorts'].includes(source) ? 'videos' : source}?${query}`;
}
const metric = value => Number(value || 0).toLocaleString('ko-KR', { notation: 'compact', maximumFractionDigits: 1 });
export function normalizeTrends(source, data) {
  let items;
  if (source === 'trends') items = (data.trends || []).map(t => ({ title: t.keyword, thumbnail: t.picture, url: t.news?.[0]?.url || `https://www.google.com/search?q=${encodeURIComponent(t.keyword)}`, meta: `검색 ${t.traffic || '집계 중'}`, description: t.news?.[0]?.title, evidence: t.news }));
  else if (['youtube', 'shorts'].includes(source)) items = (data.videos || []).map(v => ({ ...v, url: `https://www.youtube.com/watch?v=${encodeURIComponent(v.id)}`, meta: `${v.channel || 'YouTube'} · 조회 ${metric(v.views)}`, description: v.published }));
  else if (source === 'analysis') items = (data.clusters || []).map(c => ({ ...c, url: c.evidence?.[0]?.url, description: c.why, meta: [...(c.platforms || []), c.momentum].filter(Boolean).join(' · ') }));
  else if (source === 'ai') items = [
    ...(data.models?.latest || []).map(m => ({ title: m.name || m.id, url: m.url || `https://huggingface.co/${m.id}`, meta: '새 AI 모델', description: [m.pipeline_tag, m.author].filter(Boolean).join(' · ') })),
    ...(data.models?.trending || []).map(m => ({ title: m.name || m.id, url: m.url || `https://huggingface.co/${m.id}`, meta: '인기 AI 모델', description: m.pipeline_tag })),
    ...(data.news || []).map(n => ({ ...n, url: n.link, meta: [n.category, n.source].filter(Boolean).join(' · ') })),
  ];
  else if (source === 'date') items = (data.ideas || []).map(i => ({ ...i, meta: [i.source, i.metric, ...(i.tags || [])].filter(Boolean).join(' · '), description: i.summary || i.reason }));
  else if (source === 'saved') items = (data.items || []).map(i => ({ ...i, description: i.note, meta: SOURCES[i.source] || i.source }));
  else items = (data.reels || data.posts || []).map(p => ({ ...p, title: p.title || p.text, thumbnail: p.thumbnail || p.media, meta: [p.account && `@${p.account}`, `좋아요 ${metric(p.likes)}`, p.views && `조회 ${metric(p.views)}`].filter(Boolean).join(' · ') }));
  return items.map((item, index) => ({ ...item, key: String(index), source: item.source || source, title: item.title || '제목 없음', url: safeUrl(item.url), thumbnail: imageUrl(item.thumbnail), rawThumbnail: originalImage(item.thumbnail), evidence: (item.evidence || []).filter(n => safeUrl(n.url)).map(n => ({ title: n.title || n.source || '참고 자료', url: safeUrl(n.url) })) }));
}
function originalImage(value) {
  if (!value) return '';
  if (value.startsWith('/api/img?')) return safeUrl(new URL(value, 'http://localhost').searchParams.get('u'));
  return safeUrl(value);
}
function imageUrl(value) {
  const url = originalImage(value);
  return url ? toolPath('trends', `/api/img?u=${encodeURIComponent(url)}`) : '';
}
