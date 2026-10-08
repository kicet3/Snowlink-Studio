'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { Button, PageHeading } from './Primitives';
import { Icon } from './Icon';
import { BillingCycle } from './Membership';
import { BILLING_CYCLES } from '../_lib/membership';

export function Checkout({ plan, initialCycle }) {
  const [cycle, setCycle] = useState(initialCycle), [method, setMethod] = useState('card');
  const [acknowledged, setAcknowledged] = useState(false), [complete, setComplete] = useState(false);
  const confirmation = useRef(null);
  useEffect(() => { if (complete) confirmation.current?.focus(); }, [complete]);
  const cycleLabel = BILLING_CYCLES.find(item => item.id === cycle).label;
  if (complete) return <div className="studio-page checkout-page"><section className="checkout-complete" ref={confirmation} tabIndex={-1} aria-labelledby="preview-complete-title">
    <span className="checkout-complete-mark"><Icon name="check"/></span><p className="eyebrow">PREVIEW COMPLETE</p><h1 id="preview-complete-title">멤버십 미리보기를<br/>완료했어요.</h1><p>{plan.name} · {cycleLabel} 구성과 {method === 'card' ? '신용·체크카드' : '간편결제'} 결제 흐름을 확인했습니다.</p><div className="checkout-complete-note">실제 결제 금액은 0원입니다.<br/>구독 신청과 계정 등급 변경은 이루어지지 않았습니다.</div><div className="checkout-complete-actions"><Link className="button primary" href="/board">작업실로 이동<Icon name="arrow"/></Link><Link className="button secondary" href="/membership">다른 멤버십 보기</Link><Button variant="secondary" onClick={() => { setComplete(false); setAcknowledged(false); }}>미리보기 다시 하기</Button></div>
  </section></div>;
  return <div className="studio-page checkout-page">
    <Link className="checkout-back" href="/membership">← 멤버십으로 돌아가기</Link>
    <PageHeading eyebrow="ONE STEP TO YOUR NEXT STORY" index="CHECKOUT / PREVIEW" title="다음 이야기를 준비하세요" description={`${plan.name} 멤버십의 결제 구성을 미리 살펴보세요. 유료 요금제는 출시 예정이며 현재 실제 결제는 진행되지 않습니다.`}/>
    <form className="checkout-layout" onSubmit={event => { event.preventDefault(); if (acknowledged) setComplete(true); }}>
      <div className="checkout-options">
        <section className="checkout-section"><div className="checkout-section-heading"><span>01</span><h2>선택한 멤버십</h2></div><div className="checkout-selected-plan"><div><h3>{plan.name}</h3><p>{plan.description}</p></div><Link href="/membership">변경</Link></div><ul className="checkout-features">{plan.features.map(feature => <li key={feature}><Icon name="check"/>{feature}</li>)}</ul></section>
        <section className="checkout-section"><div className="checkout-section-heading"><span>02</span><h2>결제 주기</h2></div><BillingCycle value={cycle} onChange={setCycle}/><p className="checkout-help">{cycleLabel} 요금은 출시 예정입니다. 가격과 구독 조건은 정식 출시 시 안내합니다.</p></section>
        <section className="checkout-section"><div className="checkout-section-heading"><span>03</span><h2>결제 수단</h2><span className="membership-preview-tag">미리보기</span></div><fieldset className="checkout-methods"><legend className="sr-only">결제 수단 선택</legend>{[{ id: 'card', label: '신용·체크카드', detail: '카드 결제 화면 구성' }, { id: 'easy', label: '간편결제', detail: '간편결제 화면 구성' }].map(option => <label key={option.id}><input type="radio" name="payment-method" checked={method === option.id} value={option.id} onChange={() => setMethod(option.id)}/><span><strong>{option.label}</strong><small>{option.detail}</small></span></label>)}</fieldset><div className="checkout-payment-placeholder"><Icon name="cards"/><p>결제 정보 입력은 정식 출시 후 제공됩니다.<br/>지금은 결제 수단의 선택 흐름만 확인할 수 있습니다.</p></div></section>
      </div>
      <aside className="checkout-summary" aria-labelledby="order-summary"><p className="eyebrow">YOUR NEXT CHAPTER</p><h2 id="order-summary">주문 미리보기</h2><dl><div><dt>멤버십</dt><dd>{plan.name}</dd></div><div><dt>결제 주기</dt><dd>{cycleLabel}</dd></div><div><dt>정식 구독료</dt><dd>출시 예정</dd></div><div><dt>결제 수단</dt><dd>{method === 'card' ? '신용·체크카드' : '간편결제'}</dd></div></dl><div className="checkout-total"><span>오늘 결제 금액</span><strong>0<span>원</span></strong></div><p className="checkout-help">결제 미리보기 화면으로, 실제 청구와 자동 갱신이 발생하지 않습니다.</p><label className="checkout-acknowledgement"><input type="checkbox" checked={acknowledged} onChange={event => setAcknowledged(event.target.checked)} required/><span>출시 전 멤버십 구성안이며, 실제 구독이 시작되지 않는 미리보기임을 확인했습니다.</span></label><button className="button primary" type="submit" disabled={!acknowledged}>결제 흐름 미리보기<Icon name="arrow"/></button><p className="checkout-summary-note">카드·계좌 정보 입력 없이 확인하세요.</p></aside>
    </form>
  </div>;
}
