import { state, api } from './state.js';
import { escape as e, icon, toast, download } from './ui.js';
import { openDialog } from './dialogs.js';
import { pageHeading, button, emptyState, field } from './components.js';

const panel = document.querySelector('#panel-shortgpt');
let productionId = '';
let edit = { revision: 0, cuts: [], history: [], messages: [] };
let selected = 0;
let busy = false;
let provider = 'gpt';
let requestSerial = 0;
let renderJob;
const production = () => state.productions.find(p => p.id === productionId);
const options = () => state.productions.filter(p => !p.archived).map(p => `<option value="${p.id}" ${p.id === productionId ? 'selected' : ''}>${e(p.title)}</option>`).join('');

export async function renderEditor() {
  if (panel.dataset.ready) {
    try { showAi(await api('/api/ai/status')); } catch { /* Keep the editor available while OAuth status is offline. */ }
    return;
  }
  panel.dataset.ready = 'true';
  const selector = `<div class="ai-selector"><label for="ai-provider">대화 · 트렌드 AI</label><select id="ai-provider"><option value="gpt">GPT OAuth</option><option value="grok">Grok OAuth</option></select><span id="ai-status" role="status">로그인 상태 확인 중…</span></div>`;
  const heading = pageHeading({ eyebrow: 'FROM SCRIPT TO SCENE', index: '05 / SHORTGPT', title: ['컷은 더 자유롭게.', '수정은 대화로'], description: '“두 번째 컷을 3초로 줄여줘”, “마지막 장면에 반전을 넣어줘”', actionsHtml: selector });
  panel.innerHTML = `<div class="cuts-page">${heading}
    <div class="cut-project-toolbar"><label>제작 기획<select id="cut-project"><option value="">콘텐츠를 선택하세요</option>${options()}</select></label><div>${button('다시 불러오기', { variant: 'quiet-button', iconName: 'refresh', attrs: { id: 'reload-cuts' } })}${button('대본으로 컷 나누기', { variant: 'secondary', iconName: 'spark', attrs: { id: 'seed-cuts' } })}</div></div>
    ${emptyState({ id: 'cuts-empty', iconName: 'film', title: '이야기를 장면으로 펼쳐보세요', description: '제작 보드에 저장한 콘텐츠를 선택한 뒤 대본으로 컷을 나누세요.\n캐릭터 설정이 함께 전달되고, 변경한 컷은 다시 되돌릴 수 있습니다.', actionsHtml: button('콘텐츠 기획 만들기', { iconName: 'plus', attrs: { 'data-new-production': 'story' } }) })}
    <div class="cut-editor-grid" id="cut-editor-grid" hidden><div class="cut-workspace"><div class="cut-preview" id="cut-preview"></div><div class="cut-actions"><span id="cut-summary"></span><div><button class="quiet-button" id="undo-cuts">되돌리기</button><button class="quiet-button" id="export-cuts">${icon('download')} 컷 JSON</button><button class="secondary" id="render-cuts">${icon('film')} 콘티 MP4</button></div></div><div id="render-output" role="status"></div><div id="timeline" class="timeline"></div><button class="add-row" id="add-cut">${icon('plus')} 빈 컷 추가</button><p class="cut-note">콘티 MP4는 선택한 시트와 대사로 만든 무음 미리보기입니다. 완성 영상은 이미지 · 영상 제작에서 이어가세요.</p></div>
    <aside class="chat-panel"><div class="chat-heading">${icon('spark')} 컷 편집 어시스턴트<span>OAUTH</span></div><div id="cut-chat" class="chat-history" aria-live="polite"></div><form id="cut-chat-form"><label for="cut-message" class="sr-only">컷 수정 요청</label><textarea id="cut-message" rows="3" maxlength="5000" required placeholder="예: 2번과 3번 컷의 순서를 바꾸고, 마지막 컷을 5초로 늘려줘"></textarea><div><span>변경 이력 자동 저장</span><button class="primary" type="submit">보내기 ${icon('arrow')}</button></div></form></aside></div></div>`;
  panel.querySelector('#cut-project').onchange = event => { productionId = event.target.value; void loadEdit(); };
  panel.querySelector('#reload-cuts').onclick = async () => {
    try { showAi(await api('/api/ai/status')); await loadEdit(); } catch (error) { toast(error.message); }
  };
  panel.querySelector('#seed-cuts').onclick = () => void sendChat('기획의 대본과 캐릭터 설정으로 자연스러운 컷 구성을 만들어줘. 기존 컷이 있다면 전체 흐름을 유지하면서 대본에 맞게 보완해줘.');
  panel.querySelector('#cut-chat-form').onsubmit = event => { event.preventDefault(); void sendChat(panel.querySelector('#cut-message').value); };
  panel.querySelector('#add-cut').onclick = () => changeCuts([...edit.cuts, { id: crypto.randomUUID(), title: `컷 ${edit.cuts.length + 1}`, duration: 4, narration: '', visual: '', characterId: production()?.characterIds[0] || '' }]);
  panel.querySelector('#undo-cuts').onclick = () => mutate('undo', { revision: edit.revision });
  panel.querySelector('#export-cuts').onclick = () => download(`${production()?.title || 'storyboard'}-cuts.json`, JSON.stringify({ production: production(), ...edit }, null, 2), 'application/json');
  panel.querySelector('#render-cuts').onclick = startRender;
  panel.querySelector('#ai-provider').onchange = async event => {
    const previous = provider;
    provider = event.target.value;
    try { const status = await api('/api/ai/provider', 'PUT', { provider }); showAi(status); toast('대화 · 트렌드 AI 연결을 변경했습니다.'); }
    catch (error) { provider = previous; event.target.value = previous; toast(error.message); }
  };
  try { showAi(await api('/api/ai/status')); } catch { panel.querySelector('#ai-status').textContent = '로그인 확인 실패 · 설정 · OAuth 확인'; }
  if (productionId) await loadEdit();
}
function showAi(status) {
  provider = status.selected;
  panel.querySelector('#ai-provider').value = provider;
  panel.querySelector('#ai-status').dataset.ready = String(status.providers[provider].ready);
  panel.querySelector('#ai-status').textContent = status.providers[provider].ready ? `${status.selectedModel || status.providers[provider].model} · 로그인됨` : '로그인 필요 · 설정 · OAuth에서 연결';
}
async function loadEdit() {
  if (busy) return;
  const serial = ++requestSerial;
  panel.querySelector('#cuts-empty').hidden = !!productionId;
  panel.querySelector('#cut-editor-grid').hidden = !productionId;
  panel.querySelector('#render-output').innerHTML = '';
  renderJob = undefined;
  if (!productionId) return;
  try {
    const result = await api(`/api/edits/${productionId}`);
    if (serial !== requestSerial) return;
    edit = result; selected = 0; draw();
  } catch (error) { toast(error.message); }
}
function draw() {
  selected = Math.max(0, Math.min(selected, edit.cuts.length - 1));
  const cut = edit.cuts[selected];
  const character = state.characters.find(c => c.id === cut?.characterId);
  panel.querySelector('#cut-preview').innerHTML = cut ? `<div class="preview-visual">${character?.image ? `<img src="${character.image}" alt="${e(character.name)} 시트">` : `<div class="preview-placeholder">${icon('image')}<span>${character ? '등록된 시트 이미지 없음' : '캐릭터 미선택'}</span></div>`}<span class="preview-index">CUT ${String(selected + 1).padStart(2, '0')} / ${cut.duration}s</span></div><div class="preview-copy"><p class="eyebrow">${e(character?.name || 'STORYBOARD')}</p><h2>${e(cut.title)}</h2><p>${e(cut.narration || '대사를 입력해주세요.')}</p><small>${e(cut.visual || '장면 설명을 입력해주세요.')}</small><button class="quiet-button" id="edit-selected-cut">컷 직접 수정 ${icon('arrow')}</button></div>` : `<div class="preview-placeholder">${icon('film')}<h2>아직 컷이 없습니다</h2><span>대본으로 나누거나 빈 컷을 추가하세요.</span></div>`;
  panel.querySelector('#edit-selected-cut')?.addEventListener('click', () => editCut(selected));
  panel.querySelector('#cut-summary').textContent = `${edit.cuts.length} CUTS · ${edit.cuts.reduce((sum, c) => sum + c.duration, 0)}초 · 수정 ${edit.revision}`;
  panel.querySelector('#timeline').innerHTML = edit.cuts.map((c, i) => `<button class="timeline-cut ${selected === i ? 'active' : ''}" data-cut-index="${i}"><span>${String(i + 1).padStart(2, '0')}<small>${c.duration}s</small></span><strong>${e(c.title)}</strong></button>`).join('');
  panel.querySelectorAll('[data-cut-index]').forEach(button => button.onclick = () => { selected = Number(button.dataset.cutIndex); draw(); });
  panel.querySelector('#cut-chat').innerHTML = edit.messages.length ? edit.messages.map(m => `<div class="chat-message ${m.role}"><span>${m.role === 'user' ? '나' : m.provider === 'grok' ? 'Grok OAuth' : 'GPT OAuth'}</span><p>${e(m.text)}</p></div>`).join('') : `<div class="chat-welcome">${icon('spark')}<h3>어떤 장면을 바꿀까요?</h3><p>컷 번호와 원하는 변경을 말해주세요.<br>순서, 길이, 대사, 등장 캐릭터를 함께 수정할 수 있어요.</p></div>`;
  setBusy(busy);
}
function setBusy(value) {
  busy = value;
  for (const selector of ['#seed-cuts', '#cut-project', '#reload-cuts', '#add-cut', '#undo-cuts', '#edit-selected-cut', '#ai-provider', '#cut-chat-form button']) {
    const element = panel.querySelector(selector); if (element) element.disabled = busy;
  }
  panel.querySelector('#undo-cuts').disabled = busy || !edit.history.length;
  panel.querySelector('#render-cuts').disabled = busy || !edit.cuts.length || !!renderJob;
  panel.querySelector('#add-cut').disabled = busy || edit.cuts.length >= 40;
  panel.querySelector('#cut-chat-form button').textContent = busy ? '수정 중…' : '보내기 →';
}
async function sendChat(message) {
  if (busy) return;
  if (!productionId) { toast('먼저 제작 기획을 선택해주세요.'); return; }
  setBusy(true);
  const history = panel.querySelector('#cut-chat');
  history.insertAdjacentHTML('beforeend', '<div class="chat-pending" role="status">컷 구성을 검토하고 있습니다…</div>');
  history.scrollTop = history.scrollHeight;
  try {
    edit = await api(`/api/edits/${productionId}/chat`, 'POST', { message, provider, revision: edit.revision });
    panel.querySelector('#cut-message').value = '';
    draw(); toast('컷 구성을 수정했습니다.');
  } catch (error) { toast(error.message); }
  finally { panel.querySelector('.chat-pending')?.remove(); setBusy(false); }
}
async function mutate(action, body) {
  if (busy) return;
  setBusy(true);
  try { edit = await api(`/api/edits/${productionId}${action ? '/' + action : ''}`, action ? 'POST' : 'PUT', body); draw(); return true; }
  catch (error) { toast(error.message); return false; }
  finally { setBusy(false); }
}
async function changeCuts(cuts) { return mutate('', { revision: edit.revision, cuts }); }
function editCut(index) {
  const cut = edit.cuts[index];
  const characterOptions = [{ value: '', label: '선택 안 함' }, ...state.characters.filter(c => production().characterIds.includes(c.id)).map(c => ({ value: c.id, label: c.name }))];
  const fields = [
    field({ label: '컷 제목', name: 'title', value: cut.title, attrs: { required: true, maxlength: 120 } }),
    `<div class="form-row">${field({ label: '길이 (초)', name: 'duration', type: 'number', value: cut.duration, attrs: { min: 1, max: 30, step: 0.1, required: true } })}${field({ label: '캐릭터', name: 'characterId', value: cut.characterId, options: characterOptions })}</div>`,
    field({ label: '대사 · 내레이션', name: 'narration', value: cut.narration, rows: 3, attrs: { maxlength: 2000 } }),
    field({ label: '장면 설명', name: 'visual', value: cut.visual, rows: 3, attrs: { maxlength: 2000 } }),
  ].join('');
  const actions = button('← 앞으로', { variant: 'quiet-button', attrs: { id: 'cut-left', disabled: index === 0 } }) + button('뒤로 →', { variant: 'quiet-button', attrs: { id: 'cut-right', disabled: index === edit.cuts.length - 1 } }) + button('삭제', { variant: 'quiet-button', attrs: { id: 'cut-remove', disabled: edit.cuts.length === 1 } });
  openDialog(`컷 ${index + 1} 수정`, `<form id="cut-form" class="editor-form">${fields}<div class="form-footer"><div>${actions}</div>${button('저장', { attrs: { type: 'submit' } })}</div></form>`);
  const dialog = document.querySelector('#editor');
  dialog.querySelector('form').onsubmit = async event => {
    event.preventDefault();
    const data = Object.fromEntries(new FormData(event.target));
    const cuts = edit.cuts.map((c, i) => i === index ? { ...c, ...data, duration: Number(data.duration) } : c);
    if (await changeCuts(cuts)) dialog.close();
  };
  const reorder = async direction => { const cuts = [...edit.cuts]; [cuts[index], cuts[index + direction]] = [cuts[index + direction], cuts[index]]; if (await changeCuts(cuts)) { selected = index + direction; draw(); dialog.close(); } };
  dialog.querySelector('#cut-left').onclick = () => reorder(-1);
  dialog.querySelector('#cut-right').onclick = () => reorder(1);
  dialog.querySelector('#cut-remove').onclick = async () => { if (await changeCuts(edit.cuts.filter((_, i) => i !== index))) dialog.close(); };
}
async function startRender() {
  if (renderJob) return;
  const output = panel.querySelector('#render-output');
  try {
    renderJob = await api(`/api/edits/${productionId}/render`, 'POST', { revision: edit.revision });
    setBusy(busy); output.textContent = 'ShortGPT로 콘티를 출력하고 있습니다…';
    const id = renderJob.id;
    const poll = async () => {
      if (renderJob?.id !== id) return;
      try {
        const job = await api(`/api/renders/${id}`);
        if (job.state === 'rendering') { setTimeout(poll, 2500); return; }
        renderJob = undefined; setBusy(busy);
        if (job.state === 'failed') { output.textContent = job.error; return; }
        output.innerHTML = `<p>수정 ${job.revision} 기준 콘티 · 최신 컷을 반영하려면 다시 출력하세요.</p><a class="primary" href="${job.url}" download>콘티 MP4 다운로드 ${icon('download')}</a><video src="${job.url}" controls preload="metadata" aria-label="ShortGPT 콘티 영상"></video>`;
      } catch (error) { renderJob = undefined; output.textContent = error.message; setBusy(busy); }
    };
    setTimeout(poll, 2000);
  } catch (error) { renderJob = undefined; setBusy(busy); toast(error.message); }
}
document.addEventListener('workspace-updated', () => {
  const select = panel.querySelector('#cut-project');
  if (select) select.innerHTML = '<option value="">콘텐츠를 선택하세요</option>' + options();
});
