import { escape as e, toast } from './ui.js';
import { state, api } from './state.js';
import { toolApi, readImage } from './integration-api.js';
import { generationRequest, mediaAssets, assetUrl } from './media-data.js';
import { mediaPage, assetMarkup, jobMarkup, emptyResults } from './media-view.js';
import { initializeJobs, jobs, submitJob, cancelJob, reconcileJobs } from './media-jobs.js';
import { editCharacter } from './dialogs.js';
import { emptyState } from './components.js';

let initialized = false;
let mode = 'image';
let models;
let authState;
let references = [];
let submitting = false;
let preparing = false;
let historyCursor;
let historyBusy = false;
const panel = () => document.querySelector('#panel-ima2');
const form = () => panel().querySelector('#media-form');
function setPreparing(value) {
  preparing = value;
  for (const name of ['production', 'character']) form().elements[name].disabled = value;
  panel().querySelector('#media-files').disabled = value;
}
export async function openMedia() {
  if (initialized) { if (!models) await loadModels(); return; }
  panel().innerHTML = mediaPage();
  initialized = true;
  panel().querySelectorAll('[data-media-mode]').forEach(b => b.onclick = () => changeMode(b.dataset.mediaMode));
  form().onsubmit = generate;
  form().elements.provider.onchange = updateModels;
  form().elements.character.onchange = event => { const character = state.characters.find(c => c.id === event.target.value); if (character) void addCharacter(character); event.target.value = ''; };
  form().elements.production.onchange = loadProduction;
  panel().querySelector('#media-files').onchange = uploadFiles;
  panel().querySelector('[data-sheet-prompt]').onclick = () => { form().elements.prompt.value += '\n캐릭터 디자인 시트. 같은 캐릭터의 정면, 측면, 후면과 다양한 표정을 한 장에 배치. 외형과 의상의 특징을 모든 뷰에서 일관되게 유지. 깔끔한 밝은 배경.'; form().elements.prompt.focus(); };
  panel().querySelector('[data-sync-jobs]').onclick = async () => { await reconcileJobs(); toast('생성 상태를 확인했습니다.'); };
  panel().querySelector('[data-history-refresh]').onclick = () => loadHistory();
  panel().querySelector('[data-history-more]').onclick = () => loadHistory(true);
  panel().addEventListener('click', assetAction);
  document.addEventListener('media-jobs-updated', renderJobs);
  document.addEventListener('workspace-updated', populateWorkspace);
  document.addEventListener('oauth-updated', () => void loadModels());
  populateWorkspace(); initializeJobs(); renderJobs(); await loadModels();
}
function populateWorkspace() {
  if (!initialized) return;
  for (const [name, records, label] of [['production', state.productions, '기획 선택 (선택 사항)'], ['character', state.characters, '캐릭터 선택 (선택 사항)']]) {
    const select = form().elements[name]; const previous = select.value;
    select.innerHTML = `<option value="">${label}</option>` + records.filter(r => !r.archived && (name !== 'character' || r.image)).map(r => `<option value="${e(r.id)}">${e(r.title || r.name)}</option>`).join('');
    select.value = previous;
  }
}
async function loadModels() {
  try { [models, authState] = await Promise.all([toolApi('ima2', '/api/models'), api('/api/ai/status')]); updateModels(); panel().querySelector('#media-notice').innerHTML = ''; }
  catch (error) { panel().querySelector('#media-notice').innerHTML = `<p class="notice" role="alert">${e(error.message)} <a href="#settings">설정에서 연결 확인 ↗</a></p>`; }
}
function updateModels() {
  const provider = form().elements.provider.value;
  const lane = models?.lanes?.[provider];
  const select = form().elements.model; const before = select.value;
  const kind = mode === 'video' ? 'video' : 'image';
  select.innerHTML = (lane?.models?.[kind] || []).map(m => `<option value="${e(m.id)}">${e(m.label || m.id)}</option>`).join('');
  if ([...select.options].some(o => o.value === before)) select.value = before;
  else if (lane?.defaults?.[kind]) select.value = lane.defaults[kind];
  panel().querySelector('#generation-auth-state').textContent = authState?.providers?.[provider === 'oauth' ? 'gpt' : 'grok']?.ready && lane?.status === 'ready' ? `${provider === 'grok' ? 'Grok' : 'GPT'} OAuth 연결됨` : '설정에서 OAuth 연결 상태를 확인해주세요.';
}
function changeMode(value) {
  mode = value;
  panel().querySelectorAll('[data-media-mode]').forEach(b => b.setAttribute('aria-pressed', String(b.dataset.mediaMode === mode)));
  panel().querySelector('#media-layout').hidden = mode === 'history';
  panel().querySelector('#media-history').hidden = mode !== 'history';
  if (mode === 'history') { void loadHistory(); return; }
  panel().querySelector('[data-image-options]').hidden = mode === 'video';
  panel().querySelector('[data-video-options]').hidden = mode !== 'video';
  panel().querySelector('[data-image-count]').hidden = mode === 'edit';
  form().elements.provider.disabled = mode === 'video';
  if (mode === 'video') form().elements.provider.value = 'grok';
  panel().querySelector('#reference-limit').textContent = mode === 'video' ? '최대 14장' : mode === 'edit' ? '원본 1장' : '최대 5장';
  panel().querySelector('#generate-button span').textContent = mode === 'video' ? '영상 생성' : mode === 'edit' ? '이미지 편집' : '이미지 생성';
  panel().querySelector('#media-mode-description').textContent = mode === 'edit' ? '원본 1장을 올리고 변경할 내용을 설명하세요.' : mode === 'video' ? '첫 프레임 또는 캐릭터 참고 이미지를 함께 사용할 수 있어요.' : '캐릭터 시트를 참고 이미지로 활용해보세요.';
  updateModels();
}
function showReferences() {
  panel().querySelector('#reference-list').innerHTML = references.map((r, i) => `<figure><img src="${e(r.data)}" alt="${e(r.name)}"><button type="button" data-remove-reference="${i}" aria-label="${e(r.name)} 제거">×</button></figure>`).join('');
}
async function uploadFiles(event) {
  const files = [...event.target.files]; event.target.value = '';
  if (preparing) return; setPreparing(true);
  try { for (const file of files) { if (references.length >= 14) throw new Error('참고 이미지는 최대 14장까지 추가할 수 있습니다.'); references.push({ name: file.name, data: await readImage(file) }); } }
  catch (error) { toast(error.message); }
  finally { setPreparing(false); showReferences(); }
}
async function imageData(url) {
  const response = await fetch(url, { signal: AbortSignal.timeout(30000) });
  if (!response.ok) throw new Error('이미지를 불러오지 못했습니다.');
  return readImage(await response.blob());
}
async function addCharacter(character) {
  if (preparing) return; setPreparing(true);
  try {
    if (references.length >= 14) throw new Error('참고 이미지는 최대 14장까지 사용할 수 있습니다.');
    if (references.some(r => r.characterId === character.id)) return;
    references.push({ name: character.name, characterId: character.id, data: await imageData(character.image) });
    form().elements.prompt.value += `\n캐릭터 ${character.name}: ${character.description || '참고 시트의 외형과 의상을 유지.'}`;
    showReferences();
  } catch (error) { toast(error.message); }
  finally { setPreparing(false); }
}
async function loadProduction(event) {
  const item = state.productions.find(p => p.id === event.target.value);
  if (!item || preparing) return;
  setPreparing(true);
  form().elements.prompt.value = [item.title, item.story, item.notes].filter(Boolean).join('\n\n');
  references = references.filter(r => !r.characterId);
  try {
    for (const id of item.characterIds) {
      const character = state.characters.find(c => c.id === id && c.image);
      if (!character) continue;
      if (references.length >= 14) throw new Error('참고 이미지는 최대 14장까지 사용할 수 있습니다.');
      references.push({ name: character.name, characterId: id, data: await imageData(character.image) });
      form().elements.prompt.value += `\n캐릭터 ${character.name}: ${character.description || '참고 시트의 외형과 의상을 유지.'}`;
    }
  } catch (error) { toast(error.message); }
  finally { setPreparing(false); showReferences(); }
}
async function generate(event) {
  event.preventDefault(); if (submitting) return;
  if (preparing) { toast('참고 이미지를 불러오는 중입니다. 잠시 후 다시 시도해주세요.'); return; }
  const values = Object.fromEntries(new FormData(form())); values.provider = form().elements.provider.value;
  const submit = panel().querySelector('#generate-button');
  try {
    if (!values.model) throw new Error('모델 정보를 불러오지 못했습니다. OAuth 설정을 확인한 뒤 다시 열어주세요.');
    const request = generationRequest(mode, values, references.map(r => r.data), crypto.randomUUID());
    submitting = true; submit.disabled = true;
    await submitJob(request, mode, values.prompt);
  } catch (error) { toast(error.message); }
  finally { submitting = false; submit.disabled = false; }
}
function renderJobs() {
  const list = [...jobs.values()].reverse().slice(0, 12);
  panel().querySelector('#media-results').innerHTML = list.length ? list.map(jobMarkup).join('') : emptyResults();
}
async function assetAction(event) {
  const b = event.target.closest('button'); if (!b) return;
  if (b.dataset.removeReference !== undefined) { references.splice(Number(b.dataset.removeReference), 1); showReferences(); return; }
  const filename = b.dataset.assetCharacter || b.dataset.assetReference;
  if (!filename && !b.dataset.cancelJob) return;
  b.disabled = true;
  try {
    if (b.dataset.cancelJob) { await cancelJob(b.dataset.cancelJob); return; }
    const data = await imageData(assetUrl(filename));
    if (b.dataset.assetCharacter) { const media = await api('/api/media', 'POST', { data }); editCharacter(null, { image: media.image }); }
    else { if (references.length >= 14) throw new Error('참고 이미지는 최대 14장까지 사용할 수 있습니다.'); references.push({ name: filename, data }); if (mode === 'history') changeMode('edit'); showReferences(); toast('참고 이미지로 추가했습니다.'); }
  } catch (error) { toast(error.message); }
  finally { b.disabled = false; }
}
async function loadHistory(more = false) {
  if (historyBusy) return; historyBusy = true;
  const target = panel().querySelector('#history-results');
  const next = panel().querySelector('[data-history-more]'); next.hidden = true;
  if (!more) { historyCursor = null; target.innerHTML = '<p class="notice" role="status">생성 기록을 불러오고 있습니다…</p>'; }
  try {
    const query = new URLSearchParams({ limit: '24' });
    if (more && historyCursor) { query.set('before', historyCursor.before); query.set('beforeFilename', historyCursor.beforeFilename); }
    const data = await toolApi('ima2', '/api/history?' + query);
    const cards = mediaAssets(data).map(asset => `<article class="surface-card insight-body">${assetMarkup(asset)}<p class="insight-description">${e(asset.prompt)}</p></article>`).join('');
    if (more) target.insertAdjacentHTML('beforeend', cards); else target.innerHTML = cards || emptyState({ title: '아직 생성한 결과가 없어요', description: '이미지나 영상을 만들면 이곳에 모입니다.', iconName: 'image' });
    historyCursor = data.nextCursor; next.hidden = !historyCursor;
  } catch (error) { if (!more) target.innerHTML = `<p class="notice" role="alert">${e(error.message)}</p>`; else { next.hidden = false; toast(error.message); } }
  finally { historyBusy = false; }
}
