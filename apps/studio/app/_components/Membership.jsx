'use client';

import { useState } from 'react';
import Link from 'next/link';
import { PageHeading, VectorMark } from './Primitives';
import { Icon } from './Icon';
import { BILLING_CYCLES, MEMBERSHIP_PLANS, MEMBERSHIP_COMPARISON } from '../_lib/membership';

export function BillingCycle({ value, onChange }) {
  return <fieldset className="billing-cycle"><legend>결제 주기</legend>{BILLING_CYCLES.map(cycle => <label key={cycle.id}>
    <input type="radio" name="billing-cycle" value={cycle.id} checked={value === cycle.id} onChange={() => onChange(cycle.id)}/><span>{cycle.label}</span>
  </label>)}</fieldset>;
}

export function Membership() {
  const [cycle, setCycle] = useState('monthly');
  return <div className="studio-page membership-page">
    <PageHeading eyebrow="YOUR NEXT CHAPTER" index="MEMBERSHIP" title={['작업의 크기에 맞는', '나만의 멤버십']} description="가벼운 시작부터 긴 시리즈 제작까지. 네티움 스튜디오에서 이어갈 다음 이야기를 준비하세요." ornament/>
    <nav className="guide-breadcrumb" aria-label="현재 위치"><Link href="/">네티움 스튜디오</Link><span aria-hidden="true">/</span><span aria-current="page">멤버십 미리보기</span></nav>
    <div className="membership-intro"><div><span className="membership-preview-tag">멤버십 미리보기</span><p>유료 멤버십은 준비 중입니다. 아래 혜택은 구성안이며, 가격과 정확한 이용 한도는 출시 시 안내합니다.</p></div><BillingCycle value={cycle} onChange={setCycle}/></div>
    <div className="membership-plans">{MEMBERSHIP_PLANS.map((plan, index) => <article className={`membership-plan${plan.recommended ? ' is-recommended' : ''}`} key={plan.id} aria-labelledby={`plan-${plan.id}`}>
      <div className="membership-plan-top"><span className="eyebrow">0{index + 1} / {plan.label}</span>{plan.recommended && <span className="membership-plan-badge">개인 창작자용</span>}</div>
      <h2 id={`plan-${plan.id}`}>{plan.name}</h2><p className="membership-description">{plan.description}</p>
      <div className="membership-price"><strong>{plan.price}</strong><span>{plan.id === 'free' ? '작업실 둘러보기' : `${cycle === 'monthly' ? '월간' : '연간'} 요금 준비 중`}</span></div>
      <Link className={`button ${plan.recommended ? 'primary' : 'secondary'}`} href={plan.id === 'free' ? '/board' : `/checkout?plan=${plan.id}&cycle=${cycle}`}>{plan.id === 'free' ? '무료로 둘러보기' : `${plan.name} 결제 미리보기`}<Icon name="arrow"/></Link>
      <ul>{plan.features.map(feature => <li key={feature}><Icon name="check"/><span>{feature}</span></li>)}</ul>
    </article>)}</div>
    <section className="membership-comparison" aria-labelledby="membership-compare"><div className="membership-section-title"><div><p className="eyebrow">AT A GLANCE</p><h2 id="membership-compare">어떤 작업을 이어가고 싶나요?</h2></div><span>플랜 구성안</span></div>
      <div className="membership-table-wrap" role="region" aria-label="멤버십 등급 비교표" tabIndex={0}><table><caption className="sr-only">Free, Creator, Pro 멤버십 구성안 비교</caption><thead><tr><th scope="col">구성</th>{MEMBERSHIP_PLANS.map(plan => <th scope="col" key={plan.id}>{plan.name}</th>)}</tr></thead><tbody>{MEMBERSHIP_COMPARISON.map(row => <tr key={row.label}><th scope="row">{row.label}</th>{row.values.map((value, i) => <td key={i}>{value}</td>)}</tr>)}</tbody></table></div>
    </section>
    <section className="membership-faq" aria-labelledby="membership-faq"><div className="membership-section-title"><div><p className="eyebrow">GOOD TO KNOW</p><h2 id="membership-faq">시작 전에 확인하세요.</h2></div><VectorMark/></div>
      <div><article><h3>지금 결제되나요?</h3><p>현재는 요금제와 결제 흐름을 살펴보는 미리보기입니다. 카드 정보 입력이나 실제 청구 없이 확인할 수 있습니다.</p></article><article><h3>등급을 고르면 기능이 달라지나요?</h3><p>멤버십은 출시 전 구성안입니다. 미리보기에서 선택한 등급은 현재 계정의 권한이나 생성 한도를 변경하지 않습니다.</p></article><article><h3>월간과 연간 요금은 얼마인가요?</h3><p>유료 등급은 모두 출시 예정입니다. 구독료, 포함 이용량, 결제·변경 정책은 정식 멤버십 출시 시 안내합니다.</p></article></div>
    </section>
  </div>;
}
