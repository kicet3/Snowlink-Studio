'use client';

import { useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useStudio } from './StudioProvider';
import { Button, Field } from './Primitives';
import { Icon } from './Icon';
import { download, FORMATS, STAGES } from '../lib/api';

export function FormFooter({ existing, busy, error, onArchive }) {
  return <><p className="form-error" role="alert" hidden={!error}>{error}</p><div className="form-footer">{existing?<Button disabled={busy} variant="quiet-button" onClick={onArchive}>{existing.archived?'보관 해제':'보관함으로'}</Button>:<span/>}<Button disabled={busy} type="submit" icon="check">저장하기</Button></div></>;
}
export function ProductionEditor({ existing, format='story', draft={} }) {
  const { workspace, save, closeModal, toast }=useStudio();
  const [item,setItem]=useState(existing||{ format,stage:'idea',characterIds:[],...draft });
  const [busy,setBusy]=useState(false),[error,setError]=useState('');
  const change=key=>value=>setItem(prev=>({...prev,[key]:value}));
  async function submit(event,archive) {
    event?.preventDefault();setBusy(true);setError('');
    try { await save('productions',{...item,...(archive===undefined?{}:{archived:archive})},existing); closeModal();toast('저장했습니다.'); }
    catch(err){setError(err.message);} finally{setBusy(false);}
  }
  const cast=workspace.characters.filter(c=>!c.archived||item.characterIds.includes(c.id));
  return <form className="editor-form" onSubmit={submit}><div className="form-grid"><div className="form-main">
    <Field label="콘텐츠 제목" name="title" value={item.title} onChange={change('title')} placeholder="예: 낯가리는 고양이의 첫 출근" required maxLength={160}/>
    <div className="form-row"><Field label="콘텐츠 형식" name="format" value={item.format} onChange={change('format')} options={Object.entries(FORMATS).map(([value,f])=>({value,label:f.label}))}/><Field label="제작 단계" name="stage" value={item.stage} onChange={change('stage')} options={Object.entries(STAGES).map(([value,label])=>({value,label}))}/></div>
    <Field label="이야기 · 대본" name="story" value={item.story} onChange={change('story')} rows={8} placeholder="어떤 이야기를 들려주고 싶나요? 상황, 전개, 마지막 한마디까지 자유롭게 적어주세요." maxLength={30000}/>
    <Field label="참고 링크" name="source" value={item.source} onChange={change('source')} type="url" placeholder="https://"/>
    <Field label="제작 메모" name="notes" value={item.notes} onChange={change('notes')} rows={2} placeholder="톤, 화면 비율, 자막 스타일 등"/>
    </div><aside className="form-side"><h3>출연 캐릭터</h3><p className="small muted">이 콘텐츠에 사용할 시트를 선택하세요.</p><div className="cast-picker">{cast.length?cast.map(c=><label key={c.id} className="cast-option"><input type="checkbox" name="characterIds" value={c.id} checked={item.characterIds.includes(c.id)} onChange={e=>change('characterIds')(e.target.checked?[...item.characterIds,c.id]:item.characterIds.filter(id=>id!==c.id))}/>{c.image?<img src={c.image} alt=""/>:<span className="avatar">{c.name[0]}</span>}<span>{c.name}<small>{c.tags}</small></span></label>):<div className="small-empty"><Icon name="people"/>아직 등록한 캐릭터가 없어요.<br/>캐릭터 시트 메뉴에서 먼저 등록해주세요.</div>}</div><div className="form-tip"><Icon name="folder"/>기획과 캐릭터 시트가 한 묶음으로 저장됩니다.</div></aside></div><FormFooter existing={existing} busy={busy} error={error} onArchive={()=>submit(null,!existing.archived)}/></form>;
}
export function ProductionBrief({item}) {
  const {workspace,closeModal,toast}=useStudio(),router=useRouter(),textarea=useRef();
  const cast=item.characterIds.map(id=>workspace.characters.find(c=>c.id===id)).filter(Boolean);
  const content=[`제목: ${item.title}`,`형식: ${FORMATS[item.format].label}`,'','이야기 / 대본',item.story||'(작성 전)','','등장 캐릭터',...cast.map(c=>`${c.name}: ${c.description}\n태그: ${c.tags}`),'','제작 메모',item.notes||'',item.source?`참고: ${item.source}`:''].join('\n');
  async function copy(){try{await navigator.clipboard.writeText(content);toast('제작 지시서를 복사했습니다.');}catch{textarea.current?.select();toast('텍스트를 선택했습니다. 복사해주세요.');}}
  function openStudio(){sessionStorage.setItem('snowlink.pending-production',JSON.stringify({story:item.story,characters:cast}));closeModal();router.push('/ima2/create');}
  return <><p className="subtitle">제작으로 이동하면 원고와 캐릭터 시트를 불러옵니다. 기획과 시트는 따로 내려받을 수도 있습니다.</p><textarea ref={textarea} className="brief-text" rows={15} readOnly aria-label="제작 지시서 내용" value={content}/><div className="brief-assets">{cast.filter(c=>c.image).map(c=><a key={c.id} href={c.image} download={`${c.name}-sheet`}><Icon name="download"/>{c.name} 시트</a>)}</div><div className="form-footer"><button className="quiet-button" id="download-brief" onClick={()=>download(`${item.title}-기획.txt`,content)}><Icon name="download"/> TXT 저장</button><div><button className="secondary" id="copy-brief" onClick={copy}><Icon name="copy"/> 복사</button>{' '}<button className="primary" id="open-brief-studio" onClick={openStudio}>제작으로 이동 <Icon name="arrow"/></button></div></div></>;
}
