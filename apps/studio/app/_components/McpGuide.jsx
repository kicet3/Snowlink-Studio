'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { api } from '../_lib/api';
import { useStudio } from './StudioProvider';
import { Button, Field, PageHeading } from './Primitives';

const ENDPOINT = 'https://api.snowlink.team/mcp';
export function McpGuide() {
  const { user, toast } = useStudio();
  const signedIn = !!user && user.role !== 'guest';
  const [grants, setGrants] = useState([]), [error, setError] = useState(''), [busy, setBusy] = useState('');
  async function refresh() { try { setGrants((await api('/api/oauth/grants')).grants); setError(''); } catch (err) { setError(err.message); } }
  useEffect(() => { setGrants([]); if (signedIn) void refresh(); }, [signedIn, user?.id]);
  async function copy(text) { try { await navigator.clipboard.writeText(text); toast('복사했습니다.'); } catch { toast('아래 명령을 직접 선택해 복사해주세요.'); } }
  async function revoke(id) { setBusy(id); try { await api('/api/oauth/grants/revoke', 'POST', { id }); await refresh(); toast('연결을 해제했습니다.'); } catch (err) { setError(err.message); } finally { setBusy(''); } }
  const codex = `codex mcp add snowlink-studio --url ${ENDPOINT}\ncodex mcp login snowlink-studio`;
  const claude = `claude mcp add --transport http snowlink-studio ${ENDPOINT}`;
  return <div className="studio-page mcp-guide">
    <PageHeading eyebrow="YOUR WORKSPACE, IN CONVERSATION" index="MCP / CONNECT" title="대화에서 작업실로" description="Claude Code·Codex에서 캐릭터, 시나리오와 장면 노드를 만들고 웹에서 이어서 편집하세요."/>
    <nav className="guide-breadcrumb" aria-label="현재 위치"><Link href="/">네티움 스튜디오</Link><span aria-hidden="true">/</span><span aria-current="page">MCP 연결 안내</span></nav>
    <section className="surface-card settings-card settings-preference"><h2>MCP 사용 인증</h2><p>제작 페이지와 이 안내는 로그인 없이 열립니다. 설정·프로필은 로그인이 필요합니다. MCP 연결은 내 계정의 작업을 읽고 수정하므로, 계정 로그인 후 연결 승인이 필요합니다.</p>{signedIn ? <p className="notice">{user.name || user.username} 계정으로 로그인되어 있습니다. 아래 방법으로 MCP를 추가한 뒤 연결 앱에서 인증을 시작하세요.</p> : <Link className="button primary" href="/login?next=%2Fmcp">MCP 사용을 위해 로그인</Link>}<p className="small muted">방문자 작업실과 계정 작업실은 별도입니다. MCP에서는 로그인한 계정의 자료를 사용합니다. AI 제공업체의 연결 정보는 서버에서 관리하며 MCP에 입력하지 않습니다.</p><Field label="MCP 서버 주소" value={ENDPOINT} readOnly/><Button variant="secondary" icon="copy" onClick={() => copy(ENDPOINT)}>서버 주소 복사</Button></section>
    <div className="settings-grid">
      <section className="surface-card settings-card"><p className="eyebrow">01 / CODEX</p><h2>Codex 연결</h2><p>터미널에서 서버를 추가하고 OAuth 인증을 시작합니다.</p><pre className="mcp-command"><code>{codex}</code></pre><Button variant="secondary" onClick={() => copy(codex)}>Codex 명령 복사</Button><p>열린 브라우저에서 Studio 계정으로 로그인하고 요청한 앱과 콜백 주소를 확인한 뒤 접근을 승인하세요.</p><a href="https://learn.chatgpt.com/docs/extend/mcp" target="_blank" rel="noopener noreferrer">Codex 공식 MCP 안내 ↗</a></section>
      <section className="surface-card settings-card"><p className="eyebrow">02 / CLAUDE CODE</p><h2>Claude Code 연결</h2><p>터미널에서 서버를 추가합니다.</p><pre className="mcp-command"><code>{claude}</code></pre><Button variant="secondary" onClick={() => copy(claude)}>Claude Code 명령 복사</Button><p>Claude Code에서 <code>/mcp</code>를 열고 <code>snowlink-studio</code>의 인증을 진행합니다. 브라우저에서 로그인 후 접근을 승인하세요.</p><a href="https://code.claude.com/docs/en/mcp" target="_blank" rel="noopener noreferrer">Claude Code 공식 MCP 안내 ↗</a></section>
    </div>
    <section className="surface-card settings-card settings-preference"><h2>연결 후 이렇게 요청해 보세요</h2><ul><li>“내 작업실의 캐릭터와 시나리오 목록을 보여줘.”</li><li>“3화 분량의 전체 플롯을 만들고, 각 화의 플롯을 순서대로 작성해줘.”</li><li>“이 원고를 이미지와 영상 장면 노드로 나눠줘.”</li></ul><p>캐릭터 대화·기획·원고 작성과 이미지·영상 생성은 서버에 연결된 AI를 사용합니다. 생성은 요청한 작업에서만 실행됩니다.</p><p className="small muted">인증은 OAuth + PKCE를 사용합니다. 액세스 토큰은 1시간, 갱신 토큰은 최대 30일이며 연결 해제 시 접근을 중단합니다.</p></section>
    <section className="surface-card settings-card settings-preference"><h2>승인한 MCP 연결</h2>{signedIn ? <><p role="alert">{error}</p>{grants.length ? grants.map(grant => <div className="story-job" key={grant.id}><div><strong>{grant.clientName}</strong><p>{new Date(grant.createdAt).toLocaleDateString('ko-KR')} 승인</p></div><Button variant="secondary" disabled={!!busy} onClick={() => revoke(grant.id)}>연결 해제</Button></div>) : <p>승인한 연결이 없습니다.</p>}</> : <p>로그인하면 이 계정의 연결 목록과 접근 해제 기능을 사용할 수 있습니다.</p>}</section>
  </div>;
}
