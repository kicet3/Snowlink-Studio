import { state } from './state.js';
import { escape as e, icon, FORMATS, STAGES } from './ui.js';
import { pageHeading, button, badge, actionCard } from './components.js';

let format = 'all';
let query = '';
let archived = false;
function card(item) {
  const type = FORMATS[item.format];
  const characters = item.characterIds.map(id => state.characters.find(c => c.id === id)).filter(Boolean);
  return `<article class="surface-card production-card"><div class="card-top">${badge(type.label, { tone: type.tone, iconName: type.icon })}<span class="small muted">${STAGES[item.stage]}</span></div>
    <button class="card-title" data-edit-production="${item.id}">${e(item.title)}</button>
    <p class="card-story">${e(item.story || '이야기나 핵심 메시지를 추가해보세요.')}</p>
    <div class="cast-line">${characters.slice(0, 3).map(c => c.image ? `<img src="${e(c.image)}" alt="${e(c.name)}">` : `<span class="avatar">${e(c.name[0])}</span>`).join('')}<span>${e(characters.map(c => c.name).join(', ') || '캐릭터 미선택')}</span></div>
    <div class="card-footer"><span>${new Date(item.updatedAt).toLocaleDateString('ko-KR', { month: 'short', day: 'numeric' })} 수정</span><button data-brief="${item.id}" class="text-button">제작 지시서 ${icon('arrow')}</button></div></article>`;
}
function columns() {
  const items = state.productions.filter(p => p.archived === archived && (format === 'all' || p.format === format) && (p.title + p.story).toLowerCase().includes(query.toLowerCase()));
  const groups = [{ name: '기획', stages: ['idea', 'script'], text: '떠오른 아이디어를 기록하세요', tone: 'maple' }, { name: '제작', stages: ['production'], text: '준비된 기획을 제작으로 옮기세요', tone: 'ochre' }, { name: '검토 · 완료', stages: ['review', 'done'], text: '완성한 콘텐츠를 모아보세요', tone: 'pine' }];
  return groups.map((g, index) => {
    const rows = items.filter(p => g.stages.includes(p.stage)).sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
    return `<section class="board-column" data-tone="${g.tone}"><div class="column-heading"><span class="stage-dot"></span><h3>${g.name}</h3><span>${rows.length.toString().padStart(2, '0')}</span></div>
      <div class="column-content">${rows.length ? rows.map(card).join('') : `<div class="column-empty">${icon(index === 0 ? 'folder' : index === 1 ? 'film' : 'check')}<span>${g.text}</span></div>`}</div>
      ${index === 0 && !archived ? button('아이디어 추가', { variant: 'add-row', iconName: 'plus', attrs: { 'data-new-production': format === 'all' ? 'story' : format } }) : ''}</section>`;
  }).join('');
}
export function renderBoard() {
  const active = state.productions.filter(p => !p.archived && p.stage !== 'done').length;
  document.querySelector('#production-count').textContent = active;
  document.querySelector('#panel-board').innerHTML = `<div class="page">${pageHeading({ eyebrow: 'A LITTLE SPARK, A NEW STORY', index: '01 / BOARD', title: '아이디어를, 하나의 콘텐츠로', description: '발견하고, 캐릭터를 고르고, 이야기를 완성하는 나의 제작 공간.', ornament: true, actionsHtml: button('새 콘텐츠', { iconName: 'plus', attrs: { 'data-new-production': 'story' } }) })}
    <div class="workflow-strip"><div class="workflow-intro"><span class="eyebrow">YOUR WORKFLOW</span><strong>흐름은 하나로.</strong></div><button data-go="trends"><span class="step-number">01</span><span>트렌드 발견<small>이야기의 시작점을 찾고</small></span>${icon('arrow')}</button><button data-go="characters"><span class="step-number">02</span><span>캐릭터 선택<small>이야기에 어울리는 얼굴을</small></span>${icon('arrow')}</button><button data-go="ima2"><span class="step-number">03</span><span>콘텐츠 제작<small>이미지와 영상으로 완성</small></span>${icon('arrow')}</button></div>
    <div class="section-heading"><h2>어떤 이야기를 만들까요?</h2><span class="small muted">형식을 선택해 기획을 시작하세요</span></div>
    <div class="format-grid">${Object.entries(FORMATS).map(([id, f]) => actionCard({ title: f.label, description: f.detail, meta: f.channel, iconName: f.icon, tone: f.tone, attrs: { 'data-new-production': id } })).join('')}</div>
    <div class="board-toolbar"><div class="board-title"><h2>제작 보드</h2><span class="counter">${state.productions.filter(p => p.archived === archived).length}</span></div><div class="filters"><select id="format-filter" aria-label="콘텐츠 형식 필터"><option value="all">모든 형식</option>${Object.entries(FORMATS).map(([id, f]) => `<option value="${id}" ${format === id ? 'selected' : ''}>${f.label}</option>`).join('')}</select><label class="search-field">${icon('search')}<input id="board-search" aria-label="콘텐츠 검색" placeholder="콘텐츠 검색" value="${e(query)}"></label><button id="archive-filter" class="quiet-button ${archived ? 'selected' : ''}" aria-pressed="${archived}">보관함</button></div></div>
    <div class="board-grid" id="board-grid">${columns()}</div>
    <footer class="page-footer"><span><span class="save-dot"></span> 이 Mac에 저장 · 연결된 기기에서 함께 사용</span><a href="/api/export" download="snowlink-backup.json">${icon('download')} 기획 데이터 백업</a></footer></div>`;
  document.querySelector('#board-search').addEventListener('input', event => { query = event.target.value; document.querySelector('#board-grid').innerHTML = columns(); });
  document.querySelector('#format-filter').addEventListener('change', event => { format = event.target.value; document.querySelector('#board-grid').innerHTML = columns(); });
  document.querySelector('#archive-filter').addEventListener('click', () => { archived = !archived; renderBoard(); });
}
