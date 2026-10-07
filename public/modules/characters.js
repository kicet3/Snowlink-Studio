import { state } from './state.js';
import { escape as e, icon } from './ui.js';
import { pageHeading, button, badge, emptyState } from './components.js';

let showArchived = false;
function characterCard(c) {
  const appearances = state.productions.filter(p => p.characterIds.includes(c.id) && !p.archived).length;
  const image = c.image ? `<img src="${e(c.image)}" alt="${e(c.name)} 캐릭터 시트" loading="lazy">` : `<div class="character-placeholder">${icon('people')}<span>시트를 추가해주세요</span></div>`;
  return `<article class="surface-card character-card"><button class="character-image" data-edit-character="${c.id}" aria-label="${e(c.name)} 수정">${image}</button><div class="character-info"><div><button class="character-name" data-edit-character="${c.id}">${e(c.name)}</button><span class="small muted">${appearances}개 콘텐츠</span></div><p>${e(c.description || '외형과 성격을 기록해보세요.')}</p><div class="tag-list">${c.tags.split(',').filter(t => t.trim()).map(t => badge(t.trim(), { tone: 'pine' })).join('')}</div></div></article>`;
}
function emptyLibrary() {
  return emptyState({
    eyebrow: 'BUILD YOUR CAST',
    title: showArchived ? '보관한 캐릭터가 없습니다' : '첫 번째 캐릭터를 만나볼까요?',
    description: '사진이나 짧은 아이디어로 AI와 캐릭터를 만들고,\n템플릿을 골라 실제 시트 이미지까지 생성하세요.',
    illustrationHtml: `<div class="sheet-illustration"><div class="sheet-back"></div><div class="sheet-front">${icon('people')}<span>CHARACTER / 001</span><i></i><i></i></div></div>`,
    actionsHtml: showArchived ? '' : button('첫 캐릭터 등록', { iconName: 'plus', attrs: { 'data-new-character': true } }),
  });
}
export function renderCharacters() {
  const items = state.characters.filter(c => c.archived === showArchived);
  const heading = pageHeading({
    eyebrow: 'THE CAST OF YOUR STORIES', index: '02 / CHARACTERS', title: ['이야기는 바뀌어도,', '캐릭터는 그대로'],
    description: '외형, 성격, 시트를 함께 저장하고 콘텐츠마다 다시 선택하세요.',
    actionsHtml: button('캐릭터 등록', { iconName: 'plus', attrs: { 'data-new-character': true } }),
  });
  document.querySelector('#panel-characters').innerHTML = `<div class="page">${heading}
    <div class="library-toolbar"><h2>내 캐릭터 <span class="counter">${items.length}</span></h2><div>${button('AI와 시트 만들기', { variant: 'quiet-button', iconName: 'spark', attrs: { 'data-new-character': true } })}<button class="quiet-button ${showArchived ? 'selected' : ''}" id="character-archive" aria-pressed="${showArchived}">보관함</button></div></div>
    ${items.length ? `<div class="character-grid">${items.map(characterCard).join('')}</div>` : emptyLibrary()}
    <footer class="page-footer"><span>AI와 시트를 만들거나 완성된 이미지를 등록하고, 다음 제작에도 같은 캐릭터를 사용하세요.</span><span>PNG · JPG · WebP / 최대 6MB</span></footer></div>`;
  document.querySelector('#character-archive').addEventListener('click', () => { showArchived = !showArchived; renderCharacters(); });
}
