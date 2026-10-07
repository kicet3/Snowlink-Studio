import { openDialog, editCharacterDetails } from './dialogs.js';
import { api, save } from './state.js';
import { button, field } from './components.js';
import { escape as e, icon, toast } from './ui.js';
import { readImage } from './integration-api.js';
import { assetUrl } from './media-data.js';
import { initializeJobs, jobs, submitJob, reconcileJobs, cancelJob } from './media-jobs.js';
import { characterSheetRequest, PURPOSES, LAYOUTS } from './character-data.js';

const options = values => values.map(value => ({ value, label: value }));
const action = (label, name, variant = 'secondary', extra = {}) => button(label, { variant, attrs: { 'data-action': name, 'data-lock': true, ...extra } });
const fresh = item => ({ version: 1, mode: item.image ? 'photo' : '', templateId: item.sheet?.templateId || 'identity-sheet', referenceImage: item.image || '', settings: { type: '', age: '', style: '', outfit: item.image ? '사진 그대로' : '', purpose: PURPOSES[0], layout: LAYOUTS[0] }, profile: { name: item.name || '', description: item.description || '', tags: item.tags || '' }, messages: [], message: '', prepared: null, result: null, generation: null });
let active;

export async function openCharacterStudio(existing, item = existing || {}) {
  const storageKey = 'snowfall-studio.character-draft.v1.' + (existing?.id || 'new');
  let draft = { ...fresh(item), sourceUpdatedAt: existing?.updatedAt };
  try {
    const stored = JSON.parse(localStorage.getItem(storageKey));
    const explicitChanges = existing ? ['name', 'description', 'tags', 'image'].some(key => item[key] !== existing[key]) : Object.keys(item).length > 0;
    if (!explicitChanges && stored?.version === 1 && stored.sourceUpdatedAt === existing?.updatedAt && Array.isArray(stored.messages) && stored.settings && stored.profile) draft = stored;
  } catch { /* A damaged or unavailable local draft must not prevent creation. */ }
  openDialog(existing ? 'AI와 캐릭터 시트 다듬기' : 'AI와 캐릭터 만들기', '<div class="character-studio"><p role="status">템플릿을 불러오고 있어요…</p></div>', true);
  const dialog = document.querySelector('#editor');
  const root = dialog.querySelector('.character-studio');
  const instance = {}; active = instance;
  let templates = [], modelSettings, busy = false, error = '', templateEditor = null, importing = false;
  const current = () => active === instance && root.isConnected && dialog.open;
  const selected = () => templates.find(t => t.id === draft.templateId);
  function persist() {
    try { localStorage.setItem(storageKey, JSON.stringify(draft)); }
    catch { toast('브라우저 임시 저장 공간이 부족합니다. 창을 닫기 전에 캐릭터를 저장해주세요.'); }
  }
  function invalidate() { draft.prepared = null; persist(); }
  const pending = () => draft.generation && !draft.result && !['error', 'canceled'].includes(jobs.get(draft.generation.id)?.status);
  function locked() { return busy || !!pending(); }
  function lockControls() {
    root.querySelectorAll('[data-lock], input, select, textarea').forEach(node => node.disabled = locked());
    const send = root.querySelector('[data-action=chat]');
    if (send) send.disabled = locked() || (draft.mode === 'photo' && !draft.referenceImage);
    const generate = root.querySelector('[data-action=generate]');
    if (generate) generate.disabled = locked() || !draft.prepared?.ready;
  }
  function report(message) { error = message; const node = root.querySelector('[data-error]'); if (node) { node.textContent = message; node.hidden = !message; } }
  async function work(operation) {
    if (locked()) return;
    busy = true; report(''); lockControls();
    try { await operation(); }
    catch (cause) { if (current()) report(cause.message); }
    finally { busy = false; if (current()) { lockControls(); renderResult(); } }
  }
  function chooser() {
    return `<p class="subtitle">어떤 방식으로 캐릭터 시트를 만들까요?</p><div class="character-choices">
      <button class="surface-card character-choice" data-mode="photo">${icon('image')}<strong>1. 사진을 첨부해 만들기</strong><span>참고할 인물·캐릭터 사진에서 외형을 정리해요.</span></button>
      <button class="surface-card character-choice" data-mode="new">${icon('spark')}<strong>2. 새로운 캐릭터 만들기</strong><span>몇 가지 유형을 고르면 AI가 세부 설정을 채워요.</span></button></div>
      <div class="form-footer"><span class="small muted">완성된 시트 이미지가 있다면</span>${action('직접 등록하기', 'manual', 'quiet-button')}</div>`;
  }
  function settingsMarkup() {
    const attrs = { maxlength: 1000 };
    if (draft.mode === 'photo') return `<label class="upload-label">참고할 인물·캐릭터 사진<span class="small muted">PNG · JPG · WebP / 6MB 이하</span><div class="upload-preview">${draft.referenceImage ? `<img src="${e(draft.referenceImage)}" alt="캐릭터 참고 사진">` : `${icon('image')}<span>얼굴과 의상이 잘 보이는 사진을 선택하세요</span>`}</div><input type="file" name="reference" accept="image/png,image/jpeg,image/webp"></label>
      ${field({ label: '의상', name: 'outfit', value: draft.settings.outfit, options: options(['사진 그대로', '비슷한 분위기로 정리', '다른 의상으로 변경']) })}
      ${field({ label: '주요 사용 목적', name: 'purpose', value: draft.settings.purpose, options: options(PURPOSES) })}
      ${selected()?.id === 'identity-sheet' ? field({ label: '시트 구성', name: 'layout', value: draft.settings.layout, options: options(LAYOUTS) }) : ''}`;
    return [
      field({ label: '1. 캐릭터 유형', name: 'type', value: draft.settings.type, placeholder: '예: 소심한 고양이 직장인', attrs }),
      field({ label: '2. 연령과 인상', name: 'age', value: draft.settings.age, placeholder: '예: 20대, 차분하고 따뜻한 인상', attrs }),
      field({ label: '3. 전체 스타일', name: 'style', value: draft.settings.style, placeholder: '예: 실사, 애니메이션, 3D', attrs }),
      field({ label: '4. 기본 의상', name: 'outfit', value: draft.settings.outfit, placeholder: '예: 크림색 니트와 남색 바지', attrs }),
      field({ label: '5. 주요 사용 목적', name: 'purpose', value: draft.settings.purpose, options: options(PURPOSES) }),
      '<p class="small muted">비워 둔 항목과 얼굴·헤어·체형의 세부는 AI가 조화롭게 제안합니다.</p>',
    ].join('');
  }
  function editorMarkup() {
    if (!templateEditor) return '';
    return `<section class="character-template-editor editor-form" aria-label="템플릿 편집"><h3>${templateEditor.id ? '내 템플릿 수정' : '프롬프트 템플릿 추가'}</h3>
      ${field({ label: '템플릿 이름', name: 'templateName', value: templateEditor.name, attrs: { maxlength: 100, required: true } })}
      ${field({ label: '간단한 설명', name: 'templateDescription', value: templateEditor.description, attrs: { maxlength: 500 } })}
      ${field({ label: '직접 작성한 프롬프트', name: 'templatePrompt', value: templateEditor.prompt, rows: 9, placeholder: '시트 구성, 그림 스타일, 이미지 속 언어, 유지할 특징 등 원하는 생성 지침을 붙여 넣으세요.', attrs: { maxlength: 20000, required: true } })}
      <p class="small muted">캐릭터 설정과 참고 사진은 대화에서 함께 전달됩니다. 템플릿은 이 작업실에 저장되어 다시 사용할 수 있어요.</p>
      <div class="character-actions">${action('템플릿 저장', 'template-save', 'primary')}${action('편집 닫기', 'template-close', 'quiet-button')}${templateEditor.id ? action('템플릿 삭제', 'template-delete', 'quiet-button') : ''}</div></section>`;
  }
  function paint() {
    if (!current()) return;
    if (!draft.mode) { root.innerHTML = chooser(); return; }
    const template = selected();
    root.innerHTML = `<div class="character-progress"><span>01 설정 선택</span><span>02 AI와 대화 · 확인</span><span>03 시트 생성 · 등록</span></div>
      <div class="character-studio-grid"><aside class="character-config editor-form">
        <div class="character-section-heading"><h3>${draft.mode === 'photo' ? '사진에서 시작' : '새 캐릭터 설정'}</h3>${action('방식 변경', 'change-mode', 'quiet-button')}</div>
        ${field({ label: '시트 프롬프트 템플릿', name: 'template', value: draft.templateId, options: templates.map(t => ({ value: t.id, label: `${t.builtin ? '기본' : '내 템플릿'} · ${t.name}` })) })}
        <p class="small muted">${e(template?.description || '직접 저장한 프롬프트를 사용합니다.')}</p>
        <div class="character-actions">${action('템플릿 추가', 'template-new', 'quiet-button')}${action(template?.builtin ? '복사해서 수정' : '템플릿 수정', 'template-edit', 'quiet-button')}</div>
        <details class="character-template-preview"><summary>선택한 프롬프트 보기</summary><pre>${e(template?.prompt || '')}</pre></details>
        ${settingsMarkup()}
      </aside><section class="character-conversation" aria-label="AI와 캐릭터 대화">
        <div><h3>대화로 다듬는 캐릭터</h3><p class="small muted">설정을 정리하고, 원하는 부분을 말로 수정하세요.</p></div>
        <div class="character-chat" role="log" aria-label="캐릭터 대화" aria-live="polite">${draft.messages.length ? draft.messages.map(m => `<div class="character-message" data-role="${m.role === 'user' ? 'user' : 'assistant'}"><strong>${m.role === 'user' ? '나' : 'AI'}</strong><p>${e(m.content)}</p></div>`).join('') : `<div class="character-message"><strong>AI</strong><p>${draft.mode === 'photo' ? '사진을 첨부하면 보이는 외형을 분석해 시트를 준비할게요. 변경하고 싶은 의상이나 특징이 있다면 함께 알려주세요.' : '왼쪽의 다섯 가지 항목을 입력하거나, 아래에서 만들고 싶은 캐릭터를 자유롭게 설명해주세요.'}</p></div>`}</div>
        <form class="character-chat-form editor-form">${field({ label: 'AI에게 요청하기', name: 'message', value: draft.message, rows: 3, placeholder: draft.messages.length ? '예: 머리색은 유지하고 의상만 회색 후드로 바꿔줘' : '예: 입력한 설정으로 추천해줘. 이름과 성격도 정해줘.', attrs: { maxlength: 4000 } })}
          <div class="character-actions">${action(draft.messages.length ? '수정 요청 보내기' : 'AI와 설정 정리', 'chat', 'primary', { type: 'submit' })}<span class="small muted" data-chat-status>${busy ? 'AI가 설정을 정리하고 있어요…' : ''}</span></div></form>
        <p class="form-error" role="alert" data-error ${error ? '' : 'hidden'}>${e(error)}</p>
        <div data-character-result></div>
        <p class="character-models small muted">${modelSettings ? `대화: ${e(modelSettings.roles.chat.model)} · 시트: ${e(modelSettings.roles.image.model)}` : '설정된 대화·이미지 모델을 사용합니다.'} · <a href="#settings" data-open-settings>모델 · OAuth 설정</a></p>
      </section></div>${editorMarkup()}
      <div class="form-footer"><span class="small muted">진행 내용은 이 브라우저에 임시 저장됩니다.</span>${action('처음부터', 'reset', 'quiet-button')}</div>`;
    root.querySelector('.character-chat-form').onsubmit = event => { event.preventDefault(); void chat(); };
    root.querySelector('[name=reference]')?.addEventListener('change', event => {
      const file = event.target.files[0]; if (!file) return;
      void work(async () => { const data = await readImage(file); draft.referenceImage = (await api('/api/media', 'POST', { data })).image; invalidate(); paint(); });
    });
    root.querySelector('[data-open-settings]').onclick = () => dialog.close();
    const log = root.querySelector('.character-chat'); log.scrollTop = log.scrollHeight;
    renderResult(); lockControls();
  }
  function renderResult() {
    const target = root.querySelector('[data-character-result]');
    if (!target) return;
    const generation = draft.generation;
    const job = generation && jobs.get(generation.id);
    const profile = draft.prepared?.profile || draft.profile;
    target.innerHTML = `${draft.prepared ? `<section class="character-summary"><h3>${e(profile.name || '캐릭터 설정')}</h3><p>${e(profile.description)}</p>${draft.prepared.ready ? `<strong>이 설정으로 캐릭터 시트를 직접 생성할까요?</strong><div class="character-actions">${action('네, 바로 생성해 주세요', 'generate', 'primary')}${action('일부 설정을 수정할게요', 'revise', 'quiet-button')}</div>` : '<p class="small muted">대화에서 필요한 내용을 알려주세요.</p>'}</section>` : ''}
      ${generation && !draft.result ? `<div class="notice character-generation" role="status"><strong>${importing ? '완성된 시트를 가져오고 있어요…' : e(job?.message || '요청 기록을 찾지 못했습니다. 결과 확인으로 서버 상태를 확인해주세요.')}</strong><p class="small muted">생성 중에는 창을 닫아도 됩니다. 다시 열면 결과를 이어서 확인합니다.</p><div class="character-actions"><button type="button" class="secondary" data-action="job-refresh">결과 확인</button>${job && !['done', 'error', 'canceled'].includes(job.status) ? '<button type="button" class="quiet-button" data-action="job-cancel">생성 취소</button>' : ''}${['error', 'canceled'].includes(job?.status) ? action('다시 생성 준비', 'job-clear', 'quiet-button') : ''}${!job || job.status === 'checking' ? '<button type="button" class="quiet-button" data-action="job-release">이 요청 추적 종료</button><span class="small muted">이미지 · 영상 제작의 기록을 먼저 확인하세요. 진행 중인 생성은 계속됩니다.</span>' : ''}</div></div>` : ''}
      ${draft.result ? `<section class="character-sheet-result"><h3>완성된 캐릭터 시트</h3><a href="${e(draft.result.image)}" target="_blank" rel="noopener"><img src="${e(draft.result.image)}" alt="${e(draft.result.profile.name)} 캐릭터 시트"></a><p class="small muted">${e(draft.result.templateName)} · ${e(draft.result.profile.name)}${draft.prepared?.sheetPrompt !== draft.result.prompt ? ' · 이전 생성 결과' : ''}</p><div class="character-actions">${action(existing ? '이 시트로 캐릭터 수정' : '이 시트로 캐릭터 등록', 'save', 'primary')}<a class="secondary button" href="${e(draft.result.image)}" download="${e(draft.result.profile.name)}-sheet">시트 다운로드</a></div></section>` : ''}`;
    lockControls();
  }
  async function chat() {
    await work(async () => {
      const message = draft.message.trim() || '선택한 설정을 바탕으로 캐릭터를 제안하고 시트 생성을 준비해주세요.';
      if (draft.mode === 'new' && !draft.settings.type.trim() && !draft.message.trim() && !draft.profile.description) throw new Error('캐릭터 유형이나 만들고 싶은 캐릭터를 한 줄로 알려주세요.');
      root.querySelector('[data-chat-status]').textContent = 'AI가 설정을 정리하고 있어요…';
      const result = await api('/api/character-studio/chat', 'POST', { mode: draft.mode, templateId: draft.templateId, settings: draft.settings, referenceImage: draft.referenceImage, profile: draft.profile, message, messages: draft.messages.slice(-12) });
      if (active !== instance) return;
      draft.messages = [...draft.messages, { role: 'user', content: message }, { role: 'assistant', content: result.reply }].slice(-40);
      draft.profile = result.profile; draft.prepared = result; draft.message = ''; persist(); paint();
    });
    if (current()) { const status = root.querySelector('[data-chat-status]'); if (status) status.textContent = ''; }
  }
  async function generate() {
    await work(async () => {
      const references = [];
      if (draft.mode === 'photo') {
        const response = await fetch(draft.referenceImage, { signal: AbortSignal.timeout(20000) });
        if (!response.ok) throw new Error('참고 사진을 불러오지 못했습니다. 다시 첨부해주세요.');
        references.push(await readImage(await response.blob()));
      }
      modelSettings = await api('/api/ai/settings');
      if (active !== instance) return;
      const id = crypto.randomUUID();
      const request = characterSheetRequest(draft.prepared, modelSettings.roles.image, references, id);
      const template = selected();
      draft.generation = { id, profile: structuredClone(draft.profile), prompt: draft.prepared.sheetPrompt, templateId: template.id, templateName: template.name };
      draft.result = null; persist(); renderResult();
      // The shared job tracker persists the request and reconciles after a reload without resubmitting.
      try { await submitJob(request, 'image', request.body.prompt); }
      catch (cause) { draft.generation = null; persist(); throw cause; }
      await syncResult();
    });
  }
  async function syncResult() {
    if (!current() || importing || !draft.generation || draft.result) return;
    const generation = draft.generation;
    const job = jobs.get(generation.id);
    renderResult();
    if (job?.status !== 'done') return;
    const asset = job.assets.find(a => a.mediaType === 'image');
    if (!asset) { report('생성된 이미지가 없습니다. 이미지 · 영상 제작의 생성 기록을 확인해주세요.'); return; }
    importing = true; renderResult();
    try {
      const response = await fetch(assetUrl(asset.filename), { signal: AbortSignal.timeout(30000) });
      if (!response.ok) throw new Error('시트 이미지를 가져오지 못했습니다. 결과 확인으로 다시 시도해주세요.');
      const data = await readImage(await response.blob());
      const { image } = await api('/api/media', 'POST', { data });
      if (active !== instance || draft.generation?.id !== generation.id) return;
      draft.result = { ...generation, image }; persist();
    } catch (cause) { if (current()) report(cause.message); }
    finally { importing = false; if (current()) renderResult(); }
  }
  root.addEventListener('input', event => {
    const name = event.target.name;
    if (name === 'message') draft.message = event.target.value;
    else if (name in draft.settings) { draft.settings[name] = event.target.value; invalidate(); renderResult(); }
    else if (templateEditor && name?.startsWith('template')) { const key = { templateName: 'name', templateDescription: 'description', templatePrompt: 'prompt' }[name]; if (key) templateEditor[key] = event.target.value; }
    persist();
  });
  root.addEventListener('change', event => {
    if (event.target.name === 'template') { draft.templateId = event.target.value; invalidate(); paint(); }
  });
  root.addEventListener('click', event => {
    const node = event.target.closest('button'); if (!node) return;
    if (node.dataset.mode) { draft.mode = node.dataset.mode; if (draft.mode === 'photo' && !draft.settings.outfit) draft.settings.outfit = '사진 그대로'; invalidate(); paint(); return; }
    const name = node.dataset.action;
    if (!name || name === 'chat') return;
    if (name === 'job-refresh') { void reconcileJobs().then(syncResult); return; }
    if (name === 'job-cancel') { void cancelJob(draft.generation.id).then(syncResult).catch(cause => report(cause.message)); return; }
    if (name === 'job-release' && (!jobs.get(draft.generation?.id) || jobs.get(draft.generation?.id)?.status === 'checking')) { draft.generation = null; persist(); renderResult(); return; }
    if (locked()) return;
    if (name === 'manual') { editCharacterDetails(existing, item); return; }
    if (name === 'change-mode') { draft.mode = ''; invalidate(); paint(); return; }
    if (name === 'reset') { draft = { ...fresh(item), sourceUpdatedAt: existing?.updatedAt }; templateEditor = null; persist(); paint(); return; }
    if (name === 'revise') { root.querySelector('[name=message]').focus(); return; }
    if (name === 'generate') { void generate(); return; }
    if (name === 'job-clear') { draft.generation = null; persist(); renderResult(); return; }
    if (name === 'template-new') templateEditor = { name: '', description: '', prompt: '' };
    if (name === 'template-edit') { const template = selected(); templateEditor = template.builtin ? { name: template.name + ' (내 버전)', description: template.description, prompt: template.prompt } : { ...template }; }
    if (name === 'template-close') templateEditor = null;
    if (['template-new', 'template-edit', 'template-close'].includes(name)) { paint(); root.querySelector('[name=templateName]')?.focus(); return; }
    if (name === 'template-save') void work(async () => {
      const entry = templateEditor;
      const saved = await api('/api/character-templates' + (entry.id ? '/' + entry.id : ''), entry.id ? 'PUT' : 'POST', entry);
      if (active !== instance) return;
      templates = (await api('/api/character-templates')).templates; draft.templateId = saved.id; templateEditor = null; invalidate(); paint(); toast('템플릿을 저장했습니다.');
    });
    if (name === 'template-delete') { node.textContent = '삭제 확인'; node.dataset.action = 'template-delete-confirm'; return; }
    if (name === 'template-delete-confirm') void work(async () => {
      await api('/api/character-templates/' + templateEditor.id, 'DELETE', { updatedAt: templateEditor.updatedAt });
      templates = (await api('/api/character-templates')).templates; draft.templateId = templates[0].id; templateEditor = null; invalidate(); paint();
    });
    if (name === 'save') void work(async () => {
      const result = draft.result;
      await save('characters', { ...result.profile, image: result.image, sheet: { templateId: result.templateId, templateName: result.templateName, prompt: result.prompt } }, existing);
      try { localStorage.removeItem(storageKey); } catch { /* The server has already saved the character. */ }
      dialog.close(); toast('캐릭터와 시트를 저장했습니다. 제작 화면에서 참조로 사용할 수 있어요.');
    });
  });
  const onJobs = () => { if (current()) void syncResult(); else document.removeEventListener('media-jobs-updated', onJobs); };
  document.addEventListener('media-jobs-updated', onJobs);
  dialog.addEventListener('close', () => { if (!dialog.open) document.removeEventListener('media-jobs-updated', onJobs); }, { once: true });
  try {
    const results = await Promise.allSettled([api('/api/character-templates'), api('/api/ai/settings')]);
    if (results[0].status === 'rejected') throw results[0].reason;
    templates = results[0].value.templates;
    if (results[1].status === 'fulfilled') modelSettings = results[1].value;
    if (!selected()) { draft.templateId = templates[0].id; draft.prepared = null; }
    initializeJobs(); paint(); await reconcileJobs(); await syncResult();
  } catch (cause) {
    if (!current()) return;
    root.innerHTML = `<p class="notice" role="alert">${e(cause.message)}</p>${button('다시 불러오기', { attrs: { 'data-retry': true } })}`;
    root.querySelector('[data-retry]').onclick = () => void openCharacterStudio(existing, item);
  }
}
