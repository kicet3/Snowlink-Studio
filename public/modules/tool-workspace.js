import { state, api } from './state.js';

export async function openTool(id) {
  const panel = document.querySelector(`#panel-${id}`);
  if (panel.querySelector('iframe')) return;
  const connections = state.connections?.[id]?.url ? state.connections : await api('/api/connections');
  const tool = connections[id];
  if (!tool?.url) throw new Error('제작 도구의 주소를 확인할 수 없습니다.');
  const frame = document.createElement('iframe');
  frame.title = id === 'ima2' ? '이미지 · 영상 제작' : '트렌드 탐색';
  frame.className = 'tool-workspace-frame';
  frame.src = tool.url;
  frame.allow = 'clipboard-write; fullscreen';
  panel.classList.add('tool-workspace-panel');
  panel.replaceChildren(frame);
}
document.addEventListener('ai-settings-updated', () => {
  for (const frame of document.querySelectorAll('.tool-workspace-frame')) frame.contentWindow?.postMessage({ type: 'snowfall:preferences-changed' }, new URL(frame.src).origin);
});
