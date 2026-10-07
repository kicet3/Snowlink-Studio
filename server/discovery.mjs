const safeUrl = value => { try { const u = new URL(value); return ['https:', 'http:'].includes(u.protocol) ? u.href : ''; } catch { return ''; } };
export function relatedItems(items, keyword) {
  const needle = keyword.normalize('NFKC').toLocaleLowerCase().replace(/\s+/g, '');
  return items.filter(item => [item.title, item.text, item.description, item.name, item.account].filter(Boolean).join(' ').normalize('NFKC').toLocaleLowerCase().replace(/\s+/g, '').includes(needle));
}
function normalize(item, source) {
  const id = item.videoId || item.id;
  const url = safeUrl(item.url) || (source.startsWith('youtube') && /^[\w-]{11}$/.test(id) ? `https://www.youtube.com/watch?v=${id}` : '');
  return { id: String(id || url), title: String(item.title || item.text || '제목 없음'), url, thumbnail: safeUrl(item.thumbnail || item.thumb), author: String(item.channel || item.name || item.account || ''), views: item.views ?? null };
}
export function createDiscovery(config, fetcher = fetch) {
  const cache = new Map();
  return async params => {
    const keyword = (params.get('keyword') || '').trim();
    if (!keyword || keyword.length > 100) throw Object.assign(new Error('검색어를 1~100자로 입력해주세요.'), { status: 400 });
    const country = ['KR', 'US', 'JP'].includes(params.get('country')) ? params.get('country') : 'KR';
    const key = JSON.stringify([keyword, country]);
    const cached = cache.get(key);
    if (cached && cached.expires > Date.now()) return cached.promise;
    const promise = collect(keyword, country);
    cache.set(key, { expires: Date.now() + 120000, promise });
    if (cache.size > 60) cache.delete(cache.keys().next().value);
    return promise;
  };
  async function collect(keyword, country) {
    const q = encodeURIComponent(keyword);
    const definitions = [
      { id: 'youtube', label: 'YouTube', searchUrl: `https://www.youtube.com/results?search_query=${q}`, path: '/api/videos?' + new URLSearchParams({ q: keyword, country, shorts: '0', period: 'week', category: '전체' }), scope: '키워드 검색' },
      { id: 'youtube-shorts', label: 'YouTube Shorts', searchUrl: `https://www.youtube.com/results?search_query=${q}%20%23shorts`, path: '/api/videos?' + new URLSearchParams({ q: keyword, country, shorts: '1', period: 'week', category: '전체' }), scope: '키워드 검색' },
      { id: 'tiktok', label: 'TikTok', searchUrl: `https://www.tiktok.com/search?q=${q}`, path: '/api/tiktok', scope: '현재 수집된 영상에서 검색' },
      { id: 'instagram', label: 'Instagram Reels', searchUrl: `https://www.instagram.com/explore/search/keyword/?q=${q}`, scope: '원본 서비스에서 검색', note: 'Instagram 로그인 없이 수집하는 현재 경로가 401 로그인 요구로 차단됐습니다. 키워드 검색 연결이 필요합니다.' },
      { id: 'x', label: 'X 영상', searchUrl: `https://x.com/search?q=${encodeURIComponent(keyword + ' filter:videos')}&f=live`, scope: '원본 서비스에서 검색', note: '현재 공개 타임라인 수집은 429 요청 제한이 확인됐습니다. X API 검색은 별도 유료 연결이 필요합니다.' },
    ];
    const sources = await Promise.all(definitions.map(async source => {
      const { path, ...info } = source;
      if (!path) return { ...info, status: 'unavailable', items: [] };
      try {
        const res = await fetcher(config.tools.trends.target + path, { signal: AbortSignal.timeout(25000) });
        if (!res.ok) throw new Error(`수집 서버 응답 ${res.status}`);
        const data = await res.json();
        if (data.error || data.status === 'error') throw new Error('소스 수집에 실패했습니다. 원본 서비스에서 검색해주세요.');
        let items = data.videos || data.posts || [];
        if (!Array.isArray(items)) throw new Error('영상 목록 형식을 확인하지 못했습니다.');
        if (source.id === 'tiktok') items = relatedItems(items, keyword);
        items = items.map(item => normalize(item, source.id)).filter(item => item.url).slice(0, 12);
        return { ...info, status: items.length ? 'ok' : 'empty', items, fetchedAt: data.fetchedAt || null, note: !items.length ? `${source.scope} 범위에서 일치하는 영상이 없습니다.` : '' };
      } catch (error) { return { ...info, status: 'error', items: [], note: error.name === 'TimeoutError' ? '조회 시간이 초과됐습니다. 원본 서비스에서 검색해주세요.' : error.message }; }
    }));
    return { keyword, country, sources, fetchedAt: new Date().toISOString() };
  }
}
