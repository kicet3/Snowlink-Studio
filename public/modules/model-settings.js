import { api } from './state.js';
import { field, button } from './components.js';
import { toast } from './ui.js';

let settings;
const labels = { planning: ['기획 · 트렌드 분석', '원고와 트렌드 분석에 사용할 대화 모델'], chat: ['대화 · 캐릭터 · 컷 편집', '캐릭터 설정 대화와 ShortGPT 장면 수정에 사용할 모델'], image: ['이미지 · 캐릭터 시트', 'GPT는 이미지 기획 모델을 선택합니다. 실제 렌더링은 gpt-image-2입니다.'], video: ['영상 생성', '현재 연결된 영상 생성 경로는 Grok OAuth입니다.'] };
const providerName = id => id === 'gpt' ? 'GPT OAuth' : 'Grok OAuth';
export async function loadModelSettings() {
  const target = document.querySelector('#model-settings');
  try { settings = await api('/api/ai/settings'); render(target); }
  catch (error) { target.textContent = error.message; }
}
function render(target) {
  target.innerHTML = Object.entries(labels).map(([role, [title, description]]) => {
    const selected = settings.roles[role];
    return `<form class="model-role" data-model-role="${role}"><div><h3>${title}</h3><p class="small muted">${description}</p></div>${field({ label: 'AI 제공자', name: 'provider', value: selected.provider, options: Object.keys(settings.catalog[role]).map(id => ({ value: id, label: providerName(id) })) })}${modelField(role, selected.provider, selected.model)}${button('저장', { variant: 'secondary', attrs: { type: 'submit' } })}</form>`;
  }).join('');
  for (const form of target.querySelectorAll('form')) {
    form.elements.provider.onchange = () => {
      const role = form.dataset.modelRole;
      const current = settings.roles[role];
      form.elements.model.closest('label').outerHTML = modelField(role, form.elements.provider.value, current.provider === form.elements.provider.value ? current.model : undefined);
    };
    form.onsubmit = save;
  }
}
function modelField(role, provider, value) {
  const options = settings.catalog[role][provider].map(m => ({ value: m.id, label: m.label || m.id }));
  if (value && !options.some(o => o.value === value)) options.unshift({ value, label: `${value} (현재 목록에서 확인되지 않음)` });
  return field({ label: role === 'image' && provider === 'gpt' ? '이미지 기획 모델' : '사용할 모델', name: 'model', value: value || options[0]?.value, options });
}
async function save(event) {
  event.preventDefault();
  const form = event.currentTarget;
  const value = { provider: form.elements.provider.value, model: form.elements.model.value };
  const controls = [...document.querySelectorAll('#model-settings input, #model-settings select, #model-settings button')];
  controls.forEach(c => c.disabled = true);
  try {
    settings = await api('/api/ai/settings', 'PUT', { role: form.dataset.modelRole, value, revision: settings.revision });
    toast(`${labels[form.dataset.modelRole][0]} 모델을 저장했습니다.`);
    document.dispatchEvent(new Event('ai-settings-updated'));
  } catch (error) { toast(error.message); }
  finally { controls.forEach(c => c.disabled = false); }
}
