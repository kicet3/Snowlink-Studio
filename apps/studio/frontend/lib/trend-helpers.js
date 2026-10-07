import {safeUrl} from './integration-api';
export const fmt=n=>n>=1e8?(n/1e8).toFixed(1).replace(/\.0$/,'')+'억회':n>=1e4?(n/1e4).toFixed(1).replace(/\.0$/,'')+'만회':Number(n||0).toLocaleString('ko-KR')+'회';
export function errorKindLabel(kind, code) {
  if (kind === 'timeout') return '시간 초과';
  if (kind === 'parse') return '응답 해석 실패';
  if (kind === 'http') {
    if (code === 429) return '429 요청 제한';
    if (code) return `HTTP ${code}`;
    return 'HTTP 오류';
  }
  return '수집 오류';
}

export function feedFailureCount(errors) {
  const accounts = new Set((errors || []).map(error => error.account).filter(Boolean));
  return accounts.size || (errors || []).length;
}

export function feedErrorSummary(data) {
  const errors = Array.isArray(data?.errors) ? data.errors : [];
  if (!errors.length) return '수집 오류 · 계정 수집 실패';
  const groups = new Map();
  errors.forEach(error => {
    const key = `${error.kind || 'unknown'}:${error.code || ''}`;
    const current = groups.get(key) || { kind: error.kind, code: error.code, count: 0, accounts: new Set() };
    current.count += 1;
    if (error.account) current.accounts.add(error.account);
    groups.set(key, current);
  });
  return Array.from(groups.values()).map(group => {
    const count = group.accounts.size || group.count;
    return `${errorKindLabel(group.kind, group.code)} · ${count}개 계정 실패`;
  }).join(' / ');
}

export function isFeedErrorStatus(data) {
  return data?.status === 'error' || data?.status === 'blocked';
}


export function formatAge(ts) {
  if (!ts) return '';
  const s = Math.max(0, Date.now() / 1000 - ts);
  if (s < 60) return '방금';
  if (s < 3600) return Math.floor(s / 60) + '분 전';
  if (s < 86400) return Math.floor(s / 3600) + '시간 전';
  return Math.floor(s / 86400) + '일 전';
}

export function formatDuration(seconds) {
  if (!seconds) return '';
  if (seconds < 60) return Math.max(1, Math.floor(seconds)) + '초';
  if (seconds < 3600) return Math.floor(seconds / 60) + '분';
  if (seconds < 86400) return Math.floor(seconds / 3600) + '시간';
  return Math.floor(seconds / 86400) + '일';
}

export function cacheAgeText(data) {
  if (!data || !data.fetchedAt || !data.cacheTtl) return '';
  return `${formatAge(data.fetchedAt)} 수집 · ${formatDuration(data.cacheTtl)} 캐시`;
}


export function timeAgo(ts) {
  if (!ts) return '';
  const s = Date.now() / 1000 - ts;
  if (s < 3600) return Math.max(1, Math.floor(s / 60)) + '분 전';
  if (s < 86400) return Math.floor(s / 3600) + '시간 전';
  return Math.floor(s / 86400) + '일 전';
}


export const fmt2 = n => {
  if (n >= 1e8) return (n / 1e8).toFixed(1).replace(/\.0$/, '') + '억';
  if (n >= 1e4) return (n / 1e4).toFixed(1).replace(/\.0$/, '') + '만';
  if (n >= 1e3) return (n / 1e3).toFixed(1).replace(/\.0$/, '') + '천';
  return (n || 0).toLocaleString('ko-KR');
};


export function firstNonEmpty(...values) {
  return values.find(value => value !== undefined && value !== null && value !== '') || '';
}

export function aiHomeItems(data) {
  const news = (data.news || []).slice(0, 5).map(n => ({
    title: n.title,
    meta: [firstNonEmpty(n.source, n.region), timeAgo(n.ts)].filter(Boolean),
    url: n.link,
    seenId: n.link,
  }));
  if (news.length) return news;
  return [...(data.models?.trending || []), ...(data.models?.latest || [])].slice(0, 5).map(m => ({
    title: m.id,
    meta: [m.pipeline, `좋아요 ${fmt2(m.likes)}`, `다운로드 ${fmt2(m.downloads)}`],
    url: 'https://huggingface.co/' + m.id,
    seenId: 'https://huggingface.co/' + m.id,
  }));
}

