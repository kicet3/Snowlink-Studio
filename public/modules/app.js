import { state, refresh } from './state.js';
import { icon, toast } from './ui.js';
import { renderBoard } from './board.js';
import { renderCharacters } from './characters.js';
import { editCharacter, editProduction, showBrief, showGuide } from './dialogs.js';
import { checkConnections } from './tools.js';
import { emptyState, button as actionButton } from './components.js';
import { renderEditor } from './cuts.js';
import { ensureAccount } from './account.js';

await ensureAccount();

document.querySelectorAll('[data-icon]').forEach(node => node.innerHTML = icon(node.dataset.icon));
const tabs = [...document.querySelectorAll('[data-tab]')];
const routes = {
  scenarios: () => import('./scenarios.js').then(m => m.openScenarios()),
  trends: () => import('./tool-workspace.js').then(m => m.openTool('trends')),
  ima2: () => import('./media-workspace.js').then(m => m.openMediaWorkspace()),
  settings: () => import('./settings.js').then(m => m.openSettings()),
};
function closeMenu() {
  document.body.classList.remove('menu-open');
  document.querySelector('#menu-toggle').setAttribute('aria-expanded', 'false');
  document.querySelector('#nav-backdrop').hidden = true;
  document.querySelector('#sidebar').inert = window.matchMedia('(max-width: 760px)').matches;
  document.querySelector('#workspace').inert = false;
}
function navigate() {
  const target = location.hash.slice(1).split("/")[0];
  if (target === 'workspace') return;
  const active = target === 'oauth' ? 'oauth' : tabs.some(t => t.dataset.tab === target) ? target : 'board';
  tabs.forEach(tab => {
    const selected = tab.dataset.tab === active;
    if (selected) tab.setAttribute('aria-current', 'page'); else tab.removeAttribute('aria-current');
    document.querySelector(`#panel-${tab.dataset.tab}`).hidden = !selected;
  });
  closeMenu();
  document.querySelector('#panel-oauth').hidden = active !== 'oauth';
  if (active === 'oauth') { document.title = 'MCP 연결 승인 · Snowframe Studio'; void import('./oauth-consent.js').then(m => m.openOAuthConsent()); return; }
  document.title = `${tabs.find(t => t.dataset.tab === active).querySelectorAll('span')[1].textContent} · Snowframe Studio`;
  if (routes[active]) void routes[active]().catch(error => {
    const panel = document.querySelector(`#panel-${active}`);
    panel.innerHTML = emptyState({ title: '화면을 불러오지 못했습니다', description: error.message, actionsHtml: actionButton('다시 시도', {attrs: {'data-route-retry': true}}) });
    panel.querySelector('[data-route-retry]').onclick = navigate;
  });
  if (active === 'shortgpt' && state.loaded) renderEditor();
}
// Anchor navigation works with direct URLs, browser history, and reselecting the current page.
document.querySelector('.side-nav').addEventListener('click', event => {
  const link = event.target.closest('[data-tab]');
  if (!link || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
  if (location.hash === link.hash) { event.preventDefault(); navigate(); }
  closeMenu();
});
document.querySelector('#menu-toggle').onclick = () => {
  const open = document.body.classList.toggle('menu-open');
  document.querySelector('#menu-toggle').setAttribute('aria-expanded', String(open));
  document.querySelector('#nav-backdrop').hidden = !open;
  document.querySelector('#sidebar').inert = !open;
  document.querySelector('#workspace').inert = open;
  if (open) tabs.find(t => t.hasAttribute('aria-current'))?.focus();
};
document.querySelector('#nav-backdrop').onclick = closeMenu;
window.matchMedia('(max-width: 760px)').addEventListener('change', closeMenu);
document.addEventListener('keydown', event => { if (event.key === 'Escape' && document.body.classList.contains('menu-open')) { closeMenu(); document.querySelector('#menu-toggle').focus(); } });
document.addEventListener('click', event => {
  const button = event.target.closest('button');
  if (!button) return;
  const data = button.dataset;
  if (data.tab || data.go) location.hash = data.tab || data.go;
  if (data.newProduction) editProduction(null, data.newProduction);
  if ('newCharacter' in data) editCharacter();
  if (data.editProduction) editProduction(state.productions.find(p => p.id === data.editProduction));
  if (data.editCharacter) editCharacter(state.characters.find(c => c.id === data.editCharacter));
  if (data.brief) showBrief(state.productions.find(p => p.id === data.brief));
});
document.querySelector('.side-nav').addEventListener('keydown', event => {
  if (!['ArrowUp', 'ArrowDown', 'Home', 'End'].includes(event.key)) return;
  event.preventDefault();
  const index = tabs.indexOf(document.activeElement);
  const next = event.key === 'Home' ? 0 : event.key === 'End' ? tabs.length - 1 : (index + (event.key === 'ArrowDown' ? 1 : -1) + tabs.length) % tabs.length;
  tabs[next].focus(); location.hash = tabs[next].dataset.tab;
});
document.querySelector('#guide-button').onclick = showGuide;
document.addEventListener('workspace-updated', () => { renderBoard(); renderCharacters(); });
window.addEventListener('hashchange', navigate);
async function boot() {
  navigate();
  try { await refresh(); if (location.hash === '#shortgpt') renderEditor(); }
  catch (error) {
    document.querySelector('#panel-board').innerHTML = '<div class="tool-offline"><h2>작업실을 불러오지 못했습니다</h2><p>서버 연결을 확인하고 페이지를 새로고침해주세요.</p></div>';
    toast(error.message);
  }
  await checkConnections();
}
void boot();
setInterval(() => { if (!document.hidden) void checkConnections(); }, 20000);
