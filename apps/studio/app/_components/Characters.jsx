'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useStudio } from './StudioProvider';
import { Badge,Button,EmptyState,PageHeading } from './Primitives';
import { Icon } from './Icon';
import { CharacterEditor } from './CharacterEditor';
import { CharacterStudio } from './CharacterStudio';

export function Characters() {
  const {workspace,openModal}=useStudio(),[archived,setArchived]=useState(false);
  const create=()=>openModal('AI와 캐릭터 시트 만들기',<CharacterStudio/>,true);
  const edit=c=>openModal('캐릭터 설정 수정',<CharacterEditor existing={c}/>);
  const items=workspace.characters.filter(c=>c.archived===archived);
  return <div className="page"><PageHeading eyebrow="THE CAST OF YOUR STORIES" index="02 / CHARACTERS" title={['이야기는 바뀌어도,','캐릭터는 그대로']} description="외형, 성격, 시트를 함께 저장하고 콘텐츠마다 다시 선택하세요." actions={<Button icon="plus" onClick={create}>캐릭터 등록</Button>}/>
    <div className="library-toolbar"><h2>내 캐릭터 <span className="counter">{items.length}</span></h2><div><Button variant="quiet-button" icon="spark" onClick={create}>AI와 시트 만들기</Button><button className={`quiet-button ${archived?'selected':''}`} id="character-archive" aria-pressed={archived} onClick={()=>setArchived(!archived)}>보관함</button></div></div>
    {items.length?<div className="character-grid">{items.map(c=><article key={c.id} className="surface-card character-card"><button className="character-image" aria-label={`${c.name} 수정`} onClick={()=>edit(c)}>{c.image?<img src={c.image} alt={`${c.name} 캐릭터 시트`} loading="lazy"/>:<div className="character-placeholder"><Icon name="people"/><span>시트를 추가해주세요</span></div>}</button><div className="character-info"><div><button className="character-name" onClick={()=>edit(c)}>{c.name}</button><span className="small muted">{workspace.productions.filter(p=>!p.archived&&p.characterIds.includes(c.id)).length}개 콘텐츠</span></div><p>{c.description||'외형과 성격을 기록해보세요.'}</p>{!archived && <Link className="button secondary" href={`/chat?source=workspace&character=${encodeURIComponent(c.id)}`}>이 캐릭터와 대화하기</Link>}<div className="tag-list">{c.tags.split(',').filter(t=>t.trim()).map((t,i)=><Badge key={i} tone="pine">{t.trim()}</Badge>)}</div></div></article>)}</div>:<EmptyState eyebrow="BUILD YOUR CAST" title={archived?'보관한 캐릭터가 없습니다':'첫 번째 캐릭터를 만나볼까요?'} description={'사진이나 짧은 아이디어로 AI와 캐릭터를 만들고,\n템플릿을 골라 실제 시트 이미지까지 생성하세요.'} illustration={<div className="sheet-illustration"><div className="sheet-back"/><div className="sheet-front"><Icon name="people"/><span>CHARACTER / 001</span><i/><i/></div></div>} actions={!archived&&<Button icon="plus" onClick={create}>첫 캐릭터 등록</Button>}/>}
    <footer className="page-footer"><span>AI와 시트를 만들거나 완성된 이미지를 등록하고, 다음 제작에도 같은 캐릭터를 사용하세요.</span><span>PNG · JPG · WebP / 최대 6MB</span></footer></div>;
}
