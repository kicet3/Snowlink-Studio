import { IMAGE_MODEL_OPTIONS } from './lib/imageModels';
import { useAppStore } from './store/useAppStore';

type Selection = { provider: 'gpt' | 'grok'; model: string };
type Preferences = { revision: number; roles: { image: Selection; video: Selection } };
let preferences: Preferences | undefined;
let applying = false;
let initialized = false;

function applyDefaults(video: boolean) {
  if (!preferences || applying) return;
  applying = true;
  try {
    const selected = preferences.roles[video ? 'video' : 'image'];
    const state = useAppStore.getState();
    state.setProvider(selected.provider === 'gpt' ? 'oauth' : 'grok');
    if (video) state.selectVideoModel(selected.model);
    else {
      const model = IMAGE_MODEL_OPTIONS.find(option => option.value === selected.model);
      if (model) state.setImageModel(model.value);
    }
  } finally { applying = false; }
}
async function refresh() {
  try {
    const response = await fetch('/api/ai/settings');
    if (!response.ok) throw new Error('설정 연결 실패');
    const next: Preferences = await response.json();
    if (next.revision === preferences?.revision) return;
    preferences = next;
    const video = Boolean(useAppStore.getState().videoModelSelected);
    applyDefaults(!video);
    applyDefaults(video);
  } catch (error) { console.warn('[Snowframe Studio] 기본 모델을 불러오지 못했습니다.', error); }
}
export function startStudioPreferences() {
  if (initialized) return;
  initialized = true;
  // Restored graphs and browser preferences must use the same media lane.
  let enforcing = false;
  useAppStore.subscribe(state => {
    if (enforcing || (state.provider === 'grok' && !state.mcpProvider && state.assetGenProvider === 'grok')) return;
    enforcing = true;
    try {
      if (state.provider !== 'grok' || state.mcpProvider) state.setProvider('grok');
      if (state.assetGenProvider !== 'grok') state.setAssetGenProvider('grok');
    } finally { enforcing = false; }
  });
  useAppStore.getState().setProvider('grok');
  void refresh();
  document.addEventListener('ai-settings-updated', () => void refresh());
  window.addEventListener('focus', () => void refresh());
  window.addEventListener('message', event => {
    if (event.source !== window.parent || event.data?.type !== 'snowfall:preferences-changed') return;
    let origin;
    try { origin = new URL(document.referrer).origin; } catch { return; }
    if (event.origin === origin) void refresh();
  });
}
