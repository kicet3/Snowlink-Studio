import { useAppStore } from './store/useAppStore';

type CharacterSheet = { name: string; image?: string };
function attachedNames() {
  return new Set(useAppStore.getState().trayItems.flatMap(item =>
    item.kind === 'attachment' && item.source.originalName ? [item.source.originalName] : []));
}
export async function addStudioReferences(characters: CharacterSheet[]) {
  const names = attachedNames();
  const pending = characters.filter(c => c.image).map(character => ({
    ...character, filename: `${character.name}-${encodeURIComponent(character.image!)}`,
  })).filter(character => {
    if (names.has(character.filename)) return false;
    names.add(character.filename); return true;
  });
  const state = useAppStore.getState();
  if (state.trayItems.length + pending.length > state.activeReferenceLimit()) {
    throw new Error('캐릭터 시트를 모두 추가할 공간이 없습니다. 기존 참조를 정리한 뒤 다시 시도해주세요.');
  }
  const files = await Promise.all(pending.map(async character => {
    const response = await fetch(character.image!);
    if (!response.ok) throw new Error(`${character.name} 시트를 불러오지 못했습니다.`);
    const blob = await response.blob();
    return new File([blob], character.filename, { type: blob.type });
  }));
  if (!files.length) return;
  await state.addReferences(files);
  const added = attachedNames();
  if (files.some(file => !added.has(file.name))) throw new Error('일부 시트를 추가하지 못했습니다. 참조 트레이를 확인해주세요.');
}
