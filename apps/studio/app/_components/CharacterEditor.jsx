'use client';

import { useState } from 'react';
import { useStudio } from './StudioProvider';
import { Button,Field } from './Primitives';
import { Icon } from './Icon';
import { FormFooter } from './ProductionEditor';
import { CharacterStudio } from './CharacterStudio';
import { api,imageData } from '../_lib/api';

export function CharacterEditor({existing,draft={}}) {
  const {save,closeModal,openModal,toast}=useStudio();
  const [item,setItem]=useState(existing||draft),[dataUrl,setDataUrl]=useState(''),[busy,setBusy]=useState(false),[error,setError]=useState('');
  const change=key=>value=>setItem(previous=>({...previous,[key]:value}));
  async function uploaded(){return dataUrl?{...item,image:(await api('/api/media','POST',{data:dataUrl})).image,sheet:undefined}:item;}
  async function submit(event,archive){event?.preventDefault();setBusy(true);setError('');try{const values=await uploaded();await save('characters',{...values,...(archive===undefined?{}:{archived:archive})},existing);closeModal();toast('저장했습니다.');}catch(err){setError(err.message);}finally{setBusy(false);}}
  async function create(){setBusy(true);try{const values=await uploaded();openModal('AI와 캐릭터 시트 만들기',<CharacterStudio existing={existing} draft={values}/>,true);}catch(err){setError(err.message);}finally{setBusy(false);}}
  return <form className="editor-form" onSubmit={submit}><Button variant="secondary" icon="spark" disabled={busy} onClick={create}>AI와 대화해 시트 만들기</Button><Field label="캐릭터 이름" name="name" value={item.name} onChange={change('name')} placeholder="예: 소심한 고양이 모모" required maxLength={100}/><label className="upload-label">시트 이미지 <span className="small muted">PNG · JPG · WebP / 6MB 이하</span><div className="upload-preview" id="upload-preview">{dataUrl||item.image?<img src={dataUrl||item.image} alt={dataUrl?'선택한 캐릭터 시트':'현재 캐릭터 시트'}/>:<><Icon name="image"/><span>사용할 캐릭터 시트를 선택하세요</span></>}</div><input name="sheet" type="file" accept="image/png,image/jpeg,image/webp" onChange={async e=>{const file=e.target.files[0];if(!file)return;try{setDataUrl(await imageData(file));}catch(err){toast(err.message);e.target.value='';}}}/></label><Field label="캐릭터 설정" name="description" value={item.description} onChange={change('description')} rows={4} placeholder="외형, 의상, 성격과 유지해야 할 특징을 적어주세요." maxLength={10000}/><Field label="태그" name="tags" value={item.tags} onChange={change('tags')} placeholder="고양이, 직장인, 소심함 (쉼표로 구분)" maxLength={300}/><FormFooter existing={existing} busy={busy} error={error} onArchive={()=>submit(null,!existing.archived)}/></form>;
}