export function homeItems(section, data) {
  if (section.key === 'analysis') {
    return (data.clusters || []).slice(0, 5).map(cluster => ({
      title: cluster.title,
      thumbnail: '',
      meta: [...(cluster.platforms || []).slice(0, 3), cluster.momentum].filter(Boolean),
      hot: cluster.momentum,
      url: safeUrl(cluster.evidence && cluster.evidence[0] && cluster.evidence[0].url) || '',
      seenId: `${data.country}|${cluster.title}`,
    }));
  }
  if (section.key === 'trends') {
    return (data.trends || []).slice(0, 5).map(t => ({
      title: t.keyword,
      thumbnail: t.picture ? `/integrations/trends/api/img?u=${encodeURIComponent(t.picture)}` : '',
      meta: [`검색 ${t.traffic || '-'}`, (t.news && t.news[0] && t.news[0].source) || '', timeAgo(t.ts)].filter(Boolean),
      hot: `검색 ${t.traffic || '-'}`,
      url: safeUrl(t.news && t.news[0] && t.news[0].url) || ('https://www.google.com/search?q=' + encodeURIComponent(t.keyword)),
      seenId: 'trend:' + t.keyword,
    }));
  }
  if (section.key === 'youtube' || section.key === 'shorts') {
    return (data.videos || []).slice(0, 5).map(v => ({
      title: v.title,
      thumbnail: v.thumbnail,
      meta: [fmt(v.views), v.channel, v.published].filter(Boolean),
      hot: fmt(v.views),
      videoId: v.id,
      url: `https://www.youtube.com/watch?v=${v.id}`,
      seenId: `https://www.youtube.com/watch?v=${v.id}`,
      vertical: section.key === 'shorts',
    }));
  }
  if (section.key === 'ai') return aiHomeItems(data);
  if (section.key === 'date') {
    return (data.ideas || []).slice(0, 5).map(item => ({
      title: item.title,
      thumbnail: item.thumbnail ? `/integrations/trends/api/img?u=${encodeURIComponent(item.thumbnail)}` : '',
      meta: [item.source, item.metric, item.account ? `@${item.account}` : '', ...(item.tags || []).slice(0, 1)].filter(Boolean),
      hot: item.metric || item.source,
      url: safeUrl(item.url),
      seenId: item.id || item.url,
    }));
  }
  if (section.key === 'reels' || section.key === 'tiktok') {
    const posts = section.key === 'reels' ? (data.reels || []) : (data.posts || []);
    return posts.slice(0, 5).map(p => ({
      title: p.title,
      thumbnail: p.thumbnail ? `/integrations/trends/api/img?u=${encodeURIComponent(p.thumbnail)}` : '',
      meta: [`조회수 ${fmt2(p.views)}`, p.account ? `@${p.account}` : '', `좋아요 ${fmt2(p.likes)}`].filter(Boolean),
      hot: `조회수 ${fmt2(p.views)}`,
      url: p.url,
      seenId: p.url,
      vertical: true,
    }));
  }
  return (data.posts || []).slice(0, 5).map(p => {
    const reposts = section.key === 'threads' ? (p.reposts || 0) : (p.retweets || 0);
    return {
      title: p.text,
      thumbnail: p.media ? `/integrations/trends/api/img?u=${encodeURIComponent(p.media)}` : '',
      meta: [p.account ? `@${p.account}` : '', `좋아요 ${fmt2(p.likes)}`, `댓글 ${fmt2(p.replies)}`, `공유 ${fmt2(reposts)}`].filter(Boolean),
      hot: `좋아요 ${fmt2(p.likes)}`,
      url: p.url,
      seenId: p.url,
    };
  });
}
