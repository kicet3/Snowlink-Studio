import { toolPath } from './integration-api.js';

export function generationRequest(mode, values, references, requestId) {
  const prompt = String(values.prompt || '').trim();
  if (!prompt) throw new Error('만들고 싶은 장면을 입력해주세요.');
  if (!['oauth', 'grok'].includes(values.provider)) throw new Error('OAuth 제공자를 선택해주세요.');
  if (mode === 'video') {
    if (values.provider !== 'grok') throw new Error('영상 제작은 Grok OAuth를 사용합니다.');
    const videoMode = values.videoMode === 'auto' ? references.length > 1 ? 'reference-to-video' : references.length ? 'image-to-video' : 'text-to-video' : values.videoMode;
    if (videoMode === 'text-to-video' && references.length) throw new Error('텍스트 영상에서는 참고 이미지를 제거해주세요.');
    if (videoMode === 'image-to-video' && references.length !== 1) throw new Error('첫 프레임으로 사용할 이미지 1장을 선택해주세요.');
    if (videoMode === 'reference-to-video' && (!references.length || references.length > 14)) throw new Error('참고 이미지는 1~14장 선택해주세요.');
    if (videoMode === 'reference-to-video' && values.resolution === '1080p') throw new Error('참고 이미지 영상은 480p 또는 720p를 선택해주세요.');
    const duration = Number(values.duration);
    const max = videoMode === 'reference-to-video' && values.model === 'grok-imagine-video' ? 10 : 15;
    if (!Number.isInteger(duration) || duration < 1 || duration > max) throw new Error(`이 모드의 영상 길이는 1~${max}초입니다.`);
    return { endpoint: '/api/video', body: { requestId, async: true, provider: 'grok', model: values.model, prompt, duration, resolution: values.resolution, aspectRatio: values.aspectRatio, mode: videoMode, ...(videoMode === 'image-to-video' ? { sourceImage: references[0] } : videoMode === 'reference-to-video' ? { referenceImages: references } : {}) } };
  }
  if (references.length > 5) throw new Error('이미지 참고 자료는 최대 5장까지 사용할 수 있습니다.');
  const base = { requestId, prompt, provider: values.provider, model: values.model, quality: values.quality, size: values.size, moderation: 'low', mode: 'auto' };
  if (mode === 'edit') {
    if (references.length !== 1) throw new Error('편집할 이미지 1장을 선택해주세요.');
    return { endpoint: '/api/edit', body: { ...base, image: references[0] } };
  }
  return { endpoint: '/api/generate', body: { ...base, async: true, n: Number(values.n || 1), references, format: 'png' } };
}
export function mediaAssets(data) {
  const items = data.images || data.items || (data.filename ? [data] : []);
  return items.filter(i => typeof i.filename === 'string').map(i => ({ filename: i.filename, mediaType: i.mediaType === 'video' || /\.mp4$/i.test(i.filename) ? 'video' : 'image', prompt: i.userPrompt || i.prompt || data.prompt || '' }));
}
export function assetUrl(filename) {
  return toolPath('ima2', '/generated/' + filename.split('/').map(encodeURIComponent).join('/'));
}
export function updateJob(job, event, data) {
  if (!job || ['done', 'error', 'canceled'].includes(job.status)) return job;
  if (data.jobSeq && job.sequence && data.jobSeq <= job.sequence) return job;
  const next = { ...job, sequence: data.jobSeq || job.sequence };
  if (event === 'done') return { ...next, status: 'done', message: '제작 완료', assets: mediaAssets(data) };
  if (event === 'error') return { ...next, status: 'error', message: typeof data.error === 'string' ? data.error : data.error?.message || data.message || '생성에 실패했습니다.' };
  const messages = { planning: '장면을 준비하고 있습니다', submitted: '생성 요청을 전달했습니다', image: '이미지를 저장하고 있습니다', phase: '생성 작업 진행 중', progress: '영상을 제작하고 있습니다' };
  return { ...next, status: 'running', message: messages[event] || '생성 작업 진행 중', progress: typeof data.progress === 'number' ? Math.max(0, Math.min(1, data.progress)) : job.progress };
}
