export async function api(path, method = 'GET', body, options = {}) {
  const response = await fetch(path, {
    ...options, method, cache: 'no-store', credentials: 'same-origin',
    headers: { ...(body !== undefined ? { 'Content-Type': 'application/json' } : {}), ...options.headers },
    body: body === undefined ? undefined : JSON.stringify(body),
    signal: options.signal || AbortSignal.timeout(path.endsWith('/chat') ? 135000 : path.startsWith('/api/google/') ? 45000 : 25000),
  });
  const data = await response.json();
  if (!response.ok) throw Object.assign(new Error(typeof data.error === 'string' ? data.error : data.error?.message || '요청을 완료하지 못했습니다.'), { status: response.status });
  return data;
}

export const studioAction = (name, input = {}) => api('/api/studio/actions', 'POST', { name, arguments: input }, { signal: AbortSignal.timeout(140000) });

export function download(name, text, type = 'text/plain') {
  const url = URL.createObjectURL(new Blob([text], { type }));
  const link = document.createElement('a');
  link.href = url; link.download = name; link.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export async function imageData(file) {
  if (!file || !['image/png', 'image/jpeg', 'image/webp'].includes(file.type) || file.size > 6 * 1024 * 1024) {
    throw new Error('PNG · JPG · WebP 이미지를 6MB 이하로 선택해주세요.');
  }
  return new Promise((resolve, reject) => {
    const reader = new FileReader(); reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(new Error('이미지를 읽지 못했습니다.')); reader.readAsDataURL(file);
  });
}

export const FORMATS = {
  story: { label: '썰 영상', icon: 'film', detail: '캐릭터와 이야기를 숏폼으로', channel: 'Reels · Shorts', tone: 'maple' },
  cards: { label: '카드뉴스', icon: 'cards', detail: '핵심 메시지를 한 장씩', channel: 'Instagram', tone: 'ochre' },
  youtube: { label: 'YouTube 영상', icon: 'play', detail: '기획부터 한 편의 영상까지', channel: 'YouTube', tone: 'frost' },
};
export const STAGES = { idea: '아이디어', script: '대본 작성', production: '제작 중', review: '검토 중', done: '완료' };
