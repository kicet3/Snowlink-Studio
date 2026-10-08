// Public content is independent of account state; user state hydrates in the client.
export const dynamic = 'force-static';
import Link from 'next/link';
import { JsonLd } from '../_components/JsonLd';
import { CONTENT_UPDATED, publicMetadata, publicStructuredData } from '../_lib/seo';
import { GUIDE_INTRO, GUIDE_ACCESS, PRODUCT_STORY, CLAUDE_STATUS, GUIDE_STEPS, GUIDE_FAQ } from '../_lib/guide';

export const metadata = publicMetadata('/guide');
export default function Page() {
  return <div className="studio-page public-guide">
    <JsonLd data={publicStructuredData('/guide', { faq: GUIDE_FAQ })}/>
    <nav className="guide-breadcrumb" aria-label="현재 위치"><Link href="/">Snowlink Team Studio</Link><span aria-hidden="true">/</span><span aria-current="page">사용 가이드</span></nav>
    <header><p className="eyebrow">FROM IDEA TO SCENE / GUIDE</p><h1>첫 인사에서 나의 이야기까지,<br/>캐릭터챗과 창작을 시작하는 순서</h1><p>{GUIDE_INTRO}</p><p className="guide-byline">Snowlink Team 제품 안내 · <time dateTime={CONTENT_UPDATED}>{CONTENT_UPDATED}</time> 업데이트</p></header>
    <section className="guide-start" aria-labelledby="guide-start-title"><h2 id="guide-start-title">처음 방문했다면</h2><p>{GUIDE_ACCESS}</p><div className="guide-start-links"><Link href="/chat">캐릭터와 첫 대화 시작 →</Link><Link href="/explore/moon-post-office">공개 소설의 회차 읽기 →</Link><Link href="/scenarios">시나리오 작업실 열기 →</Link></div></section>
    <nav className="guide-toc" aria-label="가이드 목차"><a href="#experience">이야기 속 대화가 지향하는 경험</a>{GUIDE_STEPS.map(step => <a key={step.id} href={`#${step.id}`}>{step.title}</a>)}<a href="#claude">Claude 활용 현황과 개발 계획</a><a href="#guide-faq">자주 묻는 질문</a></nav>
    <section className="guide-step" id="experience" aria-labelledby="guide-experience-title"><h2 id="guide-experience-title">{PRODUCT_STORY.title}</h2><p>{PRODUCT_STORY.problem}</p><article className="guide-answer"><h3>지금 경험할 수 있는 대화</h3><p>{PRODUCT_STORY.experience}</p><ol className="guide-experience-steps">{PRODUCT_STORY.steps.map(step => <li key={step}>{step}</li>)}</ol><Link className="button secondary" href="/chat">캐릭터를 고르고 첫 인사 건네기 →</Link></article></section>
    {GUIDE_STEPS.map(step => <section className="guide-step" key={step.id} id={step.id} aria-labelledby={`${step.id}-title`}><h2 id={`${step.id}-title`}>{step.title}</h2><dl><div><dt>준비할 자료</dt><dd>{step.input}</dd></div><div><dt>작업 방법</dt><dd>{step.action}</dd></div><div><dt>결과물</dt><dd>{step.output}</dd></div></dl><p className="guide-example">{step.example}</p><Link className="button secondary" href={step.path}>{step.link} →</Link></section>)}
    <section className="guide-step" id="claude" aria-labelledby="guide-claude-title"><h2 id="guide-claude-title">Claude 활용 현황과 개발 계획</h2><article className="guide-answer"><h3>현재 · 개발과 MCP 연결</h3><p>{CLAUDE_STATUS.current}</p><p>{CLAUDE_STATUS.writing}</p><Link className="button secondary" href="/mcp">MCP 연결 및 인증 방법 →</Link></article><article className="guide-answer"><h3>계획 · Claude로 대화의 맥락 이어가기</h3><p>{CLAUDE_STATUS.planned}</p><ol className="guide-plan-steps">{CLAUDE_STATUS.planSteps.map(step => <li key={step.title}><h4>{step.title}</h4><p>{step.description}</p></li>)}</ol></article><article className="guide-answer" id="evaluation"><h3>계획 · 같은 시나리오로 확인하고 개선하기</h3><p>{CLAUDE_STATUS.evaluation}</p><dl>{CLAUDE_STATUS.metrics.map(metric => <div key={metric.name}><dt>{metric.name}</dt><dd>{metric.description}</dd></div>)}</dl><h4>이 개발에 필요한 지원</h4><p>{CLAUDE_STATUS.support}</p></article></section>
    <section className="guide-step" id="guide-faq" aria-labelledby="guide-faq-title"><h2 id="guide-faq-title">자주 묻는 질문</h2>{GUIDE_FAQ.map(item => <article className="guide-answer" key={item.id} id={`faq-${item.id}`}><h3>{item.question}</h3><p>{item.answer}</p></article>)}</section>
    <nav className="guide-related" aria-label="관련 안내"><Link href="/mcp">Claude Code·Codex MCP 연결 방법 →</Link><Link href="/membership">Free·Creator·Pro 구성안 →</Link><a href="https://www.snowlink.team/">제품 상세와 운영사 안내 →</a><a href="/llms-full.txt">사용 가이드 텍스트 버전 →</a></nav>
  </div>;
}
