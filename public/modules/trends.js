import { pageHeading, button, badge, field, emptyState } from './components.js';
import { escape as e, toast } from './ui.js';
import { toolApi } from './integration-api.js';
import { SOURCES, normalizeTrends, trendEndpoint } from './trend-data.js';
import { editProduction } from './dialogs.js';

let initialized = false;
let source = 'trends';
let items = [];
let saved = [];
let controller;
const filters = { country: 'KR', category: '전체', period: 'week', query: '' };
const panel = () => document.querySelector('#panel-trends');
const options = values => values.map(([value, label]) => ({ value, label }));
export async function openTrends() {
  if (initialized) return;
  panel().innerHTML = `<div class="studio-page">${pageHeading({ eyebrow: 'FIND YOUR NEXT STORY', index: '03 / DISCOVER', title: '지금의 관심을, 다음 이야기로', description: '여러 채널의 흐름을 살펴보고 마음에 드는 소재를 제작 기획으로 가져오세요.', actionsHtml: button('새로고침', { variant: 'secondary', iconName: 'refresh', attrs: { 'data-trend-refresh': true } }) })}<nav class="subnav" aria-label="트렌드 소스">${Object.entries(SOURCES).map(([id, name]) => button(name, { variant: 'quiet-button', attrs: { 'data-source': id, 'aria-pressed': id === source } })).join('')}</nav><form class="studio-toolbar" id="trend-filters">${field({ label: '국가', name: 'country', value: filters.country, options: options([['KR', '대한민국'], ['US', '미국'], ['JP', '일본']]) })}<span data-video-filter>${field({ label: '기간', name: 'period', value: filters.period, options: options([['day', '오늘'], ['week', '이번 주'], ['month', '이번 달']]) })}</span><span data-video-filter>${field({ label: '카테고리', name: 'category', value: filters.category, options: [{ value: '전체', label: '전체' }] })}</span><label class="field search-grow"><span>소재 검색</span><input name="query" type="search" placeholder="키워드로 찾아보세요" aria-label="트렌드 검색"></label>${button('검색', { variant: 'secondary', iconName: 'search', attrs: { type: 'submit' } })}</form><div id="trend-accounts"></div><div id="trend-notice" aria-live="polite"></div><div class="status-line"><span id="trend-summary" role="status"></span><span id="trend-updated"></span></div><div id="trend-results" class="studio-grid"></div></div>`;
  initialized = true;
  panel().querySelectorAll('[data-source]').forEach(b => b.onclick = () => { source = b.dataset.source; void load(); });
  panel().querySelector('[data-trend-refresh]').onclick = () => load(true);
  panel().querySelector('#trend-filters').onsubmit = event => { event.preventDefault(); Object.assign(filters, Object.fromEntries(new FormData(event.target))); void load(); };
  panel().querySelector('#trend-results').onclick = handleAction;
  void toolApi('trends', '/api/categories').then(data => {
    const select = panel().querySelector('[name=category]');
    select.innerHTML = (data.categories || ['전체']).map(c => `<option value="${e(c)}">${e(c)}</option>`).join('');
  }).catch(() => {});
  void load();
}
async function load(force = false) {
  controller?.abort(); controller = new AbortController();
  const current = controller;
  const selected = source;
  panel().querySelectorAll('[data-source]').forEach(b => b.setAttribute('aria-pressed', String(b.dataset.source === source)));
  panel().querySelectorAll('[data-video-filter]').forEach(n => n.hidden = !['youtube', 'shorts'].includes(source));
  panel().querySelector('#trend-accounts').innerHTML = '';
  panel().querySelector('#trend-summary').textContent = `${SOURCES[source]} 불러오는 중…${source === 'analysis' ? ' 분석에 1~2분 정도 걸릴 수 있습니다.' : ''}`;
  panel().querySelector('#trend-updated').textContent = '';
  panel().querySelector('#trend-notice').innerHTML = '';
  panel().querySelector('#trend-results').innerHTML = '';
  panel().querySelector('#trend-results').setAttribute('aria-busy', 'true');
  try {
    const data = await toolApi('trends', trendEndpoint(selected, filters, force), { signal: AbortSignal.any([current.signal, AbortSignal.timeout(180000)]) });
    if (current !== controller) return;
    items = normalizeTrends(selected, data).filter(i => !filters.query || `${i.title} ${i.description || ''} ${i.meta || ''}`.toLowerCase().includes(filters.query.toLowerCase()));
    try { saved = (selected === 'saved' ? data : await toolApi('trends', '/api/saved', { signal: current.signal })).items || []; } catch { saved = []; }
    if (current !== controller) return;
    renderResults();
    panel().querySelector('#trend-summary').textContent = `${SOURCES[selected]} · ${items.length}개의 소재`;
    panel().querySelector('#trend-updated').textContent = data.fetchedAt ? `업데이트 ${new Date(data.fetchedAt * 1000).toLocaleString('ko-KR')}` : '';
    const warnings = data.errors?.length || ['partial', 'error'].includes(data.status);
    panel().querySelector('#trend-notice').innerHTML = `${warnings ? '<p class="notice" data-tone="warning">일부 소스를 수집하지 못했습니다. 수집된 결과만 표시합니다.</p>' : ''}${data.briefing ? `<div class="notice"><strong>${data.llm?.ok === false ? '데이터 기반 요약' : 'AI 브리핑'}</strong><p>${e(data.briefing)}</p></div>` : ''}`;
    renderAccounts(data.accounts);
  } catch (error) {
    if (current !== controller) return;
    panel().querySelector('#trend-summary').textContent = '소재를 불러오지 못했습니다.';
    panel().querySelector('#trend-notice').innerHTML = `<p class="notice" role="alert">${e(error.message)}</p>`;
    panel().querySelector('#trend-results').innerHTML = emptyState({ title: '다시 연결해주세요', description: '상단 새로고침으로 다시 시도할 수 있습니다.' });
  } finally { if (current === controller) panel().querySelector('#trend-results').setAttribute('aria-busy', 'false'); }
}
function renderResults() {
  panel().querySelector('#trend-results').innerHTML = items.length ? items.map(card).join('') : emptyState({ title: '아직 모인 소재가 없어요', description: source === 'saved' ? '마음에 드는 소재에서 보관 버튼을 눌러 모아두세요.' : '검색어, 국가를 바꾸거나 수집 계정을 추가해보세요.', iconName: 'radar' });
  panel().querySelectorAll('.insight-image').forEach(img => img.onerror = () => img.hidden = true);
}
function card(item) {
  const isSaved = saved.some(s => s.url === item.url);
  return `<article class="surface-card insight-card">${item.thumbnail ? `<img class="insight-image" src="${e(item.thumbnail)}" alt="" loading="lazy">` : ''}<div class="insight-body"><div class="insight-meta">${badge(SOURCES[item.source] || item.source, { tone: 'frost' })}<span>${e(item.meta)}</span></div><h2>${e(item.title)}</h2>${item.description ? `<p class="insight-description">${e(item.description)}</p>` : ''}${item.evidence?.length ? `<div class="insight-evidence">${item.evidence.slice(0, 3).map(n => `<a href="${e(n.url)}" target="_blank" rel="noopener noreferrer">${e(n.title)} ↗</a>`).join('')}</div>` : ''}<div class="insight-actions">${button('기획으로 가져오기', { variant: 'secondary', attrs: { 'data-import-trend': item.key } })}${item.url ? button(isSaved ? '보관 해제' : '보관', { variant: 'quiet-button', attrs: { 'data-save-trend': item.key, 'aria-pressed': isSaved } }) : ''}${item.url ? `<a class="quiet-button" href="${e(item.url)}" target="_blank" rel="noopener noreferrer">원문 ↗</a>` : ''}</div></div></article>`;
}
async function handleAction(event) {
  const b = event.target.closest('button'); if (!b) return;
  const item = items.find(i => i.key === (b.dataset.importTrend ?? b.dataset.saveTrend)); if (!item) return;
  if ('importTrend' in b.dataset) { editProduction(null, source === 'youtube' ? 'youtube' : 'story', { title: item.title.slice(0, 160), source: item.url, story: item.description || '', notes: `트렌드 탐색 · ${SOURCES[item.source] || item.source}\n${item.meta || ''}` }); return; }
  b.disabled = true;
  try {
    const existing = saved.find(s => s.url === item.url);
    const result = await toolApi('trends', '/api/saved', { method: 'POST', body: existing ? { action: 'remove', id: existing.id } : { action: 'add', source: item.source, title: item.title, url: item.url, thumbnail: item.rawThumbnail, note: item.description || '', tags: [] } });
    saved = result.items || [];
    if (source === 'saved') items = normalizeTrends('saved', result);
    renderResults(); toast(existing ? '보관을 해제했습니다.' : '소재를 보관했습니다.');
  } catch (error) { toast(error.message); b.disabled = false; }
}
function renderAccounts(accounts) {
  if (!['reels', 'tiktok', 'x', 'threads'].includes(source)) return;
  const currentSource = source;
  const target = panel().querySelector('#trend-accounts');
  const names = (accounts || []).map(a => typeof a === 'string' ? a : a.username || a.account).filter(Boolean);
  target.innerHTML = `<details class="accounts-bar"><summary>수집 계정 관리 · ${names.length}개</summary><div class="account-tags">${names.map(name => `<button data-remove-account="${e(name)}" aria-label="${e(name)} 수집 계정 삭제">@${e(name)} ×</button>`).join('')}</div><form class="studio-toolbar">${field({ label: '수집할 계정', name: 'username', placeholder: '@username', attrs: { required: true, maxlength: 100 } })}${button('추가', { variant: 'secondary', attrs: { type: 'submit' } })}</form></details>`;
  async function update(action, username) {
    target.querySelectorAll('button').forEach(b => b.disabled = true);
    try { const result = await toolApi('trends', `/api/${currentSource}/accounts`, { method: 'POST', body: { action, username } }); if (source === currentSource) renderAccounts(result.accounts); toast('수집 계정을 변경했습니다. 새로고침하면 반영됩니다.'); }
    catch (error) { toast(error.message); target.querySelectorAll('button').forEach(b => b.disabled = false); }
  }
  target.querySelector('form').onsubmit = event => { event.preventDefault(); void update('add', new FormData(event.target).get('username')); };
  target.querySelectorAll('[data-remove-account]').forEach(b => b.onclick = () => update('remove', b.dataset.removeAccount));
}
