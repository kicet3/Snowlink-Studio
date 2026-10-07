import { studioAction as act } from './studio-actions.js';
import { escape as e, toast } from './ui.js';
import { pageHeading, button, field, badge, emptyState } from './components.js';
import { refresh } from './state.js';

let current, templates = [], workspace, timer, tracked = new Map(), initialized = false;
const panel = () => document.querySelector('#panel-scenarios');
const statuses = { ready: '완료', empty: '미작성', stale: '앞 화 변경 · 재검토', needs_revision: '분량 보완 필요', needs_memory: '이야기 기억 정리 필요' };
const b = (label, action, secondary = true, attrs = {}) => button(label, { variant: secondary ? 'secondary' : 'primary', attrs: { 'data-story-action': action, ...attrs } });
async function attempt(button, fn) { button.disabled = true; try { await fn(); } catch (error) { toast(error.message); } finally { button.disabled = false; } }

export async function openScenarios() {
  if (!initialized) {
    panel().innerHTML = `<div class="studio-page scenario-page">${pageHeading({ eyebrow: 'STORY TO SCREEN', title: '이야기를 이어, 한 편의 영상으로', description: '전체 플롯부터 각 화의 원고까지. 인물의 변화와 복선을 기억하며 순서대로 만듭니다.', actionsHtml: b('영상 스타일 템플릿', 'templates') + b('새 시나리오', 'new', false) })}<section class="story-flow" aria-label="제작 순서"><span>01 전체 플롯</span><span>02 회차별 플롯</span><span>03 상세 원고 · 이야기 기억</span><span>04 장면 · 영상</span></section><div id="story-jobs" aria-live="polite"></div><div class="story-layout"><aside class="surface-card story-library"><div class="story-section-heading"><h2>내 시나리오</h2>${b('새로고침', 'refresh')}</div><div id="story-list"></div></aside><div id="story-detail"></div></div><section id="story-nodes" class="surface-card" hidden></section></div>`;
    panel().addEventListener('click', event => { const button = event.target.closest('[data-story-action]'); if (button) void attempt(button, () => handle(button)); });
    initialized = true;
  }
  await load();
  if (!timer) timer = setInterval(() => { if (!panel().hidden && !document.hidden) void poll(); }, 4000);
}
async function load() {
  [workspace, { templates }] = await Promise.all([act('studio_workspace'), act('studio_templates', { kind: 'video', operation: 'list' })]);
  panel().querySelector('#story-list').innerHTML = workspace.scenarios.length ? workspace.scenarios.filter(s => !s.archived).map(s => `<button class="story-list-item ${s.id === current?.id ? 'selected' : ''}" data-story-action="select" data-id="${e(s.id)}"><strong>${e(s.title)}</strong><small>${s.episodes.filter(ep => ep.status === 'ready').length} / ${s.episodeCount}화 완료 · ${e(templates.find(t => t.id === s.videoTemplateId)?.name || '사용자 스타일')}</small></button>`).join('') : '<p class="muted small">첫 시나리오를 만들어보세요.</p>';
  if (current) { current = await act('studio_scenario', { operation: 'read', id: current.id }); render(); }
  else panel().querySelector('#story-detail').innerHTML = emptyState({ title: '어떤 이야기를 만들까요?', description: '한 줄의 구상, 전체 화수, 원하는 분량을 정해주세요. 영상 스타일은 대화하면서 다듬을 수 있습니다.', actionsHtml: b('새 시나리오 만들기', 'new', false) });
  const result = await act('studio_job');
  tracked = new Map(result.jobs.slice(0, 8).map(job => [job.id, job])); renderJobs();
}
function render() {
  const s = current;
  const ready = s.episodes.filter(ep => ep.status === 'ready').length;
  panel().querySelector('#story-detail').innerHTML = `<section class="surface-card story-summary"><div class="story-section-heading"><div><p class="eyebrow">${e(templates.find(t => t.id === s.videoTemplateId)?.name || '영상 스타일')}</p><h2>${e(s.title)}</h2></div>${b('작품 설정', 'settings')}</div><p>${e(s.premise)}</p><div class="story-stats">${badge(`${ready} / ${s.episodeCount}화 완료`)}${badge(`${s.minChars.toLocaleString()}~${s.maxChars.toLocaleString()}자 / 화`)}${badge(s.countSpaces ? '공백 포함' : '공백 제외')}</div><div class="story-actions">${b(s.nextStep ? `${s.nextStep.label} 생성` : '모든 단계 완료', 'next', false, { disabled: !s.nextStep })}${b('남은 단계 순차 생성', 'all', true, { disabled: !s.nextStep })}${b('이야기 기억 보기', 'memory')}</div><label class="field"><span>작가에게 전달할 요청 · 선택</span><textarea id="story-instruction" rows="2" maxlength="4000" placeholder="예: 복선은 은근하게 심고 마지막 화에서 회수해줘. 대사를 더 자연스럽게 해줘."></textarea></label><p class="small muted">생성에는 설정한 AI 모델을 사용합니다. 분량이나 기억의 근거가 부족하면 다음 화로 넘어가기 전에 멈춥니다.</p></section><section class="surface-card story-overall"><details ${!s.overallPlot ? 'open' : ''}><summary><strong>전체 플롯</strong> ${badge(s.overallPlot ? '작성됨' : '미작성')}</summary><label class="field"><span>작품 전체의 흐름과 결말</span><textarea id="story-overall" rows="8" maxlength="20000">${e(s.overallPlot)}</textarea></label>${b('전체 플롯 저장', 'save-overall')}<p class="small muted">전체 플롯을 수정하면 회차 플롯과 원고는 재검토 상태로 바뀝니다.</p></details></section><div class="story-episodes">${s.episodes.map(episodeCard).join('')}</div><section id="story-memory" class="surface-card" hidden></section>`;
}
function episodeCard(ep) {
  const length = ep.length;
  return `<section class="surface-card story-episode"><details ${ep.number === current.nextStep?.episodeNumber ? 'open' : ''}><summary><span class="story-episode-number">${String(ep.number).padStart(2, '0')}</span><strong>${e(ep.title)}</strong>${badge(statuses[ep.status] || ep.status, { tone: ep.status === 'ready' ? 'pine' : 'ochre' })}</summary><div class="story-episode-body" data-episode="${ep.number}">${field({ label: '화 제목', name: 'title', value: ep.title, attrs: { maxlength: 160 } })}${field({ label: `화별 플롯 · ${statuses[ep.plotStatus] || ep.plotStatus}`, name: 'plot', value: ep.plot, rows: 5, attrs: { maxlength: 12000 } })}${b('회차 플롯 저장', 'save-plot', true, { 'data-number': ep.number })}<div class="story-length-fields">${field({ label: '최소 글자 수', name: 'minChars', type: 'number', value: length.minChars, attrs: { min: 100, max: 20000 } })}${field({ label: '최대 글자 수', name: 'maxChars', type: 'number', value: length.maxChars, attrs: { min: 100, max: 30000 } })}${b('분량 설정 저장', 'save-limits', true, { 'data-number': ep.number })}</div>${field({ label: '상세 원고', name: 'content', value: ep.content, rows: 12, attrs: { maxlength: 60000 } })}<p class="story-length ${length.valid ? 'valid' : ''}">현재 ${length.count.toLocaleString()}자 · ${length.valid ? '분량 충족' : length.excess ? `${length.excess.toLocaleString()}자 초과` : `${length.missing.toLocaleString()}자 부족`} · ${current.countSpaces ? '공백 포함' : '공백 제외'}</p><div class="story-actions">${b('원고 초안 저장', 'save-content', true, { 'data-number': ep.number })}${b('제작 보드에 연결', 'production', true, { 'data-number': ep.number, disabled: ep.status !== 'ready' })}${b(ep.graphId ? '장면 노드 보기' : '장면 노드 만들기', ep.graphId ? 'nodes' : 'make-nodes', false, { 'data-number': ep.number, disabled: ep.status !== 'ready' })}</div><p class="small muted">수정한 원고는 초안으로 저장합니다. 상단의 다음 단계 생성으로 이야기 기억을 정리하면 다음 화를 이어 쓸 수 있습니다.</p>${ep.memory ? `<details class="story-episode-memory"><summary>이 화가 남긴 기억 · ${ep.memory.facts.length}개 사실</summary><p>${e(ep.memory.summary)}</p>${ep.memory.facts.map(f => `<blockquote><strong>${e(f.subject)} · ${e(f.relation)}</strong><p>${e(f.object)}</p><small>근거: “${e(f.evidence)}”</small></blockquote>`).join('')}</details>` : ''}</div></details></section>`;
}
async function handle(button) {
  const action = button.dataset.storyAction, number = Number(button.dataset.number);
  if (action === 'new') return editSettings();
  if (action === 'templates') return editTemplates();
  if (action === 'refresh') return load();
  if (action === 'select') { current = await act('studio_scenario', { operation: 'read', id: button.dataset.id }); return load(); }
  if (action === 'settings') return editSettings(current);
  if (action === 'pause') { const job = await act('studio_job', { id: button.dataset.id, pause: true }); tracked.set(job.id, job); return renderJobs(); }
  if (action === 'job-check') { const job = await act('studio_job', { id: button.dataset.id }); tracked.set(job.id, job); return renderJobs(); }
  if (action === 'open-graph') return showGraph(button.dataset.id);
  if (action === 'run-node') {
    const job = await act('studio_graph_run', { sessionId: button.dataset.id, nodeId: button.dataset.node, graphVersion: Number(button.dataset.version), idempotencyKey: crypto.randomUUID() });
    tracked.set(job.id, job); renderJobs(); return;
  }
  const base = { id: current.id, revision: current.revision };
  if (action === 'next' || action === 'all') {
    const job = await act('studio_story_generate', { ...base, all: action === 'all', instruction: panel().querySelector('#story-instruction').value });
    tracked.set(job.id, job); return renderJobs();
  }
  if (action === 'save-overall') current = await act('studio_story_write', { ...base, stage: 'overall', plot: panel().querySelector('#story-overall').value });
  if (action.startsWith('save-') && number) {
    const form = panel().querySelector(`[data-episode="${number}"]`), value = name => form.querySelector(`[name="${name}"]`).value;
    const stage = action.slice(5);
    const values = stage === 'plot' ? { title: value('title'), plot: value('plot') } : stage === 'content' ? { content: value('content') } : { minChars: Number(value('minChars')), maxChars: Number(value('maxChars')) };
    current = await act('studio_story_write', { ...base, stage, episodeNumber: number, ...values });
  }
  if (action === 'production') { await act('studio_episode_production', { ...base, episodeNumber: number }); await refresh(); toast('제작 보드에 연결했습니다.'); }
  if (action === 'make-nodes') { const job = await act('studio_episode_nodes', { ...base, episodeNumber: number, instruction: panel().querySelector('#story-instruction').value }); if (job.id) tracked.set(job.id, job); renderJobs(); if (job.result?.sessionId) await showGraph(job.result.sessionId); return; }
  if (action === 'nodes') return showGraph(current.episodes[number - 1].graphId);
  if (action === 'memory') return showMemory();
  await load();
}
function renderJobs() {
  panel().querySelector('#story-jobs').innerHTML = [...tracked.values()].slice(0, 8).map(job => `<div class="story-job"><div><strong>${e({ story: '시나리오 작성', scenes: '장면 구성', media: '이미지·영상 생성' }[job.kind] || '제작 작업')}</strong><p>${e(job.message || job.status)}</p>${job.steps?.length ? `<small>${job.steps.length}단계 저장 완료</small>` : ''}</div><div class="story-actions">${job.kind === 'story' && ['running', 'queued'].includes(job.status) ? b('현재 단계 후 멈춤', 'pause', true, { 'data-id': job.id }) : ''}${['checking', 'running'].includes(job.status) ? b('결과 확인', 'job-check', true, { 'data-id': job.id }) : ''}${job.result?.sessionId ? b('장면 노드 보기', 'open-graph', true, { 'data-id': job.result.sessionId }) : ''}${job.result?.url?.startsWith('/generated/') ? `<a class="button secondary" target="_blank" rel="noopener" href="/integrations/ima2${e(job.result.url)}">결과 열기 ↗</a>` : ''}</div></div>`).join('');
}
let polling = false;
async function poll() {
  if (polling) return; polling = true;
  try {
    for (const job of [...tracked.values()].filter(j => ['queued', 'running', 'checking'].includes(j.status))) {
      const next = await act('studio_job', { id: job.id }); tracked.set(job.id, next);
      if (['done', 'needs_revision', 'failed', 'paused'].includes(next.status)) toast(next.message + ' · 새로고침으로 저장 내용을 확인하세요.');
    }
    renderJobs();
  } catch { /* Next read retries status only. */ } finally { polling = false; }
}
async function showMemory() {
  const context = await act('studio_story_context', { id: current.id });
  const el = panel().querySelector('#story-memory'); el.hidden = false;
  el.innerHTML = `<div class="story-section-heading"><div><p class="eyebrow">STORY MEMORY</p><h2>이야기가 기억하는 것들</h2></div>${badge(`${context.provenance.nodeCount}개 기록 · ${context.provenance.edgeCount}개 연결`)}</div><p class="small muted">완료된 화의 근거를 검색합니다. 미래의 내용과 재검토가 필요한 화는 제외됩니다.</p><h3>미회수 복선 · ${context.threads.length}</h3>${context.threads.map(t => `<blockquote><strong>${e(t.title)} ${t.due ? '· 회수 시점 도달' : ''}</strong><p>${e(t.description)}</p><small>${t.episodeNumber}화에서 시작 · ${t.payoffEpisode ? `${t.payoffEpisode}화 회수 예정` : '회수 시점 미정'}<br>“${e(t.evidence)}”</small></blockquote>`).join('') || '<p class="muted">미회수 복선이 없습니다.</p>'}<h3>회수한 복선 · ${context.resolvedThreads.length}</h3>${context.resolvedThreads.map(t => `<p>${e(t.title)} · ${t.resolutionEpisode}화에서 회수</p>`).join('')}<h3>인물과 사건의 사실</h3>${context.facts.map(f => `<blockquote><strong>${e(f.subject)} · ${e(f.relation)}</strong><p>${e(f.object)}</p><small>${f.episodeNumber}화 · “${e(f.evidence)}”</small></blockquote>`).join('')}`;
  el.scrollIntoView({ behavior: 'smooth', block: 'start' });
}
async function showGraph(id) {
  const graph = await act('studio_graphs', { sessionId: id });
  const el = panel().querySelector('#story-nodes'); el.hidden = false;
  el.innerHTML = `<div class="story-section-heading"><div><p class="eyebrow">SCENES TO VIDEO</p><h2>${e(graph.title)}</h2></div><a class="button secondary" href="#ima2/graph/${e(graph.id)}">노드 캔버스 열기</a></div><p class="small muted">각 장면의 이미지를 먼저 생성한 뒤 영상을 생성해주세요. 생성에는 선택한 모델의 비용이 발생할 수 있습니다.</p>${b('노드 결과 새로고침', 'open-graph', true, { 'data-id': graph.id })}<div class="story-node-grid">${graph.nodes.map(node => `<article class="story-node"><div class="story-section-heading"><strong>${e(node.id)}</strong>${badge(node.data.studioKind === 'video' ? '영상' : '이미지')}</div><p>${e((node.data.studioSourcePrompt || node.data.prompt).slice(0, 500))}</p>${node.data.imageUrl && /^\/(?:integrations\/ima2\/)?generated\/[\w./-]+$/.test(node.data.imageUrl) ? node.data.studioKind === 'video' ? `<video controls preload="metadata" src="${e(node.data.imageUrl.replace(/^\/generated\//, '/integrations/ima2/generated/'))}"></video>` : `<img alt="생성한 장면" src="${e(node.data.imageUrl.replace(/^\/generated\//, '/integrations/ima2/generated/'))}">` : ''}${b(node.data.imageUrl ? '다시 생성' : '생성', 'run-node', true, { 'data-id': graph.id, 'data-node': node.id, 'data-version': graph.graphVersion })}</article>`).join('')}</div>`;
  el.scrollIntoView({ behavior: 'smooth', block: 'start' });
}
function dialog(title, html) {
  let el = document.querySelector('#story-dialog'); if (!el) { el = document.createElement('dialog'); el.id = 'story-dialog'; document.body.append(el); }
  el.innerHTML = `<div class="dialog-heading"><h2>${e(title)}</h2><button type="button" class="icon-button" aria-label="닫기" data-story-close>×</button></div>${html}`;
  el.querySelector('[data-story-close]').onclick = () => el.close(); el.showModal(); return el;
}
function editSettings(s) {
  const values = s || { title: '', premise: '', episodeCount: 3, minChars: 2000, maxChars: 5000, countSpaces: true, videoTemplateId: 'animation', characterIds: [] };
  const el = dialog(s ? '작품 설정' : '새 시나리오', `<form id="story-settings">${field({ label: '작품 제목', name: 'title', value: values.title, attrs: { required: true, maxlength: 160 } })}${field({ label: '어떤 이야기인가요?', name: 'premise', value: values.premise, rows: 4, placeholder: '주인공, 목표, 갈등, 결말의 방향을 자유롭게 적어주세요.', attrs: { required: true, maxlength: 10000 } })}${field({ label: '영상 스타일 템플릿', name: 'videoTemplateId', value: values.videoTemplateId, options: templates.map(t => ({ value: t.id, label: t.name })) })}<div class="story-length-fields">${field({ label: '전체 화수', name: 'episodeCount', type: 'number', value: values.episodeCount, attrs: { required: true, min: 1, max: 50 } })}${field({ label: '화별 최소 글자 수', name: 'minChars', type: 'number', value: values.minChars, attrs: { required: true, min: 100, max: 20000 } })}${field({ label: '화별 최대 글자 수', name: 'maxChars', type: 'number', value: values.maxChars, attrs: { required: true, min: 100, max: 30000 } })}</div><label class="story-check"><input type="checkbox" name="countSpaces" ${values.countSpaces ? 'checked' : ''}> 글자 수에 공백·줄바꿈 포함</label><details><summary>장르 · 분위기 · 고정 설정 · 출연 캐릭터</summary>${field({ label: '장르', name: 'genre', value: values.genre || '', attrs: { maxlength: 300 } })}${field({ label: '분위기', name: 'tone', value: values.tone || '', attrs: { maxlength: 1000 } })}${field({ label: '세계관과 변경하면 안 되는 설정', name: 'world', value: values.world || '', rows: 3, attrs: { maxlength: 10000 } })}${workspace.characters.filter(c => !c.archived).map(c => `<label class="story-check"><input type="checkbox" name="characterIds" value="${e(c.id)}" ${values.characterIds.includes(c.id) ? 'checked' : ''}> ${e(c.name)} ${c.image ? '' : '· 시트 이미지 미등록'}</label>`).join('') || '<p class="small muted">캐릭터 시트에서 먼저 캐릭터를 등록할 수 있습니다.</p>'}</details>${s ? '<p class="notice">구상·화수·고정 설정·출연 인물 변경은 기존 플롯과 원고를 재검토 상태로 바꿉니다.</p>' : ''}<div class="dialog-actions"><button type="submit" class="button primary">${s ? '설정 저장' : '시나리오 만들기'}</button></div></form>`);
  el.querySelector('form').onsubmit = event => { event.preventDefault(); void attempt(el.querySelector('[type=submit]'), async () => {
    const form = new FormData(event.target), data = Object.fromEntries(form); for (const key of ['episodeCount', 'minChars', 'maxChars']) data[key] = Number(data[key]); data.countSpaces = form.has('countSpaces'); data.characterIds = form.getAll('characterIds');
    current = await act('studio_scenario', { operation: s ? 'update' : 'create', ...(s ? { id: s.id, revision: s.revision } : {}), values: data }); el.close(); await load();
  }); };
}
function editTemplates() {
  let selected = templates[0], draft = { ...selected };
  const el = dialog('대화로 영상 스타일 만들기', `<p class="muted small">애니메이션이나 실사 영화를 시작점으로 고르세요. 원하는 색감, 촬영, 움직임을 대화로 다듬고 내 템플릿으로 저장합니다.</p>${field({ label: '시작 템플릿', name: 'base', value: selected.id, options: templates.map(t => ({ value: t.id, label: t.name })) })}<div class="story-template-reply" role="status">${e(selected.description)}</div><form id="video-style-chat">${field({ label: '스타일 변경 요청', name: 'message', rows: 3, placeholder: '예: 손으로 그린 따뜻한 2D 애니메이션, 수채화 배경과 차분한 카메라로 만들어줘.', attrs: { required: true, maxlength: 6000 } })}<button class="button secondary" type="submit">AI와 스타일 정리</button></form><form id="video-style-save">${field({ label: '템플릿 이름', name: 'name', value: draft.name, attrs: { required: true, maxlength: 100 } })}${field({ label: '짧은 설명', name: 'description', value: draft.description, rows: 2, attrs: { maxlength: 500 } })}${field({ label: '장면마다 적용할 프롬프트 · 직접 수정 가능', name: 'prompt', value: draft.prompt, rows: 8, attrs: { required: true, maxlength: 20000 } })}<div class="dialog-actions"><button class="button primary" type="submit">내 템플릿으로 저장</button></div></form>`);
  const saveForm = el.querySelector('#video-style-save');
  const read = () => ({ name: saveForm.elements.name.value, description: saveForm.elements.description.value, prompt: saveForm.elements.prompt.value });
  const write = () => { for (const key of ['name', 'description', 'prompt']) saveForm.elements[key].value = draft[key]; };
  el.querySelector('[name=base]').onchange = event => { selected = templates.find(t => t.id === event.target.value); draft = { ...selected }; write(); el.querySelector('[role=status]').textContent = selected.description; };
  el.querySelector('#video-style-chat').onsubmit = event => { event.preventDefault(); const form = event.target; void attempt(form.querySelector('button'), async () => {
    saveForm.querySelector('button').disabled = true;
    try { const result = await act('studio_video_template_chat', { message: form.elements.message.value, template: read() }); draft = result.template; write(); el.querySelector('[role=status]').textContent = result.reply; form.elements.message.value = ''; }
    finally { saveForm.querySelector('button').disabled = false; }
  }); };
  saveForm.onsubmit = event => { event.preventDefault(); void attempt(saveForm.querySelector('button'), async () => {
    await act('studio_templates', { kind: 'video', operation: 'save', template: read(), ...(!selected.builtin ? { id: selected.id, updatedAt: selected.updatedAt } : {}) }); el.close(); await load(); toast('영상 템플릿을 저장했습니다. 작품 설정에서 선택해주세요.');
  }); };
}
