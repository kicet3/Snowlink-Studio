'use client';
import {useState} from 'react';
import {api} from '../_lib/api';
import {Button} from './Primitives';
import {useStudio} from './StudioProvider';
export function Profile(){
 const {user,toast}=useStudio(),[busy,setBusy]=useState(false);
 async function submit(e){e.preventDefault();const form=e.currentTarget,values=Object.fromEntries(new FormData(form));if(values.password!==values.confirm)return toast('새 비밀번호 확인이 일치하지 않습니다.');setBusy(true);try{await api('/api/auth/password','POST',{currentPassword:values.currentPassword,password:values.password});form.reset();toast('비밀번호를 변경했습니다.');}catch(e){toast(e.message);}finally{setBusy(false);}}
 return <section className="surface-card settings-card settings-preference"><p className="eyebrow">MY ACCOUNT</p><h2>{user.name} · 계정</h2><p className="muted">아이디: {user.username}</p><details><summary>비밀번호 변경</summary><form onSubmit={submit}>{[['currentPassword','현재 비밀번호'],['password','새 비밀번호'],['confirm','새 비밀번호 확인']].map(([name,label])=><label className="field" key={name}><span>{label}</span><input name={name} type="password" autoComplete={name==='currentPassword'?'current-password':'new-password'} minLength={name==='currentPassword'?undefined:10} maxLength={128} required/></label>)}<p className="small muted">변경하면 다른 기기의 로그인 세션이 해제됩니다.</p><Button type="submit" variant="secondary" disabled={busy}>비밀번호 변경</Button></form></details></section>;
}
