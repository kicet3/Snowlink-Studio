'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { api } from '../_lib/api';
import { Badge, Button, Field, PageHeading } from './Primitives';
import { useStudio } from './StudioProvider';
const MODEL_LABELS={planning:['기획 · 트렌드 분석','원고와 트렌드 분석에 사용할 모델'],chat:['대화 · 캐릭터 · 컷 편집','캐릭터 설정과 장면 수정에 사용할 모델'],image:['이미지 · 캐릭터 시트','캐릭터 시트와 장면 이미지에 사용할 모델'],video:['영상 생성','장면을 영상으로 만드는 모델']};
export function Settings(){
 const [status,setStatus]=useState(null),[error,setError]=useState(''),[version,setVersion]=useState(0);
 useEffect(()=>{let live=true;api('/api/ai/status').then(value=>{if(live){setStatus(value);setError('');}}).catch(err=>{if(live)setError(err.message);});return()=>{live=false;};},[version]);
 const ready=status?.providers?.[status.selected]?.ready;
 return <div className="studio-page"><PageHeading eyebrow="ONE CONNECTION, YOUR CREATIVE FLOW" index="SETTINGS / AI" title="AI 연결과 작업별 모델" description="서버에 연결된 AI를 사용해 캐릭터, 이야기와 장면 제작을 이어갑니다." actions={<Button variant="secondary" icon="refresh" onClick={()=>setVersion(v=>v+1)}>상태 새로고침</Button>}/>
 <section className="surface-card settings-card settings-preference"><div className="provider-heading"><div><p className="eyebrow">STUDIO AI</p><h2>AI 서비스 연결</h2></div><Badge tone={ready?'pine':'ochre'}>{status?ready?'사용 가능':'연결 확인 필요':'확인 중'}</Badge></div><p role="status">{error||(ready?'별도의 제공업체 로그인 없이 제작 화면에서 바로 사용할 수 있습니다.':'운영자가 AI 서비스 연결을 확인하면 사용할 수 있습니다.')}</p><p className="small muted">현재 대화 모델: {status?.selectedModel||'확인 중'}</p></section>
 <section className="surface-card settings-card settings-preference"><h2>작업별 AI 모델</h2><p className="small muted">내 계정 작업실에서 사용할 모델을 선택하세요.</p><ModelSettings version={version}/></section>
 <section className="surface-card settings-card settings-preference"><h2>계정과 외부 연결</h2><div className="story-actions"><Link className="button secondary" href="/profile">내 프로필</Link><Link className="button secondary" href="/mcp">MCP 연결 방법 보기</Link></div></section></div>;
}
function ModelSettings({version}){
 const {toast}=useStudio(),[settings,setSettings]=useState(null),[error,setError]=useState(''),[busy,setBusy]=useState(false);
 useEffect(()=>{api('/api/ai/settings').then(setSettings).catch(e=>setError(e.message));},[version]);
 function change(role,key,value){setSettings(s=>{const selected={...s.roles[role],[key]:value};if(key==='provider')selected.model=s.catalog[role][value][0]?.id;return {...s,roles:{...s.roles,[role]:selected}};});}
 async function save(e,role){e.preventDefault();setBusy(true);try{setSettings(await api('/api/ai/settings','PUT',{role,value:settings.roles[role],revision:settings.revision}));toast(`${MODEL_LABELS[role][0]} 모델을 저장했습니다.`);document.dispatchEvent(new Event('ai-settings-updated'));}catch(e){toast(e.message);}finally{setBusy(false);}}
 return <div id="model-settings" aria-live="polite">{settings?Object.entries(MODEL_LABELS).map(([role,[title,description]])=>{const selected=settings.roles[role],options=settings.catalog[role][selected.provider].map(m=>({value:m.id,label:m.label||m.id}));if(selected.model&&!options.some(o=>o.value===selected.model))options.unshift({value:selected.model,label:`${selected.model} (현재 목록에서 확인되지 않음)`});return <form key={role} className="model-role" onSubmit={e=>save(e,role)}><div><h3>{title}</h3><p className="small muted">{description}</p></div><Field label={role==='image'&&selected.provider==='gpt'?'이미지 기획 모델':'사용할 모델'} name="model" value={selected.model} disabled={busy} onChange={v=>change(role,'model',v)} options={options}/><Button type="submit" variant="secondary" disabled={busy}>저장</Button></form>;}):error||'모델 목록을 불러오고 있습니다…'}</div>;
}
