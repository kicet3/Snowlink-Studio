'use client';

import { useState } from 'react';
import { api } from '../_lib/api';
import { useStudio } from './StudioProvider';

export function Login() {
  const { authenticate } = useStudio();
  const [register, setRegister] = useState(false), [error, setError] = useState(''), [busy, setBusy] = useState(false);
  async function submit(event) {
    event.preventDefault(); const values = Object.fromEntries(new FormData(event.currentTarget));
    if (register && values.password !== values.confirm) { setError('비밀번호 확인이 일치하지 않습니다.'); return; }
    setBusy(true); setError('');
    try {
      const result = await api(`/api/auth/${register ? 'register' : 'login'}`, 'POST', { username: values.username, password: values.password, ...(register ? { name: values.name } : {}) });
      await authenticate(result.user);
    } catch (err) { setError(err.message); }
    finally { setBusy(false); }
  }
  return <div className="auth-screen"><div className="auth-intro"><a className="brand" href="/"><img src="/logo.svg" alt=""/><span>snowlink-studio</span></a><p className="eyebrow">A PLACE FOR YOUR STORIES</p><h1>작은 영감에서,<br/>당신의 이야기까지.</h1><p>캐릭터를 만들고, 이야기를 이어 쓰고,<br/>한 편의 영상으로 완성하는 나의 작업실.</p><div className="auth-features"><span>캐릭터 시트</span><span>시나리오 · 이야기 기억</span><span>애니메이션 · 실사 영화</span></div>{process.env.NEXT_PUBLIC_COMPANY_SITE_URL && <p className="small"><a href={process.env.NEXT_PUBLIC_COMPANY_SITE_URL}>스노우링크 소개 ↗</a></p>}</div><section className="auth-card surface-card"><p className="eyebrow">YOUR CREATIVE SPACE</p><h2>{register ? '나의 작업실 만들기' : '다시 만나 반가워요'}</h2><p className="muted">{register ? '계정을 만들면 나만의 캐릭터와 시나리오를 저장할 수 있어요.' : '계정으로 로그인하고 만들던 이야기를 이어가세요.'}</p><form key={String(register)} onSubmit={submit}><label className="field"><span>아이디</span><input name="username" required minLength={3} maxLength={80} autoComplete="username" placeholder="영문·숫자 또는 이메일 형식"/></label>{register && <label className="field"><span>이름</span><input name="name" required maxLength={80} autoComplete="nickname" placeholder="작업실에서 사용할 이름"/></label>}<label className="field"><span>비밀번호</span><input name="password" type="password" required minLength={10} maxLength={128} autoComplete={register ? 'new-password' : 'current-password'} placeholder="10자 이상 입력해주세요"/></label>{register && <label className="field"><span>비밀번호 확인</span><input name="confirm" type="password" required minLength={10} maxLength={128} autoComplete="new-password"/></label>}<p className="auth-error" role="alert">{error}</p><button disabled={busy} type="submit" className="button primary">{register ? '회원가입' : '로그인'}</button></form><p className="auth-switch">{register ? '이미 계정이 있나요?' : '처음 방문하셨나요?'} <button disabled={busy} type="button" className="text-button" onClick={() => { setRegister(!register); setError(''); }}>{register ? '로그인' : '회원가입'}</button></p></section></div>;
}
