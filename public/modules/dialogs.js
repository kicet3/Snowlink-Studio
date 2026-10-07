import { state, save, api } from './state.js';
import { escape as e, icon, FORMATS, STAGES, toast, download } from './ui.js';
import { dialogHeading, button, field } from './components.js';

const dialog = document.querySelector('#editor');
export function openDialog(title, content, wide = false) {
  if (dialog.open) dialog.close();
  dialog.classList.toggle('wide-dialog', wide);
  dialog.innerHTML = dialogHeading(title) + content;
  dialog.querySelector('[data-close]').onclick = () => dialog.close();
  dialog.showModal();
}
function formFooter(existing) {
  return `<p class="form-error" role="alert" hidden></p><div class="form-footer">${existing ? button(existing.archived ? '보관 해제' : '보관함으로', { variant: 'quiet-button', attrs: { 'data-archive': true } }) : '<span></span>'}${button('저장하기', { iconName: 'check', attrs: { type: 'submit' } })}</div>`;
}
function bindSave(kind, existing, collect) {
  const form = dialog.querySelector('form');
  const submit = async (event, archive) => {
    event.preventDefault();
    const error = form.querySelector('.form-error');
    const buttons = form.querySelectorAll('button');
    buttons.forEach(b => b.disabled = true);
    error.hidden = true;
    try {
      const values = await collect(new FormData(form));
      if (archive !== undefined) values.archived = archive;
      await save(kind, values, existing);
      dialog.close(); toast('저장했습니다.');
    } catch (err) { error.textContent = err.message; error.hidden = false; }
    finally { buttons.forEach(b => b.disabled = false); }
  };
  form.onsubmit = event => submit(event);
  form.querySelector('[data-archive]')?.addEventListener('click', event => submit(event, !existing.archived));
}
export function editProduction(existing, format = 'story', draft = {}) {
  const item = existing || { format, stage: 'idea', characterIds: [], ...draft };
  const main = [
    field({ label: '콘텐츠 제목', name: 'title', value: item.title, placeholder: '예: 낯가리는 고양이의 첫 출근', attrs: { required: true, maxlength: 160 } }),
    `<div class="form-row">${field({ label: '콘텐츠 형식', name: 'format', value: item.format, options: Object.entries(FORMATS).map(([value, f]) => ({ value, label: f.label })) })}${field({ label: '제작 단계', name: 'stage', value: item.stage, options: Object.entries(STAGES).map(([value, label]) => ({ value, label })) })}</div>`,
    field({ label: '이야기 · 대본', name: 'story', value: item.story, rows: 8, placeholder: '어떤 이야기를 들려주고 싶나요? 상황, 전개, 마지막 한마디까지 자유롭게 적어주세요.', attrs: { maxlength: 30000 } }),
    field({ label: '참고 링크', name: 'source', value: item.source, type: 'url', placeholder: 'https://' }),
    field({ label: '제작 메모', name: 'notes', value: item.notes, rows: 2, placeholder: '톤, 화면 비율, 자막 스타일 등' }),
  ].join('');
  const cast = state.characters.filter(c => !c.archived || item.characterIds.includes(c.id)).map(c => `<label class="cast-option"><input type="checkbox" name="characterIds" value="${c.id}" ${item.characterIds.includes(c.id) ? 'checked' : ''}>${c.image ? `<img src="${c.image}" alt="">` : `<span class="avatar">${e(c.name[0])}</span>`}<span>${e(c.name)}<small>${e(c.tags)}</small></span></label>`).join('');
  openDialog(existing ? '콘텐츠 기획 수정' : '새로운 이야기를 시작하세요', `<form class="editor-form"><div class="form-grid"><div class="form-main">${main}</div><aside class="form-side"><h3>출연 캐릭터</h3><p class="small muted">이 콘텐츠에 사용할 시트를 선택하세요.</p><div class="cast-picker">${cast || `<div class="small-empty">${icon('people')}아직 등록한 캐릭터가 없어요.<br>캐릭터 시트 메뉴에서 먼저 등록해주세요.</div>`}</div><div class="form-tip">${icon('folder')}기획과 캐릭터 시트가 한 묶음으로 저장됩니다.</div></aside></div>${formFooter(existing)}</form>`, true);
  bindSave('productions', existing, data => ({ ...Object.fromEntries(data), characterIds: data.getAll('characterIds') }));
}
export function editCharacter(existing, draft = {}) {
  if (!existing && !draft.image) {
    void import('./character-studio.js').then(m => m.openCharacterStudio()).catch(error => toast(error.message));
    return;
  }
  editCharacterDetails(existing, draft);
}
export function editCharacterDetails(existing, draft = {}) {
  const item = existing || draft;
  const name = field({ label: '캐릭터 이름', name: 'name', value: item.name, placeholder: '예: 소심한 고양이 모모', attrs: { required: true, maxlength: 100 } });
  const description = field({ label: '캐릭터 설정', name: 'description', value: item.description, rows: 4, placeholder: '외형, 의상, 성격과 유지해야 할 특징을 적어주세요.', attrs: { maxlength: 10000 } });
  const tags = field({ label: '태그', name: 'tags', value: item.tags, placeholder: '고양이, 직장인, 소심함 (쉼표로 구분)', attrs: { maxlength: 300 } });
  openDialog(existing ? '캐릭터 설정 수정' : '나만의 캐릭터 등록', `<form class="editor-form">${button('AI와 대화해 시트 만들기', { variant: 'secondary', iconName: 'spark', attrs: { 'data-character-ai': true } })}${name}<label class="upload-label">시트 이미지 <span class="small muted">PNG · JPG · WebP / 6MB 이하</span><div class="upload-preview" id="upload-preview">${item.image ? `<img src="${item.image}" alt="현재 캐릭터 시트">` : `${icon('image')}<span>사용할 캐릭터 시트를 선택하세요</span>`}</div><input name="sheet" type="file" accept="image/png,image/jpeg,image/webp"></label>${description}${tags}${formFooter(existing)}</form>`);
  let image = item.image || '';
  let sheet = item.sheet;
  let dataUrl;
  const picker = dialog.querySelector('[name=sheet]');
  picker.onchange = async () => {
    dataUrl = undefined;
    const file = picker.files[0];
    if (!file) return;
    if (file.size > 6 * 1024 * 1024) { toast('이미지는 6MB 이하로 선택해주세요.'); picker.value = ''; return; }
    dataUrl = await new Promise((resolve, reject) => { const reader = new FileReader(); reader.onload = () => resolve(reader.result); reader.onerror = reject; reader.readAsDataURL(file); });
    dialog.querySelector('#upload-preview').innerHTML = `<img src="${e(dataUrl)}" alt="선택한 캐릭터 시트">`;
  };
  dialog.querySelector('[data-character-ai]').onclick = async event => {
    const button = event.currentTarget; button.disabled = true;
    try {
      if (dataUrl) { image = (await api('/api/media', 'POST', { data: dataUrl })).image; dataUrl = undefined; }
      const data = new FormData(dialog.querySelector('form'));
      const { openCharacterStudio } = await import('./character-studio.js');
      await openCharacterStudio(existing, { ...item, name: data.get('name'), description: data.get('description'), tags: data.get('tags'), image });
    } catch (error) { toast(error.message); button.disabled = false; }
  };
  bindSave('characters', existing, async data => {
    if (dataUrl) { image = (await api('/api/media', 'POST', { data: dataUrl })).image; dataUrl = undefined; sheet = undefined; }
    return { name: data.get('name'), description: data.get('description'), tags: data.get('tags'), image, sheet };
  });
}
export function showBrief(item) {
  const cast = item.characterIds.map(id => state.characters.find(c => c.id === id)).filter(Boolean);
  const content = [`제목: ${item.title}`, `형식: ${FORMATS[item.format].label}`, '', '이야기 / 대본', item.story || '(작성 전)', '', '등장 캐릭터', ...cast.map(c => `${c.name}: ${c.description}\n태그: ${c.tags}`), '', '제작 메모', item.notes || '', item.source ? `참고: ${item.source}` : ''].join('\n');
  openDialog('제작 지시서', `<p class="subtitle">제작으로 이동하면 원고와 캐릭터 시트를 불러옵니다. 기획과 시트는 따로 내려받을 수도 있습니다.</p><textarea class="brief-text" rows="15" readonly aria-label="제작 지시서 내용">${e(content)}</textarea><div class="brief-assets">${cast.filter(c => c.image).map(c => `<a href="${c.image}" download="${e(c.name)}-sheet">${icon('download')}${e(c.name)} 시트</a>`).join('')}</div><div class="form-footer"><button class="quiet-button" id="download-brief">${icon('download')} TXT 저장</button><div><button class="secondary" id="copy-brief">${icon('copy')} 복사</button> <button class="primary" id="open-brief-studio">제작으로 이동 ${icon('arrow')}</button></div></div>`);
  dialog.querySelector('#download-brief').onclick = () => download(`${item.title}-기획.txt`, content);
  dialog.querySelector('#copy-brief').onclick = async () => { try { await navigator.clipboard.writeText(content); toast('제작 지시서를 복사했습니다.'); } catch { dialog.querySelector('textarea').select(); toast('텍스트를 선택했습니다. 복사해주세요.'); } };
  dialog.querySelector('#open-brief-studio').onclick = async () => {
    dialog.close(); location.hash = 'ima2/create';
    try { const { openMediaWorkspace } = await import('./media-workspace.js'); await openMediaWorkspace(); document.dispatchEvent(new CustomEvent('studio:load-production', { detail: { story: item.story, characters: cast } })); }
    catch (error) { toast(error.message); }
  };
}
export function showGuide() {
  openDialog('하나의 작업실, 네 가지 흐름', `<div class="guide"><p><b>01 트렌드 탐색</b>에서 소재와 참고 링크를 발견하세요.</p><p><b>02 캐릭터 시트</b>에 외형·성격·이미지를 등록하세요.</p><p><b>03 제작 보드</b>에서 썰 영상, 카드뉴스, YouTube 기획을 만들고 캐릭터를 선택하세요.</p><p><b>04 이미지 · 영상 제작 / ShortGPT</b>에서 생성 작업과 컷 편집을 이어가세요.</p><div class="form-tip">Instagram·YouTube 자동 게시와 예약 업로드는 아직 연결되지 않았습니다. 기획 데이터 백업에는 이미지 파일이 포함되지 않으므로, 전체 백업 시 .data 폴더도 함께 보관하세요.</div></div>`);
}
