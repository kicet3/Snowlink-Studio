import { generationRequest } from './media-data.js';

export const PURPOSES = ['동일 인물 이미지 생성', '인터뷰·유튜브·팟캐스트', '일상 행동이 포함된 영상', '다양한 각도와 카메라 이동이 있는 영상', '애니메이션·웹툰·3D 참고'];
export const LAYOUTS = ['자동 추천', '정체성 집중형', '범용 하이브리드형', '다각도 영상형'];

export function characterSheetRequest(prepared, selection, references, requestId) {
  if (!prepared?.ready || !prepared.sheetPrompt?.trim()) throw new Error('AI와 설정을 정리한 뒤 생성해주세요.');
  if (!selection?.model || !['gpt', 'grok'].includes(selection.provider)) throw new Error('설정 · OAuth에서 이미지 모델을 선택해주세요.');
  const request = generationRequest('image', { provider: selection.provider === 'gpt' ? 'oauth' : 'grok', model: selection.model, prompt: prepared.sheetPrompt, size: '1536x1024', quality: 'high', n: 1 }, references, requestId);
  return { ...request, body: { ...request.body, mode: 'direct', webSearchEnabled: false } };
}
