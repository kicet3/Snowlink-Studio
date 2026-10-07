import { createRoot, type Root } from 'react-dom/client';
import App from './App';
import { initTheme } from './hooks/useTheme';
import { bootstrapLanSession } from './lib/lanSession';
import { startStudioPreferences } from './snowfall';
import { StudioBridge } from './StudioBridge';
import { loadStudioBrief } from './studio-production';
import { useAppStore } from './store/useAppStore';
import './index.css';
import './studio-imports.css';

let mounted = false;
let root: Root;
function renderActive() { root.render((location.hash === "#ima2" || location.hash.startsWith("#ima2/")) ? <><StudioBridge /><App /></> : null); }
async function openLinkedGraph() {
  const match = /^#ima2\/graph\/([\w-]+)$/.exec(location.hash);
  if (!match) return;
  try { await useAppStore.getState().switchSession(match[1]); useAppStore.getState().setUIMode('node'); }
  catch { useAppStore.getState().showToast('노드를 열지 못했습니다. 시나리오 화면에서 다시 열어주세요.', true); }
}
export async function mountStudio(element: HTMLElement) {
  if (mounted) return;
  await bootstrapLanSession();
  initTheme();
  root = createRoot(element);
  renderActive();
  window.addEventListener("hashchange", renderActive);
  window.addEventListener('hashchange', () => void openLinkedGraph());
  document.addEventListener('studio:load-production', event => {
    void loadStudioBrief((event as CustomEvent).detail).catch(error => useAppStore.getState().showToast(error.message, true));
  });
  startStudioPreferences();
  mounted = true;
  await openLinkedGraph();
}
