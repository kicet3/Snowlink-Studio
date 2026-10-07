import { Fragment } from 'react';
import { Icon } from '../components/Icon';
import { ProductShowcase } from '../components/ProductShowcase';
import VectorWordmark from '../components/VectorWordmark';
import { companyConfig } from '../lib/config';

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
    <a className="skip-link" href="#company-main">회사 소개로 건너뛰기</a>
    <header className="company-header">
      <a href="/" className="brand" aria-label={`${c.brand} 회사 소개`}><img src="/brandmark.svg" alt=""/><span>{c.brand}</span></a>
      <nav aria-label="회사 안내"><a href="#about">회사 소개</a><a href="#product">제품</a><a href="#contact">문의</a><ServiceLink service={c.service} className="button primary">스튜디오 열기</ServiceLink></nav>
    </header>
    <main id="company-main">
      <section className="company-hero" aria-labelledby="hero-title">
        <div className="company-hero-intro">
          <div><p className="eyebrow"><span className="status-dot"/> A PLACE FOR YOUR STORIES</p><h1 id="hero-title"><Lines text={c.headline}/><span className="hero-period">.</span></h1></div>
          <div className="company-hero-copy"><p><Lines text={c.introduction}/></p><ServiceLink service={c.service} className="company-text-link">창작 시작하기</ServiceLink></div>
        </div>
        <VectorWordmark text={c.brand}/>
      </section>
      <section className="company-about" id="about" aria-labelledby="about-title">
        <SectionLabel number="01">WHY SNOWLINK</SectionLabel>
        <div className="company-about-content"><h2 id="about-title"><Lines text={c.aboutTitle}/></h2><div className="company-about-bottom"><p>{c.about}</p><span className="company-flow-note" aria-hidden="true">IDEA <span>↗</span> STORY <span>↗</span> SCENE</span></div></div>
      </section>
      <section className="company-product" id="product" aria-labelledby="product-title">
        <div className="company-section-heading"><SectionLabel number="02">OUR PRODUCT</SectionLabel><span>{c.service.caption}</span></div>
        <div className="company-product-heading"><div><h2 id="product-title">{c.service.name}<span className="product-period">.</span></h2><p>{c.service.description}</p></div><ServiceLink service={c.service} className="button primary">{c.service.button}</ServiceLink></div>
        <div className="company-capabilities">{c.features.map((feature, index) => <article key={feature.title}><div><span>0{index + 1} /</span><Icon name={feature.icon}/></div><h3>{feature.title}</h3><p>{feature.description}</p></article>)}</div>
        <ProductShowcase/>
      </section>
      <section className="company-contact" id="contact" aria-labelledby="contact-title">
        <SectionLabel number="03">GET IN TOUCH</SectionLabel>
        <div className="company-contact-content"><h2 id="contact-title">{c.contactTitle}</h2><p>{c.contactDescription}</p><a className="company-email" href={`mailto:${c.email}`}>{c.email}<Icon name="external"/></a></div>
      </section>
      <section className="company-business" aria-labelledby="business-title">
        <div><a className="brand" href="/" aria-label={`${c.brand} 처음으로`}><img src="/brandmark.svg" alt=""/><span>{c.brand}</span></a><h2 id="business-title">{c.name}</h2><p>아이디어와 창작 도구를 연결합니다.</p></div>
        <dl><div><dt>대표자</dt><dd>{c.representative}</dd></div><div><dt>사업자등록번호</dt><dd>{c.registration}</dd></div><div><dt>개업일</dt><dd>{c.openingDate}</dd></div><div><dt>사업자등록일</dt><dd>{c.registrationDate}</dd></div><div><dt>주소</dt><dd>{c.address}</dd></div><div><dt>문의 이메일</dt><dd><a href={`mailto:${c.email}`}>{c.email}</a></dd></div></dl>
      </section>
    </main>
    <footer className="company-footer"><span>© {c.brand}. All rights reserved.</span><span className="company-footer-note">INDEPENDENT IDEAS. CONNECTED.</span><a href="#company-main">맨 위로 ↑</a></footer>
  </div>;
}
