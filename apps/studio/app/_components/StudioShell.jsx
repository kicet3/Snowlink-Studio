'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { StudioProvider, useStudio } from './StudioProvider';
import { Button } from './Primitives';
import { Icon } from './Icon';
import { COMPANY_SITE_URL, PRODUCT_NAME } from '../_lib/branding';

export const TABS = [
  ['explore', '작품 둘러보기', 'radar'], ['chat', '캐릭터챗', 'chat'], ['guide', '사용 가이드', 'chat'], ['board', '내 제작 보드', 'board'], ['characters', '캐릭터 시트', 'people'],
  ['scenarios', '시나리오 · 영상 스타일', 'film'], ['trends', '트렌드 탐색', 'radar'],
  ['ima2', '이미지 · 영상 제작', 'spark'], ['shortgpt', 'ShortGPT · 컷 편집', 'film'], ['mcp', 'MCP 연결 안내', 'external'], ['membership', '멤버십', 'cards'], ['settings', '설정', 'settings'], ['profile', '내 프로필', 'people'],
];
const ROUTES = new Set([...TABS.map(([id]) => id), 'oauth', 'checkout', 'creators']);
const tabHref = id => id === 'explore' ? '/' : '/' + id;

export function StudioShell({ children }) {
  return <StudioProvider><Shell>{children}</Shell></StudioProvider>;
}
function Shell({ children }) {
  const { user, loading, error, loadSession, workspace, connections, logout, openModal } = useStudio();
  const pathname = usePathname(), router = useRouter();
  const requested = pathname.split('/')[1] || 'explore';
  const active = requested === 'checkout' ? 'membership' : requested === 'creators' ? 'explore' : ROUTES.has(requested) ? requested : 'explore';
  const [menuOpen, setMenuOpen] = useState(false), [mobile, setMobile] = useState(false);
  const menuButton = useRef(), sidebar = useRef();
  const signedIn = !!user && user.role !== 'guest';
  useEffect(() => {
    if (requested !== 'login' && !loading && !signedIn && !error) {
      router.replace('/login?next=' + encodeURIComponent(location.pathname + location.search));
    }
  }, [requested, loading, signedIn, error, router]);
  useEffect(() => { document.body.classList.toggle('auth-locked', requested === 'login'); return () => document.body.classList.remove('auth-locked'); }, [requested]);
  useEffect(() => {
    const mq = matchMedia('(max-width: 760px)'); const update = () => { setMobile(mq.matches); setMenuOpen(false); };
    update(); mq.addEventListener('change', update); return () => mq.removeEventListener('change', update);
  }, []);
  useEffect(() => { document.body.classList.toggle('menu-open', menuOpen); return () => document.body.classList.remove('menu-open'); }, [menuOpen]);
  // Next metadata owns the title on every route, including nested and public pages.
  useEffect(() => { setMenuOpen(false); }, [pathname]);
  useEffect(() => {
    const legacyRoute = () => {
      const hash = location.hash.slice(1), tab = hash.split('/')[0];
      if (ROUTES.has(tab)) router.replace('/' + hash);
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
    tabs[next].focus(); router.push(tabHref(tabs[next].dataset.tab));
  }
  const count = workspace.productions.filter(p => !p.archived && p.stage !== 'done').length;
  if (requested === 'login') return children;
  if (!signedIn) return <div className="studio-page"><p role={error ? 'alert' : 'status'}>{error || '계정 로그인을 확인하고 있습니다…'}</p>{error && <Button onClick={loadSession}>다시 시도</Button>}</div>;
  return <>
    <>
      <a className="skip-link" href="#workspace">작업실로 건너뛰기</a>
      <div className="mobile-bar"><Link className="brand" href="/"><img src="/logo.svg" alt=""/><span>{PRODUCT_NAME}</span></Link><button ref={menuButton} className="icon-button" id="menu-toggle" aria-label="메뉴 열기" aria-expanded={menuOpen} aria-controls="sidebar" onClick={toggleMenu}><Icon name="menu"/></button></div>
      <aside ref={sidebar} className="sidebar" id="sidebar" aria-label="작업실 메뉴" inert={mobile && !menuOpen}>
        <Link className="brand" href="/" aria-label={`${PRODUCT_NAME} 작품 둘러보기`}><img src="/logo.svg" alt=""/><span>{PRODUCT_NAME}</span></Link>
        <p className="sidebar-caption">A PLACE FOR YOUR STORIES</p>
        <nav className="side-nav" aria-label="작업 공간" onKeyDown={navKeys}><p className="nav-label">WORKSPACE</p>
          {TABS.map(([id, label, icon]) => <div key={id} style={{display:'contents'}}>{id === 'membership' && <div className="nav-divider"/>}<Link href={tabHref(id)} id={'tab-' + id} data-tab={id} aria-current={active === id ? 'page' : undefined} onClick={() => setMenuOpen(false)}><Icon name={icon}/><span>{label}</span>{id === 'board' && <span className="tab-count" id="production-count">{count}</span>}{['trends', 'ima2'].includes(id) && <span className={`connection-dot ${connections[id]?.online ? 'online' : ''}`} data-status={id} title={connections[id]?.online ? '서버 연결됨' : '서버 연결 확인 필요'}/>}</Link></div>)}
        </nav>
        <div className="sidebar-note seasonal-surface"><Icon name="spark"/><p>작은 영감이<br/>하나의 이야기로.</p><span className="eyebrow">IDEAS, CONNECTED.</span></div>
        <div className="sidebar-footer"><span className="local-badge"><i/>{user?.name || '내 작업실'}</span><button className="icon-button" id="guide-button" aria-label="작업실 사용 안내" onClick={() => openModal('하나의 작업실, 네 가지 흐름', <Guide/>)}>?</button>{user && user.role !== 'guest' ? <button className="text-button" onClick={logout}>로그아웃</button> : <Link className="text-button" href="/login">계정 로그인</Link>}{COMPANY_SITE_URL && <a className="text-button" href={COMPANY_SITE_URL}>회사 소개</a>}</div>
      </aside>
      <button className="nav-backdrop" id="nav-backdrop" aria-label="메뉴 닫기" hidden={!menuOpen} onClick={() => setMenuOpen(false)}/>
      <main id="workspace" tabIndex={-1} inert={menuOpen}><section id={'panel-' + active} role="region" aria-labelledby={active !== 'oauth' ? 'tab-' + active : undefined} aria-label={active === 'oauth' ? 'MCP 연결 승인' : undefined} className={'workspace-panel' + (active === 'ima2' ? ' media-workspace-panel' : '')}>{children}</section></main>
    </>
  </>;
}
function Guide() {
  return <div className="guide"><p><b>캐릭터챗</b>에서 공개 작품 속 인물을 만나거나 내 캐릭터의 성격과 세계관으로 대화하세요. 기록은 작업실별로 저장됩니다.</p><p><b>01 트렌드 탐색</b>에서 소재와 참고 링크를 발견하세요.</p><p><b>02 캐릭터 시트</b>에 외형·성격·이미지를 등록하세요.</p><p><b>03 제작 보드</b>에서 썰 영상, 카드뉴스, YouTube 기획을 만들고 캐릭터를 선택하세요.</p><p><b>04 이미지 · 영상 제작 / ShortGPT</b>에서 생성 작업과 컷 편집을 이어가세요.</p><div className="form-tip">Instagram·YouTube 자동 게시와 예약 업로드는 아직 연결되지 않았습니다. 기획 데이터 백업에는 이미지 파일이 포함되지 않으므로, 전체 백업 시 .data 폴더도 함께 보관하세요.</div></div>;
}
