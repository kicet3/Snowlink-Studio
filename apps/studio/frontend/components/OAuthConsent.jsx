'use client';
import { useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';
import Link from 'next/link';
import { api } from '../lib/api';
import { Button, Field } from './Primitives';
export function OAuthConsent() {
  const id = usePathname().split('/')[2], [request,setRequest]=useState(null), [error,setError]=useState(''), [busy,setBusy]=useState(false);
  useEffect(()=>{ let live=true; setRequest(null); setError(''); if(!/^[A-Za-z0-9_-]{43}$/.test(id||'')){setError('인증 요청이 올바르지 않습니다. MCP 클라이언트에서 다시 로그인해주세요.');return;}
    api(`/api/oauth/requests/${id}`).then(data=>{if(live)setRequest(data);}).catch(e=>{if(live)setError(e.message);}); return()=>{live=false;}; },[id]);
  async function approve(value){setBusy(true);try{const result=await api(`/api/oauth/requests/${id}`,'POST',{approve:value});location.assign(result.redirect);}catch(e){setError(e.message);setBusy(false);}}
  return <div className="studio-page"><section className="surface-card oauth-consent">{request?<><p className="eyebrow">CONNECT YOUR WORKSPACE</p><h1>MCP 연결을 승인할까요?</h1><p><strong>{request.clientName}</strong>이 <strong>{request.username}</strong>님의 작업실에 접근하려고 합니다.</p><ul><li>내 캐릭터·시나리오·노드와 생성 결과 조회</li><li>템플릿·플롯·원고·이야기 기억 작성 및 수정</li><li>요청한 이미지·영상 생성 실행 · 모델 사용 비용이 발생할 수 있습니다</li></ul><p className="small muted">클라이언트 이름은 연결 앱에서 제공한 표시 이름입니다. 직접 시작한 연결인지 확인해주세요.</p><Field label="승인 결과를 보낼 주소" value={request.redirectUri} readOnly/><p role="alert" className="auth-error">{error}</p><div className="story-actions"><Button disabled={busy} onClick={()=>approve(true)}>내 작업실 접근 허용</Button><Button variant="secondary" disabled={busy} onClick={()=>approve(false)}>취소</Button></div><p className="small muted">다른 회원의 작업에는 접근할 수 없습니다. 설정에서 언제든 연결을 해제할 수 있습니다.</p></>:error?<><h2>연결을 완료하지 못했습니다</h2><p>{error}</p><Link className="button secondary" href="/settings">설정으로 돌아가기</Link></>:<p>연결 요청을 확인하고 있습니다…</p>}</section></div>;
}
