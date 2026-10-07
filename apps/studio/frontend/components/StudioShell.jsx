'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import dynamic from 'next/dynamic';
import { StudioProvider, useStudio } from './StudioProvider';
import { Login } from './Login';
import { Button } from './Primitives';
import { Icon } from './Icon';

export const TABS = [
  ['board', '제작 보드', 'board'], ['characters', '캐릭터 시트', 'people'],
  ['scenarios', '시나리오 · 영상 스타일', 'film'], ['trends', '트렌드 탐색', 'radar'],
  ['ima2', '이미지 · 영상 제작', 'spark'], ['shortgpt', 'ShortGPT · 컷 편집', 'film'], ['settings', '설정 · OAuth', 'settings'],
];
const fallback = () => <div className="page-loading">작업실을 불러오고 있어요…</div>;
const Board = dynamic(() => import('./Board').then(m => m.Board), { loading: fallback });
const Characters = dynamic(() => import('./Characters').then(m => m.Characters), { loading: fallback });
const Scenarios = dynamic(() => import('./Scenarios').then(m => m.Scenarios), { loading: fallback });
const Trends = dynamic(() => import('./Trends').then(m => m.Trends), { loading: fallback });
const MediaStudio = dynamic(() => import('./MediaStudio').then(m => m.MediaStudio), { ssr: false, loading: fallback });
const Cuts = dynamic(() => import('./Cuts').then(m => m.Cuts), { loading: fallback });
const Settings = dynamic(() => import('./Settings').then(m => m.Settings), { loading: fallback });
const OAuthConsent = dynamic(() => import('./OAuthConsent').then(m => m.OAuthConsent), { loading: fallback });
const VIEWS = { board: Board, characters: Characters, scenarios: Scenarios, trends: Trends, ima2: MediaStudio,
  shortgpt: Cuts, settings: Settings, oauth: OAuthConsent };

