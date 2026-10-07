export const toolPath = (tool, path) => `/integrations/${tool}${path}`;
export async function toolApi(tool, path, { method = 'GET', body, signal, timeout = 180000 } = {}) {
  const response = await fetch(toolPath(tool, path), { method, signal: signal || AbortSignal.timeout(timeout), headers: body ? { 'Content-Type': 'application/json' } : {}, body: body ? JSON.stringify(body) : undefined });
  const data = await response.json();
  if (!response.ok) throw Object.assign(new Error(typeof data.error === 'string' ? data.error : data.error?.message || `요청에 실패했습니다 (${response.status}).`), { status: response.status });
  return data;
}
export function safeUrl(value) {
  try { const url = new URL(value); return ['http:', 'https:'].includes(url.protocol) ? url.href : ''; }
  catch { return ''; }
}
export function readImage(file) {
  if (!['image/png', 'image/jpeg', 'image/webp'].includes(file.type) || file.size > 6 * 1024 * 1024) return Promise.reject(new Error('PNG · JPG · WebP, 6MB 이하 이미지를 선택해주세요.'));
  return new Promise((resolve, reject) => {
    const reader = new FileReader(); reader.onload = () => resolve(reader.result); reader.onerror = () => reject(new Error('이미지를 읽지 못했습니다.')); reader.readAsDataURL(file);
  });
}
