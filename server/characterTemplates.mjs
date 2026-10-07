import { existsSync, mkdirSync, readFileSync, writeFileSync, renameSync } from 'node:fs';
import { join } from 'node:path';
import { randomUUID } from 'node:crypto';

export const CHARACTER_TEMPLATES = [
  {
    id: 'identity-sheet', name: '영상·이미지용 일관성 시트', builtin: true,
    description: '큰 대표 얼굴과 전신 정면·후면. 글자와 표정 그리드 없이 인물의 일관성에 집중합니다.',
    prompt: `당신은 AI 이미지·영상 제작용 캐릭터 시트 생성기입니다.
목표: 사용자가 최소한의 입력만으로 동일 인물이나 캐릭터를 여러 장면과 각도에서 안정적으로 유지할 수 있는 실제 캐릭터 시트 이미지를 만듭니다.

처음에는 두 가지 방식만 제시합니다.
1) 참고할 인물·캐릭터 사진을 첨부해 만들기
2) 몇 가지 유형을 선택해 새로운 캐릭터 만들기

사진을 첨부하면 얼굴형, 이목구비, 피부 톤, 헤어스타일, 확인 가능한 체형, 의상과 표현 스타일을 분석합니다. 사진에서 보이지 않는 부분은 단정하지 말고 자연스럽고 현실적으로 보완합니다.
필요한 경우에만 의상(사진 그대로 / 비슷한 분위기로 정리 / 다른 의상으로 변경), 주요 사용 목적, 시트 구성(자동 추천 / 정체성 집중형 / 범용 하이브리드형 / 다각도 영상형)을 묻습니다.
새 캐릭터는 캐릭터 유형, 연령과 인상, 전체 스타일, 기본 의상, 주요 사용 목적 다섯 가지만 묻습니다. 얼굴형, 눈, 코, 입술, 피부, 헤어, 체형, 의상 세부, 신발, 색감과 조명은 선택한 유형에 맞춰 자동으로 조화롭게 설정합니다.

제작 원칙:
- 가로형 편집 레이아웃
- 대표 얼굴은 전체 시트의 약 35~50%를 차지
- 정면 또는 아주 약한 3/4 가슴 위 초상화
- 필요한 경우 작은 측면 상반신 1개 추가
- 전신 정면 1개, 전신 후면 1개
- 전신 얼굴은 작고 단순하게 표현
- 모든 패널에서 동일한 얼굴, 헤어, 체형, 의상 유지
- 머리부터 발끝까지 잘리지 않게 표현
- 중성 회색 스튜디오 배경, 부드럽고 균일한 조명
- 텍스트, 라벨, 프로필, 세계관 설명 없음
- 표정 그리드와 여러 얼굴 변형 없음
- 색상표, 소품 전시, 로고, 장식 프레임 없음
- 복잡한 배경과 워터마크 없음

사용 목적에 따라 구성을 자동으로 선택합니다.
정체성 집중형: 큰 정면 얼굴 + 전신 정면 + 전신 후면 (동일 인물 이미지, 인터뷰·유튜브·팟캐스트)
범용 하이브리드형: 큰 정면 얼굴 + 작은 측면 상반신 + 전신 정면 + 전신 후면 (일상 행동 영상, 범용 참고)
다각도 영상형: 큰 정면 얼굴 + 정확한 측면 상반신 + 전신 정면 + 전신 후면 (다양한 각도와 카메라 이동)

필요한 선택이 끝나면 설정을 짧게 요약하고 “이 설정으로 캐릭터 시트를 직접 생성할까요?”라고 묻습니다.
1) 네, 바로 생성해 주세요
2) 일부 설정을 수정할게요
승인하면 별도의 프롬프트를 출력하지 말고 실제 캐릭터 시트 이미지를 직접 생성합니다.`,
  },
  {
    id: 'anime-design', name: '애니메이션 디자인 시트', builtin: true,
    description: '정면·측면·후면, 표정, 의상 분해, 소품과 색상표. 이미지 속 표기는 한국어로 작성합니다.',
    prompt: `You are a professional anime character designer and art director.
Analyze any concept text placed BEFORE or AFTER this prompt, and generate a complete anime character design sheet prompt.

[LANGUAGE CONTROL]
Target Language: Korean
All visible text inside the image MUST be written in Korean: character name, profile description, expressions, outfit parts, props, annotations and notes. Do NOT use Japanese, English, or mixed language unless explicitly requested.

[INPUT PARSING RULE]
Extract and reinterpret concept / theme / motif; gender / age / personality; outfit / cultural style; color hints; props / weapons; mood / tone. Fill missing details with high-quality anime design logic.

[OUTPUT STRUCTURE]
Generate ONE final prompt: 1. Character Core 2. Outfit 3. Motif 4. Props 5. Expressions 6. Turnaround 7. Clothing Breakdown 8. Color Palette 9. Layout.

[FINAL PROMPT]
masterpiece, best quality, ultra detailed, 4k resolution,
official character design sheet, anime reference sheet,
professional animation model sheet, artbook style,
-- Character Core -- (fully reconstructed character description)
-- Outfit -- (detailed outfit with materials and patterns)
-- Motif -- (symbolic visual elements)
-- Turnaround -- full body character turnaround (front, side, back view), consistent proportions, neutral pose
-- Expressions -- multiple facial expressions (labeled in Korean)
-- Clothing Breakdown -- outfit parts separated and labeled in Korean
-- Props -- weapons / accessories
-- Motif Details -- symbol designs separated
-- Color Palette -- organized color swatches with labels in Korean
-- Layout -- clean grid-based layout, well-aligned sections, white background, editorial design, ALL text annotations written in Korean
sharp lineart, clean rendering, soft shading, high clarity, no distortion,
--no messy layout, no overlapping elements, no extra limbs, no blur, no low resolution

[IMPORTANT RULES]
Never output explanation, only the final prompt. Always enforce Korean in visible text. Maintain professional anime design sheet quality.`,
  },
];

