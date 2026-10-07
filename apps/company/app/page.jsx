import { Fragment } from 'react';
import { Icon } from '../components/Icon';
import { SeasonMark } from '../components/SeasonMark';
import { companyConfig } from '../lib/config';

function Lines({ text }) {
  return text.split('\n').map((line, i) => <Fragment key={i}>{i > 0 && <br/>}{line}</Fragment>);
}
function ServiceLink({ service, children, className = 'button secondary' }) {
  if (!service.url) return null;
  return <a className={className} href={service.url}>{children || service.button} <Icon name="arrow"/></a>;
}
export default function CompanyPage() {
  const c = companyConfig();
  return <div className="company-page">
    <a className="skip-link" href="#company-main">회사 소개로 건너뛰기</a>
    <header className="company-header"><a href="/" className="brand" aria-label={`${c.brand} 회사 소개`}><img src="/logo.svg" alt=""/><span>{c.brand}</span></a><nav aria-label="회사 안내"><a href="#product">제품</a><a href="#contact">문의</a><ServiceLink service={c.service}>스튜디오 열기</ServiceLink></nav></header>
    <main id="company-main">
      <section className="company-hero"><div className="company-hero-copy"><p className="eyebrow">IDEAS, CONNECTED.</p><h1><Lines text={c.headline}/><span className="accent">.</span></h1><p><Lines text={c.introduction}/></p><div className="company-hero-actions"><ServiceLink className="button primary" service={c.service}/><a className="text-button" href="#about">{c.brand} 알아보기 ↓</a></div></div><div className="company-art" aria-hidden="true"><span className="company-art-label">FROM A SPARK TO A STORY</span><div className="company-art-orbit"/><div className="company-art-sheet company-art-sheet-back"><span>01 / IDEA</span><i/><i/><i/></div><div className="company-art-sheet company-art-sheet-front"><SeasonMark/><span>02 / CREATE</span><strong>Your next<br/>story starts here.</strong><div className="company-art-line"/></div><span className="company-art-caption">SNOW &amp; AUTUMN — {c.brand.toUpperCase()}</span></div></section>
      <section className="company-about" id="about"><p className="eyebrow">ABOUT {c.brand.toUpperCase()}</p><div><h2><Lines text={c.aboutTitle}/></h2><p>{c.about}</p></div></section>
      <section className="company-product" id="product"><div className="company-section-heading"><p className="eyebrow">OUR PRODUCT / 01</p><span>{c.service.caption}</span></div><div className="company-product-heading"><div><h2>{c.service.name}<span className="accent">.</span></h2><p>{c.service.description}</p></div><ServiceLink service={c.service}>제품 열기</ServiceLink></div><div className="company-capabilities">{c.features.map((feature, index) => <article key={index}><div><Icon name={feature.icon}/><span>0{index + 1}</span></div><h3>{feature.title}</h3><p>{feature.description}</p></article>)}</div></section>
      <section className="company-contact" id="contact"><div><p className="eyebrow">LET’S TALK</p><h2>{c.contactTitle}</h2><p>{c.contactDescription}</p><a className="company-email" href={`mailto:${c.email}`}>{c.email} <Icon name="external"/></a></div><div className="company-business"><h3>{c.name}</h3><dl><div><dt>대표자</dt><dd>{c.representative}</dd></div><div><dt>사업자등록번호</dt><dd>{c.registration}</dd></div><div><dt>개업일</dt><dd>{c.openingDate}</dd></div><div><dt>사업자등록일</dt><dd>{c.registrationDate}</dd></div><div><dt>주소</dt><dd>{c.address}</dd></div><div><dt>문의 이메일</dt><dd><a href={`mailto:${c.email}`}>{c.email}</a></dd></div></dl></div></section>
    </main><footer className="company-footer"><span>© {c.brand}. All rights reserved.</span><ServiceLink className="company-service-link" service={c.service}>{c.service.name}</ServiceLink></footer>
  </div>;
}
