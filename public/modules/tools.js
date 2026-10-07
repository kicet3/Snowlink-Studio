import { state, api } from './state.js';


export async function checkConnections() {
  try { state.connections = await api('/api/connections'); }
  catch { state.connections = {}; }
  for (const id of ['ima2', 'trends']) {
    const online = state.connections[id]?.online;
    const dot = document.querySelector(`[data-status="${id}"]`);
    if (!dot) continue;
    dot.classList.toggle('online', !!online);
    dot.title = online ? '서버 연결됨' : '서버 연결 확인 필요';
    const status = document.querySelector(`#panel-${id} .tool-status`);
    if (status) { status.textContent = online ? '연결됨' : '연결 확인 필요'; status.dataset.tone = online ? 'pine' : 'ochre'; }
  }
}
