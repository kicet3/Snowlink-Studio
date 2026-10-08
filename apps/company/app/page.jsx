import { Fragment } from 'react';
import { Icon } from '../components/Icon';
import { ProductShowcase } from '../components/ProductShowcase';
import { ProductDetails } from '../components/ProductDetails';
import VectorWordmark from '../components/VectorWordmark';
import { companyConfig } from '../lib/config';
import { structuredData } from '../lib/seo';

function Lines({ text }) {
  return text.split('\n').map((line, i) => <Fragment key={i}>{i > 0 && <br/>}{line}</Fragment>);
}
function ServiceLink({ service, children, className = 'button secondary' }) {
  return <a className={className} href={service.url}>{children || service.button}<Icon name="arrow"/></a>;
}
function SectionLabel({ number, children }) {
  return <p className="section-label"><span>[{number}]</span>{children}</p>;
}

export default function CompanyPage() {
  const c = companyConfig();
  return <div className="company-page">
    <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData()).replace(/</g, '\\u003c') }}/>
    <a className="skip-link" href="#company-main">회사 소개로 건너뛰기</a>
    <header className="company-header">
      <a href="/" className="brand" aria-label={`${c.brand} 회사 소개`}><img src="/brandmark.svg" alt=""/><span>{c.brand}</span></a>
      <nav aria-label="회사 안내"><a href="#about">회사 소개</a><a href="#product">제품</a><a href="#contact">문의</a><ServiceLink service={c.service} className="button primary">작품 둘러보기</ServiceLink></nav>
    </header>
    <main id="company-main" tabIndex={-1}>
      <section className="company-hero" aria-labelledby="hero-title">
        <div className="company-hero-intro">
          <div><p className="eyebrow"><span className="status-dot"/> A PLACE FOR YOUR STORIES</p><h1 id="hero-title"><Lines text={c.headline}/><span className="hero-period">.</span></h1></div>
          <div className="company-hero-copy"><p><Lines text={c.introduction}/></p><ServiceLink service={c.service} className="company-text-link">Studio 둘러보기</ServiceLink></div>
        </div>
        <VectorWordmark text={c.brand}/>
      </section>
      <section className="company-about" id="about" aria-labelledby="about-title">
        <SectionLabel number="01">WHY SNOWLINK TEAM</SectionLabel>
        <div className="company-about-content"><h2 id="about-title"><Lines text={c.aboutTitle}/></h2><p className="company-identity">{c.identity}</p><div className="company-about-bottom"><p>{c.about}</p><span className="company-flow-note" aria-hidden="true">IDEA <span>↗</span> STORY <span>↗</span> SCENE</span></div><details className="company-english"><summary lang="en">Product summary in English</summary><p lang="en">{c.englishSummary}</p></details></div>
      </section>
      <section className="company-product" id="product" aria-labelledby="product-title">
        <div className="company-section-heading"><SectionLabel number="02">OUR PRODUCT</SectionLabel><span>{c.service.caption}</span></div>
        <div className="company-product-heading"><div><h2 id="product-title">{c.service.name}<span className="product-period">.</span></h2><p>{c.service.description}</p></div><ServiceLink service={c.service} className="button primary">{c.service.button}</ServiceLink></div>
        <div className="company-product-summary"><p>{c.productSummary}</p><p>{c.productAudience}</p></div>
        <nav className="company-entry-points" aria-label="Studio 시작 방법">{c.entryPoints.map((entry, index) => <a key={entry.path} href={`${c.service.url}${entry.path}`}><div className="company-entry-index"><span>0{index + 1} /</span><Icon name={entry.icon}/></div><h3>{entry.title}</h3><p>{entry.description}</p><span className="company-entry-link">{entry.label}<Icon name="arrow"/></span></a>)}</nav>
        <div className="company-capabilities">{c.features.map((feature, index) => <article key={feature.title}><div><span>0{index + 1} /</span><Icon name={feature.icon}/></div><h3>{feature.title}</h3><p>{feature.description}</p></article>)}</div>
        <section className="company-development" id="claude" aria-labelledby="claude-title">
          <div className="company-detail-heading"><p className="eyebrow">DEVELOPMENT / CURRENT &amp; PLANNED</p><h3 id="claude-title">{c.claude.title}</h3></div>
          <div className="company-detail-grid">{c.claude.current.map(item => <article key={item.title}><h4>{item.title}</h4><p>{item.description}</p></article>)}</div>
          <p className="company-development-note">{c.claude.writing}</p>
          <article className="company-development-plan"><h4>계획 · Claude API로 집필 연결</h4><p>{c.claude.planned}</p><p>{c.claude.evaluation}</p></article>
          <a className="company-text-link" href={`${c.service.url}/guide#claude`}>현재 기능과 개발 계획 확인<Icon name="arrow"/></a>
        </section>
        <ProductShowcase productName={c.service.name} serviceUrl={c.service.url}/>
        <ProductDetails workflow={c.workflow} details={c.productDetails}/>
        <section className="company-membership" id="membership" aria-labelledby="membership-title">
          <div className="company-detail-heading"><p className="eyebrow">YOUR NEXT CHAPTER / MEMBERSHIP PREVIEW</p><h3 id="membership-title">{c.membership.title}</h3><p>{c.membership.description}</p></div>
          <div className="company-membership-plans">{c.membership.plans.map(plan => <article key={plan.name}><h4>{plan.name}</h4><p>{plan.description}</p><strong>{plan.price}</strong><ul>{plan.features.map(feature => <li key={feature}>{feature}</li>)}</ul></article>)}</div>
          <p className="company-preview-note">{c.membership.notice}</p>
          <a className="company-text-link" href={`${c.service.url}/membership`}>멤버십과 결제 흐름 미리보기<Icon name="arrow"/></a>
        </section>
        <section className="company-faq" id="faq" aria-labelledby="faq-title">
          <div className="company-detail-heading"><p className="eyebrow">BEFORE YOU CREATE</p><h3 id="faq-title">Snowlink Team Studio, 궁금한 점을 모았습니다.</h3><p>제품 안내 기준일 <time dateTime={c.contentUpdated}>{c.contentUpdated}</time></p></div>
          <div className="company-faq-list">{c.faq.map(item => <article key={item.id} id={item.id}><h4><a href={`#${item.id}`}>{item.question}</a></h4><p>{item.answer}</p></article>)}</div>
          <a className="company-text-link" href={`${c.service.url}/mcp`}>Claude Code·Codex MCP 연결 방법<Icon name="arrow"/></a>
        </section>
      </section>
      <section className="company-contact" id="contact" aria-labelledby="contact-title">
        <SectionLabel number="03">GET IN TOUCH</SectionLabel>
        <div className="company-contact-content"><h2 id="contact-title">{c.contactTitle}</h2><p>{c.contactDescription}</p><a className="company-email" href={`mailto:${c.email}`}>{c.email}<Icon name="external"/></a></div>
      </section>
    </main>
    <footer className="company-footer" aria-label="회사 정보">
      <div className="company-footer-top">
        <div className="company-footer-brand"><a className="brand" href="/" aria-label={`${c.brand} 처음으로`}><img src="/brandmark.svg" alt=""/><span>{c.brand}</span></a><p>아이디어와 창작 도구를 연결합니다.<br/>만들고 싶은 이야기에 더 오래 집중할 수 있도록.</p><a className="company-footer-email" href={`mailto:${c.email}`}>{c.email}<Icon name="external"/></a></div>
        <nav aria-label="하단 회사 안내"><h2>회사</h2><a href="#about">Snowlink Team 소개</a><a href="#claude">Claude 활용과 개발 계획</a><a href="#contact">사업 및 제품 문의</a></nav>
        <nav aria-label="하단 제품 안내"><h2>제품</h2><a href="#product">{c.service.name} 소개</a><a href={c.service.url}>작품 둘러보기 <Icon name="external"/></a><a href={`${c.service.url}/board`}>내 제작 보드 <Icon name="external"/></a><a href="#membership">멤버십 미리보기</a><a href={`${c.service.url}/guide`}>Studio 사용 가이드</a><a href="#faq">자주 묻는 질문</a><a href="/llms-full.txt">제품 정보 (텍스트)</a></nav>
      </div>
      <div className="company-footer-business">
        <h2>{c.name}</h2>
        <dl><div><dt>대표자</dt><dd>{c.representative}</dd></div><div><dt>사업자등록번호</dt><dd>{c.registration}</dd></div><div><dt>주소</dt><dd>{c.address}</dd></div><div><dt>개업일</dt><dd>{c.openingDate}</dd></div><div><dt>사업자등록일</dt><dd>{c.registrationDate}</dd></div><div><dt>문의 이메일</dt><dd><a href={`mailto:${c.email}`}>{c.email}</a></dd></div></dl>
      </div>
      <div className="company-footer-bottom"><small>© {c.foundingYear} {c.brand}. All rights reserved.</small><span className="company-footer-note">INDEPENDENT IDEAS. CONNECTED.</span><a href="#company-main">맨 위로 ↑</a></div>
    </footer>
  </div>;
}
