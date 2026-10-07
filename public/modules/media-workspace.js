import { editCharacter } from './dialogs.js';
import { api } from './state.js';
import { toast } from './ui.js';

let mounting;
export async function openMediaWorkspace() {
  if (mounting) return mounting;
  mounting = mount().catch(error => { mounting = null; throw error; });
  return mounting;
}
async function mount() {
  const panel = document.querySelector('#panel-ima2');
  panel.classList.add('media-workspace-panel');
  panel.innerHTML = '<div class="snowfall-media" data-theme="light"><div id="studio-media-root"></div></div>';
  const manifest = await (await fetch('/studio-media/.vite/manifest.json')).json();
  const entry = manifest['src/studio-entry.tsx'];
  if (!entry?.file) throw new Error('제작 화면 빌드가 필요합니다.');
  const styles = new Set();
  const visited = new Set();
  const collect = key => { if (visited.has(key)) return; visited.add(key); const part = manifest[key]; for (const dep of part?.imports || []) collect(dep); for (const css of part?.css || []) styles.add('/studio-media/' + css); };
  collect('src/studio-entry.tsx');
  for (const href of [...styles, '/styles/media-theme.css']) {
    if (document.querySelector(`link[href="${href}"]`)) continue;
    const link = document.createElement('link'); link.rel = 'stylesheet'; link.href = href;
    await new Promise((resolve, reject) => { link.onload = resolve; link.onerror = reject; document.head.append(link); });
  }
  const { mountStudio } = await import('/studio-media/' + entry.file);
  await mountStudio(panel.querySelector('#studio-media-root'));
}
document.addEventListener('studio:register-character', async event => {
  try { const { image } = await api('/api/media', 'POST', { data: event.detail.dataUrl }); editCharacter(null, { image, description: event.detail.prompt }); }
  catch (error) { toast(error.message); }
});
