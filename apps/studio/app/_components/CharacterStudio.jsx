'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { api, imageData } from '../_lib/api';
import { assetUrl } from '../_lib/media-data';
import { characterSheetRequest, LAYOUTS, PURPOSES } from '../_lib/character-data';
import { cancelJob, initializeJobs, jobs, reconcileJobs, submitJob } from '../_lib/media-jobs';
import { useStudio } from './StudioProvider';
import { Button, Field } from './Primitives';
import { Icon } from './Icon';
import { CharacterEditor } from './CharacterEditor';

const options = values => values.map(value => ({ value, label: value }));
const fresh = item => ({ version:1, mode:item.image?'photo':'', templateId:item.sheet?.templateId||'identity-sheet',
  referenceImage:item.image||'', settings:{type:'',age:'',style:'',outfit:item.image?'사진 그대로':'',purpose:PURPOSES[0],layout:LAYOUTS[0]},
  profile:{name:item.name||'',description:item.description||'',tags:item.tags||''},messages:[],message:'',prepared:null,result:null,generation:null });

export function CharacterStudio({existing,draft:incoming}) {
  const item = incoming || existing || {}, storageKey = 'snowfall-studio.character-draft.v1.' + (existing?.id || 'new');
  const {save,toast,openModal,closeModal}=useStudio();
  const [draft,setDraft]=useState(()=>({...fresh(item),sourceUpdatedAt:existing?.updatedAt}));
  const draftRef=useRef(draft),live=useRef(true),importing=useRef(false),chatLog=useRef(),messageInput=useRef();
  const [templates,setTemplates]=useState([]),[modelSettings,setModelSettings]=useState(null),[loading,setLoading]=useState(true),[reload,setReload]=useState(0);
  const [busy,setBusy]=useState(false),[error,setError]=useState(''),[editor,setEditor]=useState(null),[confirmDelete,setConfirmDelete]=useState(false),[,jobRevision]=useState(0);
  const persist=useCallback(next=>{draftRef.current=next;setDraft(next);try{localStorage.setItem(storageKey,JSON.stringify(next));}catch{toast('브라우저 임시 저장 공간이 부족합니다. 창을 닫기 전에 캐릭터를 저장해주세요.');}},[storageKey,toast]);
  const patch=updates=>persist({...draftRef.current,...updates});
  const selected=templates.find(t=>t.id===draft.templateId);
  const job=draft.generation&&jobs.get(draft.generation.id);
  const pending=!!draft.generation&&!draft.result&&!['error','canceled'].includes(job?.status);
  const locked=busy||pending;

  useEffect(()=>{
    live.current=true;let cancelled=false;
    const explicit=existing?['name','description','tags','image'].some(k=>item[k]!==existing[k]):Object.keys(item).length>0;
    if(!explicit){try{const stored=JSON.parse(localStorage.getItem(storageKey));if(stored?.version===1&&stored.sourceUpdatedAt===existing?.updatedAt&&Array.isArray(stored.messages)&&stored.settings&&stored.profile){draftRef.current=stored;setDraft(stored);}}catch{}}
    setLoading(true);setError('');
    void Promise.allSettled([api('/api/character-templates'),api('/api/ai/settings')]).then(async results=>{
      if(cancelled)return;if(results[0].status==='rejected')throw results[0].reason;
      const entries=results[0].value.templates;setTemplates(entries);
      if(results[1].status==='fulfilled')setModelSettings(results[1].value);
      if(!entries.some(t=>t.id===draftRef.current.templateId))persist({...draftRef.current,templateId:entries[0].id,prepared:null});
      initializeJobs();await reconcileJobs();if(!cancelled)jobRevision(n=>n+1);
    }).catch(err=>{if(!cancelled)setError(err.message);}).finally(()=>{if(!cancelled)setLoading(false);});
    return()=>{cancelled=true;live.current=false;};
  },[storageKey,reload]);
  useEffect(()=>{const changed=()=>jobRevision(n=>n+1);document.addEventListener('media-jobs-updated',changed);return()=>document.removeEventListener('media-jobs-updated',changed);},[]);
  useEffect(()=>{if(chatLog.current)chatLog.current.scrollTop=chatLog.current.scrollHeight;},[draft.messages,busy]);
  useEffect(()=>{
    if(!draft.generation||draft.result||job?.status!=='done'||importing.current)return;
    const generation=draft.generation,asset=job.assets.find(a=>a.mediaType==='image');
    if(!asset){setError('생성된 이미지가 없습니다. 이미지 · 영상 제작의 생성 기록을 확인해주세요.');return;}
    importing.current=true;
    void (async()=>{const response=await fetch(assetUrl(asset.filename),{signal:AbortSignal.timeout(30000)});if(!response.ok)throw new Error('시트 이미지를 가져오지 못했습니다. 결과 확인으로 다시 시도해주세요.');const data=await imageData(await response.blob());const {image}=await api('/api/media','POST',{data});if(live.current&&draftRef.current.generation?.id===generation.id)persist({...draftRef.current,result:{...generation,image}});})().catch(err=>{if(live.current)setError(err.message);}).finally(()=>{importing.current=false;});
  },[draft.generation,draft.result,job,persist]);

  async function work(operation){if(locked)return;setBusy(true);setError('');try{await operation();}catch(err){if(live.current)setError(err.message);}finally{if(live.current)setBusy(false);}}
  async function chat(event){event.preventDefault();await work(async()=>{
    const current=draftRef.current,message=current.message.trim()||'선택한 설정을 바탕으로 캐릭터를 제안하고 시트 생성을 준비해주세요.';
    if(current.mode==='new'&&!current.settings.type.trim()&&!current.message.trim()&&!current.profile.description)throw new Error('캐릭터 유형이나 만들고 싶은 캐릭터를 한 줄로 알려주세요.');
    const result=await api('/api/character-studio/chat','POST',{mode:current.mode,templateId:current.templateId,settings:current.settings,referenceImage:current.referenceImage,profile:current.profile,message,messages:current.messages.slice(-12)});
    if(live.current)persist({...current,messages:[...current.messages,{role:'user',content:message},{role:'assistant',content:result.reply}].slice(-40),profile:result.profile,prepared:result,message:''});
  });}
  async function generate(){await work(async()=>{
    const current=draftRef.current,references=[];
    if(current.mode==='photo'){const response=await fetch(current.referenceImage,{signal:AbortSignal.timeout(20000)});if(!response.ok)throw new Error('참고 사진을 불러오지 못했습니다. 다시 첨부해주세요.');references.push(await imageData(await response.blob()));}
    const settings=await api('/api/ai/settings');if(!live.current)return;setModelSettings(settings);
    const id=crypto.randomUUID(),request=characterSheetRequest(current.prepared,settings.roles.image,references,id);
    const generation={id,profile:structuredClone(current.profile),prompt:current.prepared.sheetPrompt,templateId:selected.id,templateName:selected.name};
    persist({...current,generation,result:null});
    try{await submitJob(request,'image',request.body.prompt);}catch(err){if(live.current)persist({...draftRef.current,generation:null});throw err;}
    if(live.current)jobRevision(n=>n+1);
  });}
  async function saveTemplate(){await work(async()=>{const saved=await api('/api/character-templates'+(editor.id?'/'+editor.id:''),editor.id?'PUT':'POST',editor);const entries=await api('/api/character-templates');if(!live.current)return;setTemplates(entries.templates);setEditor(null);patch({templateId:saved.id,prepared:null});toast('템플릿을 저장했습니다.');});}
  async function deleteTemplate(){if(!confirmDelete){setConfirmDelete(true);return;}await work(async()=>{await api('/api/character-templates/'+editor.id,'DELETE',{updatedAt:editor.updatedAt});const entries=(await api('/api/character-templates')).templates;if(!live.current)return;setTemplates(entries);setEditor(null);patch({templateId:entries[0].id,prepared:null});});}
  async function register(){await work(async()=>{const result=draftRef.current.result;await save('characters',{...result.profile,image:result.image,sheet:{templateId:result.templateId,templateName:result.templateName,prompt:result.prompt}},existing);try{localStorage.removeItem(storageKey);}catch{}closeModal();toast('캐릭터와 시트를 저장했습니다. 제작 화면에서 참조로 사용할 수 있어요.');});}
  function setSetting(name,value){patch({settings:{...draftRef.current.settings,[name]:value},prepared:null});}
  const act=(label,handler,variant='secondary',props={})=><Button variant={variant} disabled={locked} onClick={handler} {...props}>{label}</Button>;
  const manual=()=>openModal(existing?'캐릭터 설정 수정':'나만의 캐릭터 등록',<CharacterEditor existing={existing} draft={item}/>);
  if(loading)return <div className="character-studio"><p role="status">템플릿을 불러오고 있어요…</p></div>;
  if(!templates.length)return <div className="character-studio"><p className="notice" role="alert">{error}</p><Button onClick={()=>setReload(n=>n+1)}>다시 불러오기</Button></div>;
  if(!draft.mode)return <div className="character-studio"><p className="subtitle">어떤 방식으로 캐릭터 시트를 만들까요?</p><div className="character-choices">{[['photo','image','1. 사진을 첨부해 만들기','참고할 인물·캐릭터 사진에서 외형을 정리해요.'],['new','spark','2. 새로운 캐릭터 만들기','몇 가지 유형을 고르면 AI가 세부 설정을 채워요.']].map(([mode,icon,title,description])=><button key={mode} className="surface-card character-choice" onClick={()=>patch({mode,settings:{...draft.settings,outfit:mode==='photo'&&!draft.settings.outfit?'사진 그대로':draft.settings.outfit},prepared:null})}><Icon name={icon}/><strong>{title}</strong><span>{description}</span></button>)}</div><div className="form-footer"><span className="small muted">완성된 시트 이미지가 있다면</span>{act('직접 등록하기',manual,'quiet-button')}</div></div>;
  return <div className="character-studio"><div className="character-progress"><span>01 설정 선택</span><span>02 AI와 대화 · 확인</span><span>03 시트 생성 · 등록</span></div><div className="character-studio-grid"><aside className="character-config editor-form"><div className="character-section-heading"><h3>{draft.mode==='photo'?'사진에서 시작':'새 캐릭터 설정'}</h3>{act('방식 변경',()=>patch({mode:'',prepared:null}),'quiet-button')}</div><Field label="시트 프롬프트 템플릿" name="template" value={draft.templateId} disabled={locked} onChange={templateId=>patch({templateId,prepared:null})} options={templates.map(t=>({value:t.id,label:`${t.builtin?'기본':'내 템플릿'} · ${t.name}`}))}/><p className="small muted">{selected?.description||'직접 저장한 프롬프트를 사용합니다.'}</p><div className="character-actions">{act('템플릿 추가',()=>{setEditor({name:'',description:'',prompt:''});setConfirmDelete(false);},'quiet-button')}{act(selected?.builtin?'복사해서 수정':'템플릿 수정',()=>{setEditor(selected.builtin?{name:selected.name+' (내 버전)',description:selected.description,prompt:selected.prompt}:{...selected});setConfirmDelete(false);},'quiet-button')}</div><details className="character-template-preview"><summary>선택한 프롬프트 보기</summary><pre>{selected?.prompt}</pre></details>
    {draft.mode==='photo'?<><label className="upload-label">참고할 인물·캐릭터 사진<span className="small muted">PNG · JPG · WebP / 6MB 이하</span><div className="upload-preview">{draft.referenceImage?<img src={draft.referenceImage} alt="캐릭터 참고 사진"/>:<><Icon name="image"/><span>얼굴과 의상이 잘 보이는 사진을 선택하세요</span></>}</div><input disabled={locked} type="file" name="reference" accept="image/png,image/jpeg,image/webp" onChange={e=>{const file=e.target.files[0];if(file)void work(async()=>{const data=await imageData(file);const result=await api('/api/media','POST',{data});if(live.current)patch({referenceImage:result.image,prepared:null});});}}/></label><Field label="의상" name="outfit" disabled={locked} value={draft.settings.outfit} onChange={value=>setSetting('outfit',value)} options={options(['사진 그대로','비슷한 분위기로 정리','다른 의상으로 변경'])}/></>:<>{[['type','1. 캐릭터 유형','예: 소심한 고양이 직장인'],['age','2. 연령과 인상','예: 20대, 차분하고 따뜻한 인상'],['style','3. 전체 스타일','예: 실사, 애니메이션, 3D'],['outfit','4. 기본 의상','예: 크림색 니트와 남색 바지']].map(([name,label,placeholder])=><Field key={name} label={label} name={name} value={draft.settings[name]} onChange={value=>setSetting(name,value)} placeholder={placeholder} maxLength={1000} disabled={locked}/>)}</>}
    <Field label={draft.mode==='photo'?'주요 사용 목적':'5. 주요 사용 목적'} name="purpose" value={draft.settings.purpose} onChange={value=>setSetting('purpose',value)} options={options(PURPOSES)} disabled={locked}/>{draft.mode==='photo'&&selected?.id==='identity-sheet'&&<Field label="시트 구성" name="layout" value={draft.settings.layout} onChange={value=>setSetting('layout',value)} options={options(LAYOUTS)} disabled={locked}/>}{draft.mode==='new'&&<p className="small muted">비워 둔 항목과 얼굴·헤어·체형의 세부는 AI가 조화롭게 제안합니다.</p>}</aside>
    <section className="character-conversation" aria-label="AI와 캐릭터 대화"><div><h3>대화로 다듬는 캐릭터</h3><p className="small muted">설정을 정리하고, 원하는 부분을 말로 수정하세요.</p></div><div ref={chatLog} className="character-chat" role="log" aria-label="캐릭터 대화" aria-live="polite">{draft.messages.length?draft.messages.map((m,i)=><div key={i} className="character-message" data-role={m.role==='user'?'user':'assistant'}><strong>{m.role==='user'?'나':'AI'}</strong><p>{m.content}</p></div>):<div className="character-message"><strong>AI</strong><p>{draft.mode==='photo'?'사진을 첨부하면 보이는 외형을 분석해 시트를 준비할게요. 변경하고 싶은 의상이나 특징이 있다면 함께 알려주세요.':'왼쪽의 다섯 가지 항목을 입력하거나, 아래에서 만들고 싶은 캐릭터를 자유롭게 설명해주세요.'}</p></div>}</div><form className="character-chat-form editor-form" onSubmit={chat}><label className="field"><span>AI에게 요청하기</span><textarea ref={messageInput} name="message" rows={3} maxLength={4000} value={draft.message} disabled={locked} placeholder={draft.messages.length?'예: 머리색은 유지하고 의상만 회색 후드로 바꿔줘':'예: 입력한 설정으로 추천해줘. 이름과 성격도 정해줘.'} onChange={e=>patch({message:e.target.value})}/></label><div className="character-actions"><Button type="submit" disabled={locked||(draft.mode==='photo'&&!draft.referenceImage)}>{draft.messages.length?'수정 요청 보내기':'AI와 설정 정리'}</Button><span className="small muted">{busy?'AI가 설정을 정리하고 있어요…':''}</span></div></form><p className="form-error" role="alert" hidden={!error}>{error}</p><div data-character-result>
    {draft.prepared&&<section className="character-summary"><h3>{draft.prepared.profile.name||'캐릭터 설정'}</h3><p>{draft.prepared.profile.description}</p>{draft.prepared.ready?<><strong>이 설정으로 캐릭터 시트를 직접 생성할까요?</strong><div className="character-actions">{act('네, 바로 생성해 주세요',generate,'primary')}{act('일부 설정을 수정할게요',()=>messageInput.current?.focus(),'quiet-button')}</div></>:<p className="small muted">대화에서 필요한 내용을 알려주세요.</p>}</section>}
    {draft.generation&&!draft.result&&<div className="notice character-generation" role="status"><strong>{job?.message||'요청 기록을 찾지 못했습니다. 결과 확인으로 서버 상태를 확인해주세요.'}</strong><p className="small muted">생성 중에는 창을 닫아도 됩니다. 다시 열면 결과를 이어서 확인합니다.</p><div className="character-actions"><button className="secondary" onClick={()=>void reconcileJobs().then(()=>jobRevision(n=>n+1))}>결과 확인</button>{job&&!['done','error','canceled'].includes(job.status)&&<button className="quiet-button" onClick={()=>void cancelJob(draft.generation.id).catch(err=>setError(err.message))}>생성 취소</button>}{['error','canceled'].includes(job?.status)&&act('다시 생성 준비',()=>patch({generation:null}),'quiet-button')}{(!job||job.status==='checking')&&<><button className="quiet-button" onClick={()=>patch({generation:null})}>이 요청 추적 종료</button><span className="small muted">이미지 · 영상 제작의 기록을 먼저 확인하세요. 진행 중인 생성은 계속됩니다.</span></>}</div></div>}
    {draft.result&&<section className="character-sheet-result"><h3>완성된 캐릭터 시트</h3><a href={draft.result.image} target="_blank" rel="noopener"><img src={draft.result.image} alt={`${draft.result.profile.name} 캐릭터 시트`}/></a><p className="small muted">{draft.result.templateName} · {draft.result.profile.name}{draft.prepared?.sheetPrompt!==draft.result.prompt?' · 이전 생성 결과':''}</p><div className="character-actions">{act(existing?'이 시트로 캐릭터 수정':'이 시트로 캐릭터 등록',register,'primary')}<a className="secondary button" href={draft.result.image} download={`${draft.result.profile.name}-sheet`}>시트 다운로드</a></div></section>}</div><p className="character-models small muted">{modelSettings?`대화: ${modelSettings.roles.chat.model} · 시트: ${modelSettings.roles.image.model}`:'설정된 대화·이미지 모델을 사용합니다.'} · <Link href="/settings" onClick={closeModal}>AI 모델 설정</Link></p></section></div>
    {editor&&<section className="character-template-editor editor-form" aria-label="템플릿 편집"><h3>{editor.id?'내 템플릿 수정':'프롬프트 템플릿 추가'}</h3>{[['name','템플릿 이름',100],['description','간단한 설명',500],['prompt','직접 작성한 프롬프트',20000]].map(([name,label,max])=><Field key={name} label={label} name={'template'+name} value={editor[name]} onChange={value=>setEditor(previous=>({...previous,[name]:value}))} rows={name==='prompt'?9:undefined} maxLength={max} required={name!=='description'} disabled={locked} placeholder={name==='prompt'?'시트 구성, 그림 스타일, 이미지 속 언어, 유지할 특징 등 원하는 생성 지침을 붙여 넣으세요.':undefined}/>)}<p className="small muted">캐릭터 설정과 참고 사진은 대화에서 함께 전달됩니다. 템플릿은 이 작업실에 저장되어 다시 사용할 수 있어요.</p><div className="character-actions">{act('템플릿 저장',saveTemplate,'primary')}{act('편집 닫기',()=>setEditor(null),'quiet-button')}{editor.id&&act(confirmDelete?'삭제 확인':'템플릿 삭제',deleteTemplate,'quiet-button')}</div></section>}
    <div className="form-footer"><span className="small muted">진행 내용은 이 브라우저에 임시 저장됩니다.</span>{act('처음부터',()=>{persist({...fresh(item),sourceUpdatedAt:existing?.updatedAt});setEditor(null);},'quiet-button')}</div></div>;
}
