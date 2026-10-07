import { useEffect, useState } from 'react';
import { useAppStore } from './store/useAppStore';
import { addStudioReferences } from './studio-references';

type Character = { id: string; name: string; image?: string; description?: string };
export function StudioBridge() {
  const [characters, setCharacters] = useState<Character[]>([]);
  const [selected, setSelected] = useState('');
  const [busy, setBusy] = useState(false);
  const showToast = useAppStore(s => s.showToast);
  const current = useAppStore(s => s.currentImage);
  useEffect(() => {
    const refresh = () => { void fetch('/api/workspace').then(r => r.json()).then(data => setCharacters(data.characters.filter((c: Character & { archived?: boolean }) => !c.archived))).catch(() => showToast('캐릭터 목록을 불러오지 못했습니다.', true)); };
    refresh(); document.addEventListener('workspace-updated', refresh);
    return () => document.removeEventListener('workspace-updated', refresh);
  }, [showToast]);
  async function addCharacter() {
    const character = characters.find(c => c.id === selected);
    if (!character?.image || busy) return;
    setBusy(true);
    try {
      await addStudioReferences([character]);
      showToast(`${character.name} 캐릭터 시트를 참조에 추가했습니다.`);
    } catch (error) { showToast(error instanceof Error ? error.message : '참조 추가 실패', true); }
    finally { setBusy(false); }
  }
  async function useResult() {
    if (!current?.filename || busy) return;
    if (/\.(mp4|webm)$/i.test(current.filename)) { showToast('캐릭터 시트에는 이미지를 선택해주세요.', true); return; }
    setBusy(true);
    try {
      const response = await fetch('/generated/' + current.filename.split('/').map(encodeURIComponent).join('/'));
      if (!response.ok) throw new Error('생성 이미지를 불러오지 못했습니다.');
      const blob = await response.blob();
      const dataUrl = await new Promise<string>((resolve, reject) => { const reader = new FileReader(); reader.onload = () => resolve(String(reader.result)); reader.onerror = reject; reader.readAsDataURL(blob); });
      document.dispatchEvent(new CustomEvent('studio:register-character', { detail: { dataUrl, prompt: current.prompt || '' } }));
    } catch (error) { showToast(error instanceof Error ? error.message : '캐릭터 등록 실패', true); }
    finally { setBusy(false); }
  }
  return <div className="studio-media-bridge">
    <strong>이미지 · 영상 제작</strong>
    <label>작업실 캐릭터 <select value={selected} onChange={e => setSelected(e.target.value)}><option value="">캐릭터 선택</option>{characters.filter(c => c.image).map(c => <option key={c.id} value={c.id}>{c.name}</option>)}</select></label>
    <button disabled={!selected || busy} onClick={() => void addCharacter()}>시트 참조에 추가</button>
    <button disabled={!current?.filename || busy} onClick={() => void useResult()}>선택 결과를 캐릭터로 등록</button>
    <a href="/settings">AI 모델 설정</a>
  </div>;
}
