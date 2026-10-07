import { createPromptTemplates } from './characterTemplates.mjs';

export const VIDEO_TEMPLATES = [
  { id: 'animation', builtin: true, name: '애니메이션', description: '일관된 캐릭터 디자인, 선명한 실루엣과 감정 연기 중심의 애니메이션.', prompt: '애니메이션 영상 연출. 캐릭터 시트의 얼굴·헤어·체형·의상을 모든 컷에서 유지한다. 선명한 실루엣, 일관된 선과 색, 부드러운 셀 셰이딩, 자연스러운 포즈와 읽기 쉬운 표정. 행동의 준비·본동작·여운을 명확하게 한다. 장면의 감정에 맞는 카메라와 배경, 조명, 컷 전환을 사용한다. 대사와 화자, 움직임의 순서를 명시하고 소품·위치·시선·시간대의 연속성을 유지한다. 사용자 지시 없이 화면 자막이나 로고를 추가하지 않는다.' },
  { id: 'live-action', builtin: true, name: '실사 영화', description: '사실적인 인물·재질·빛과 절제된 카메라 움직임을 사용하는 영화 연출.', prompt: '실사 영화 영상 연출. 캐릭터 시트의 인물 정체성, 의상, 체형, 헤어스타일을 일관되게 유지한다. 현실적인 피부와 재질, 물리적으로 자연스러운 조명과 움직임, 영화적인 구도와 깊이. 이야기와 감정을 전달하는 렌즈·숏 크기·카메라 움직임을 선택한다. 과장된 미용 필터, 인위적인 표정, 불필요한 카메라 이동을 피한다. 배우의 행동·대사·반응을 인과 순서대로 명시하고 소품·동선·시선·시간대의 연속성을 유지한다. 사용자 지시 없이 자막·워터마크·로고를 넣지 않는다.' },
];
export const createVideoTemplates = directory => createPromptTemplates(directory, 'video-templates.json', VIDEO_TEMPLATES);

export async function planVideoTemplate(ai, input) {
  if (typeof input?.message !== 'string' || !input.message.trim() || input.message.length > 6000) throw Object.assign(new Error('원하는 영상 스타일을 6,000자 이내로 설명해주세요.'), { status: 400 });
  const current = input.template;
  if (current && (typeof current.prompt !== 'string' || current.prompt.length > 20000)) throw Object.assign(new Error('기존 템플릿을 확인해주세요.'), { status: 400 });
  const answer = await ai.complete([
    { role: 'system', content: '당신은 영상 아트 디렉터입니다. 사용자와의 대화를 통해 재사용할 영상 스타일 템플릿을 설계합니다. 애니메이션/실사 영화/사용자 지정 표현 방식을 명확히 하고 화풍 또는 촬영, 색, 조명, 연기, 카메라, 움직임, 사운드 지침과 피할 요소를 정리합니다. 특정 사건이나 화의 줄거리를 고정하지 않습니다. 요청한 변경 외에는 기존 템플릿을 유지합니다. 실제 영상을 생성했다고 말하지 마세요. JSON 하나만 출력: {"reply":"한국어 요약과 필요한 질문", "template":{"name":"100자 이하", "description":"500자 이하", "prompt":"다음 장면마다 적용할 구체적인 지침, 20000자 이하"}}' },
    { role: 'user', content: JSON.stringify({ message: input.message, current: current || null }) },
  ], undefined, 'chat');
  let result;
  try { result = JSON.parse(answer.content.trim().replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '')); } catch { /* Validated below. */ }
  const valid = (value, max) => typeof value === 'string' && value.trim() && value.length <= max;
  if (!result || !valid(result.reply, 6000) || !valid(result.template?.name, 100) || !valid(result.template?.description, 500) || !valid(result.template?.prompt, 20000)) throw Object.assign(new Error('영상 템플릿 응답을 확인하지 못했습니다. 다시 요청해주세요.'), { status: 502 });
  return { reply: result.reply, template: result.template };
}