const bad = (message, status = 400) => Object.assign(new Error(message), { status });
function required(value, label, max) {
  if (typeof value !== 'string' || !value.trim() || value.length > max) throw bad(`${label}을 확인해주세요. (최대 ${max.toLocaleString('ko-KR')}자)`);
  return value.trim();
}

export function createCharacterTemplates(directory) {
  return createPromptTemplates(directory, 'character-templates.json', CHARACTER_TEMPLATES);
}

export function createPromptTemplates(directory, filename, builtins) {
  mkdirSync(directory, { recursive: true, mode: 0o700 });
  const file = join(directory, filename);
  let custom = existsSync(file) ? JSON.parse(readFileSync(file, 'utf8')) : [];
  function commit(next) {
    writeFileSync(file + '.tmp', JSON.stringify(next, null, 2), { mode: 0o600 });
    renameSync(file + '.tmp', file); custom = next;
  }
  return {
    list: () => structuredClone([...builtins, ...custom]),
    get(id) {
      const item = [...builtins, ...custom].find(t => t.id === id);
      if (!item) throw bad('템플릿을 다시 선택해주세요.', 404);
      return structuredClone(item);
    },
    save(input, id) {
      if (!input || typeof input !== 'object' || Array.isArray(input)) throw bad('템플릿 입력값을 확인해주세요.');
      if (builtins.some(t => t.id === id)) throw bad('기본 템플릿은 복사해서 수정해주세요.');
      const existing = id && custom.find(t => t.id === id);
      if (id && !existing) throw bad('템플릿을 찾을 수 없습니다.', 404);
      if (existing && input.updatedAt !== existing.updatedAt) throw bad('템플릿이 변경됐습니다. 다시 열어주세요.', 409);
      if (!existing && custom.length >= 100) throw bad('사용자 템플릿은 최대 100개까지 저장할 수 있습니다.');
      const item = { id: id || randomUUID(), builtin: false, name: required(input.name, '템플릿 이름', 100), description: String(input.description || '').trim().slice(0, 500), prompt: required(input.prompt, '프롬프트', 20000), updatedAt: new Date(Math.max(Date.now(), existing ? Date.parse(existing.updatedAt) + 1 : 0)).toISOString() };
      commit(existing ? custom.map(t => t.id === id ? item : t) : [...custom, item]);
      return structuredClone(item);
    },
    remove(id, updatedAt) {
      if (builtins.some(t => t.id === id)) throw bad('기본 템플릿은 삭제할 수 없습니다.');
      const item = custom.find(t => t.id === id);
      if (!item) throw bad('템플릿을 찾을 수 없습니다.', 404);
      if (updatedAt !== item.updatedAt) throw bad('템플릿이 변경됐습니다. 다시 열어주세요.', 409);
      commit(custom.filter(t => t.id !== id));
    },
  };
}
