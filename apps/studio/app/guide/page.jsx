// Public content is independent of account state; user state hydrates in the client.
export const dynamic = 'force-static';
import Link from 'next/link';
import { JsonLd } from '../_components/JsonLd';
import { CONTENT_UPDATED, publicMetadata, publicStructuredData } from '../_lib/seo';
import { GUIDE_INTRO, GUIDE_STEPS, GUIDE_FAQ } from '../_lib/guide';

export const metadata = publicMetadata('/guide');
export default function Page() {
  return <div className="studio-page public-guide">
    <JsonLd data={publicStructuredData('/guide', { faq: GUIDE_FAQ })}/>
    <nav className="guide-breadcrumb" aria-label="현재 위치"><Link href="/">Snowlink Studio</Link><span aria-hidden="true">/</span><span aria-current="page">사용 가이드</span></nav>
    <header><p className="eyebrow">FROM IDEA TO SCENE / GUIDE</p><h1>캐릭터부터 이야기와 장면까지,<br/>첫 작품을 만드는 순서</h1><p>{GUIDE_INTRO}</p><p className="guide-byline">스노우링크(SnowLink) 제품 안내 · <time dateTime={CONTENT_UPDATED}>{CONTENT_UPDATED}</time> 업데이트</p></header>
    <nav className="guide-toc" aria-label="가이드 목차">{GUIDE_STEPS.map(step => <a key={step.id} href={`#${step.id}`}>{step.title}</a>)}<a href="#guide-faq">자주 묻는 질문</a></nav>
    {GUIDE_STEPS.map(step => <section className="guide-step" key={step.id} id={step.id} aria-labelledby={`${step.id}-title`}><h2 id={`${step.id}-title`}>{step.title}</h2><dl><div><dt>준비할 자료</dt><dd>{step.input}</dd></div><div><dt>작업 방법</dt><dd>{step.action}</dd></div><div><dt>결과물</dt><dd>{step.output}</dd></div></dl><p className="guide-example">{step.example}</p><Link className="button secondary" href={step.path}>{step.link} →</Link></section>)}
    <section className="guide-step" id="guide-faq" aria-labelledby="guide-faq-title"><h2 id="guide-faq-title">자주 묻는 질문</h2>{GUIDE_FAQ.map(item => <article className="guide-answer" key={item.id} id={`faq-${item.id}`}><h3>{item.question}</h3><p>{item.answer}</p></article>)}</section>
    <nav className="guide-related" aria-label="관련 안내"><Link href="/mcp">Claude Code·Codex MCP 연결 방법 →</Link><Link href="/membership">Free·Creator·Pro 구성안 →</Link><a href="https://www.snowlink.team/">제품 상세와 운영사 안내 →</a><a href="/llms-full.txt">사용 가이드 텍스트 버전 →</a></nav>
  </div>;
}