export function StudioShell({ children }) {
  return <StudioProvider><Shell>{children}</Shell></StudioProvider>;
}
function Shell({ children }) {
  const { user, loading, error, loadSession, workspace, connections, logout, openModal } = useStudio();
  const pathname = usePathname(), router = useRouter();
  const requested = pathname.split('/')[1] || 'board';
  const active = requested in VIEWS ? requested : 'board';
  const [visited, setVisited] = useState(['board']), [menuOpen, setMenuOpen] = useState(false), [mobile, setMobile] = useState(false);
  const menuButton = useRef(), sidebar = useRef();
  useEffect(() => { document.body.classList.toggle('auth-locked', !user); return () => document.body.classList.remove('auth-locked'); }, [user]);
  useEffect(() => {
    const mq = matchMedia('(max-width: 760px)'); const update = () => { setMobile(mq.matches); setMenuOpen(false); };
    update(); mq.addEventListener('change', update); return () => mq.removeEventListener('change', update);
  }, []);
  useEffect(() => { document.body.classList.toggle('menu-open', menuOpen); return () => document.body.classList.remove('menu-open'); }, [menuOpen]);
  useEffect(() => { setVisited(previous => previous.includes(active) ? previous : [...previous, active]); setMenuOpen(false);
    document.title = `${TABS.find(t => t[0] === active)?.[1] || 'MCP 연결 승인'} · snowlink-studio`;
  }, [active]);
  useEffect(() => {
    const legacyRoute = () => {
      const hash = location.hash.slice(1), tab = hash.split('/')[0];
      if (tab in VIEWS) router.replace('/' + hash);
    };
    legacyRoute(); window.addEventListener('hashchange', legacyRoute);
    return () => window.removeEventListener('hashchange', legacyRoute);
  }, [router]);
  useEffect(() => {
    const escape = event => { if (event.key === 'Escape' && menuOpen) { setMenuOpen(false); menuButton.current?.focus(); } };
    document.addEventListener('keydown', escape); return () => document.removeEventListener('keydown', escape);
  }, [menuOpen]);
  function toggleMenu() {
    setMenuOpen(!menuOpen);
    if (!menuOpen) requestAnimationFrame(() => sidebar.current?.querySelector('[aria-current="page"]')?.focus());
  }
  function navKeys(event) {
    if (!['ArrowUp', 'ArrowDown', 'Home', 'End'].includes(event.key)) return;
    const tabs = [...event.currentTarget.querySelectorAll('[data-tab]')], index = tabs.indexOf(document.activeElement);
    if (index < 0) return;
    event.preventDefault();
    const next = event.key === 'Home' ? 0 : event.key === 'End' ? tabs.length - 1 : (index + (event.key === 'ArrowDown' ? 1 : -1) + tabs.length) % tabs.length;
    tabs[next].focus(); router.push('/' + tabs[next].dataset.tab);
  }
  const count = workspace.productions.filter(p => !p.archived && p.stage !== 'done').length;
  return <>
    {user ? <>
      <a className="skip-link" href="#workspace">작업실로 건너뛰기</a>
      <div className="mobile-bar"><Link className="brand" href="/board"><img src="/logo.svg" alt=""/><span>snowlink-studio</span></Link><button ref={menuButton} className="icon-button" id="menu-toggle" aria-label="메뉴 열기" aria-expanded={menuOpen} aria-controls="sidebar" onClick={toggleMenu}><Icon name="menu"/></button></div>
      <aside ref={sidebar} className="sidebar" id="sidebar" aria-label="작업실 메뉴" inert={mobile && !menuOpen}>
        <Link className="brand" href="/board" aria-label="snowlink-studio 제작 보드"><img src="/logo.svg" alt=""/><span>snowlink-studio</span></Link>
        <p className="sidebar-caption">A PLACE FOR YOUR STORIES</p>
        <nav className="side-nav" aria-label="작업 공간" onKeyDown={navKeys}><p className="nav-label">WORKSPACE</p>
          {TABS.map(([id, label, icon]) => <div key={id} style={{display:'contents'}}>{id === 'settings' && <div className="nav-divider"/>}<Link href={'/' + id} id={'tab-' + id} data-tab={id} aria-current={active === id ? 'page' : undefined} onClick={() => setMenuOpen(false)}><Icon name={icon}/><span>{label}</span>{id === 'board' && <span className="tab-count" id="production-count">{count}</span>}{['trends', 'ima2'].includes(id) && <span className={`connection-dot ${connections[id]?.online ? 'online' : ''}`} data-status={id} title={connections[id]?.online ? '서버 연결됨' : '서버 연결 확인 필요'}/>}</Link></div>)}
        </nav>
        <div className="sidebar-note seasonal-surface"><Icon name="spark"/><p>작은 영감이<br/>하나의 이야기로.</p><span className="eyebrow">SNOW &amp; AUTUMN</span></div>
        <div className="sidebar-footer"><span className="local-badge"><i/>{user.name || user.username}</span><button className="icon-button" id="guide-button" aria-label="작업실 사용 안내" onClick={() => openModal('하나의 작업실, 네 가지 흐름', <Guide/>)}>?</button><button className="text-button" onClick={logout}>로그아웃</button>{process.env.NEXT_PUBLIC_COMPANY_SITE_URL && <a className="text-button" href={process.env.NEXT_PUBLIC_COMPANY_SITE_URL}>회사 소개</a>}</div>
      </aside>
      <button className="nav-backdrop" id="nav-backdrop" aria-label="메뉴 닫기" hidden={!menuOpen} onClick={() => setMenuOpen(false)}/>
      <main id="workspace" tabIndex={-1} inert={menuOpen}>{Object.entries(VIEWS).map(([id, View]) => <section key={id} id={'panel-' + id} role="region" aria-labelledby={id !== 'oauth' ? 'tab-' + id : undefined} aria-label={id === 'oauth' ? 'MCP 연결 승인' : undefined} className={'workspace-panel' + (id === 'ima2' ? ' media-workspace-panel' : '')} hidden={active !== id}>{visited.includes(id) && <View active={active === id}/>}</section>)}{children}</main>
    </> : loading ? <div className="auth-screen"><p role="status">작업실을 불러오고 있어요…</p></div> : error ? <div className="auth-screen"><section className="surface-card auth-card"><h2>작업실을 불러오지 못했습니다</h2><p role="alert">{error}</p><Button onClick={loadSession}>다시 시도</Button></section></div> : <Login/>}
  </>;
}
function Guide() {
  return <div className="guide"><p><b>01 트렌드 탐색</b>에서 소재와 참고 링크를 발견하세요.</p><p><b>02 캐릭터 시트</b>에 외형·성격·이미지를 등록하세요.</p><p><b>03 제작 보드</b>에서 썰 영상, 카드뉴스, YouTube 기획을 만들고 캐릭터를 선택하세요.</p><p><b>04 이미지 · 영상 제작 / ShortGPT</b>에서 생성 작업과 컷 편집을 이어가세요.</p><div className="form-tip">Instagram·YouTube 자동 게시와 예약 업로드는 아직 연결되지 않았습니다. 기획 데이터 백업에는 이미지 파일이 포함되지 않으므로, 전체 백업 시 .data 폴더도 함께 보관하세요.</div></div>;
}
