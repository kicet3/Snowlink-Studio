import { useAppStore } from './store/useAppStore';
import { addStudioReferences } from './studio-references';

type Brief = { story: string; characters: Array<{ name: string; image?: string; description?: string }> };
export async function loadStudioBrief(brief: Brief) {
  const state = useAppStore.getState();
  await addStudioReferences(brief.characters);
  state.setPrompt([brief.story, ...brief.characters.map(c => `${c.name}: ${c.description || ''}`)].filter(Boolean).join('\n\n'));
  state.showToast('제작 기획과 캐릭터 시트를 불러왔습니다. 프롬프트를 확인한 뒤 생성해주세요.');
}
