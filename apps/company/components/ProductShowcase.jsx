'use client';

import { useState } from 'react';
import { Icon } from './Icon';

const groups = [{ id: 'explore', label: '발견하고 읽기' }, { id: 'create', label: '내 작품 만들기' }, { id: 'membership', label: '멤버십 살펴보기' }];
const screens = [
  { id: 'explore', group: 'explore', label: '작품 둘러보기', icon: 'radar', title: '새로운 Studio의 시작, 작품 탐색', description: '기본 화면에서 캐릭터·소설·이미지 콘텐츠를 검색하고 종류별로 살펴봅니다.' },
  { id: 'creators', group: 'explore', label: '창작자별 작품', icon: 'people', title: '한 창작자가 만든 세계를 따라', description: '창작자의 캐릭터와 소설, 장면 이미지를 한곳에서 살펴보고 작품 상세로 이동합니다.' },
  { id: 'novel', group: 'explore', label: '소설 회차 읽기', icon: 'cards', title: '캐릭터를 만났다면, 이야기를 읽을 시간', description: '회차를 고르거나 이전·다음 화로 이동하며 원고를 읽습니다. 같은 세계관의 캐릭터와 장면 콘텐츠도 이어서 확인할 수 있습니다.' },
  { id: 'board', label: '제작 보드', icon: 'board', title: '아이디어부터 완성까지, 한눈에', description: '콘텐츠를 제작 단계별로 정리하고, 이야기와 출연 캐릭터를 하나의 기획에 연결합니다.' },
  { id: 'characters', label: '캐릭터 시트', icon: 'people', title: '다음 장면에서도, 같은 캐릭터', description: '사진이나 새로운 설정에서 시작해 AI와 캐릭터를 만들고, 시트와 프롬프트 템플릿을 관리합니다.' },
  { id: 'scenarios', label: '시나리오 · 영상 스타일', icon: 'cards', title: '한 줄의 구상을 이어지는 이야기로', description: '전체 플롯, 회차별 플롯, 상세 원고를 순서대로 작성합니다. 회차별 분량과 이야기 기억도 함께 관리합니다.' },
  { id: 'trends', label: '트렌드 탐색', icon: 'radar', title: '새로운 이야기의 출발점', description: '여러 채널의 트렌드와 관심 주제를 살펴보고, 다음 콘텐츠에 활용할 소재를 발견합니다.' },
  { id: 'media', label: '이미지 · 영상 제작', icon: 'image', title: '상상한 장면을 눈앞에', description: '이미지와 영상의 생성 설정을 조정하고, 작업 결과를 갤러리와 노드 작업실에서 이어갑니다.' },
  { id: 'cuts', label: 'ShortGPT · 컷 편집', icon: 'film', title: '장면의 흐름을 다듬는 시간', description: '컷별 내레이션, 화면 연출, 길이를 편집하고 AI와 대화하면서 장면 구성을 수정합니다.' },
  { id: 'membership', group: 'membership', label: '멤버십 구성', icon: 'cards', title: 'Free부터 Creator, Pro까지', description: '작업 방식에 맞는 멤버십 구성안을 비교합니다. Creator·Pro 가격은 출시 예정이며, 정확한 이용 한도는 정식 출시 시 안내합니다.' },
  { id: 'checkout', group: 'membership', label: '결제 미리보기', icon: 'check', title: '구독 전에, 결제 흐름을 미리 확인', description: '선택한 등급과 월간·연간 주기, 결제 수단을 확인하고 완료 화면까지 살펴봅니다. 결제 정보를 수집하거나 실제 청구·구독 신청을 진행하지 않습니다.' },
];

const livePaths = { explore: '/', creators: '/creators/moon-writer', novel: '/explore/moon-post-office', board: '/board', characters: '/characters', scenarios: '/scenarios', trends: '/trends', media: '/ima2', cuts: '/shortgpt', membership: '/membership', checkout: '/checkout' };

export function ProductShowcase({ productName, serviceUrl }) {
  const [selected, setSelected] = useState(0);
  const screen = screens[selected];
  const activeGroup = screen.group || 'create';
  const source = `/screenshots/${screen.id}.jpg?v=20261008-explore-membership`;

  return <section className="company-showcase" aria-labelledby="showcase-title">
    <div className="company-showcase-heading">
      <div><p className="eyebrow">INSIDE THE STUDIO</p><h3 id="showcase-title">발견부터 제작까지, 화면으로 만나보세요</h3></div>
      <p>작품 탐색·제작·멤버십의 실제 화면을 살펴보세요.</p>
    </div>
    <div className="company-screen-groups" role="group" aria-label="제품 사용 흐름 선택">{groups.map(group => <button key={group.id} type="button" aria-pressed={activeGroup === group.id} aria-controls="company-screen-options" onClick={() => setSelected(screens.findIndex(item => (item.group || 'create') === group.id))}>{group.label}</button>)}</div>
    <div id="company-screen-options" className="company-screen-picker" role="group" aria-label="제품 화면 선택">
      {screens.map((item, index) => (item.group || 'create') === activeGroup && <button key={item.id} type="button" aria-pressed={selected === index} aria-controls="company-screen" onClick={() => setSelected(index)}><Icon name={item.icon}/>{item.label}</button>)}
    </div>
    <figure id="company-screen" className="company-screen">
      <div className="company-screen-bar"><span><i/><i/><i/></span><span>{productName}</span><span>{String(selected + 1).padStart(2, '0')} / {String(screens.length).padStart(2, '0')}</span></div>
      <a className="company-screen-image" href={source} target="_blank" rel="noopener noreferrer" aria-label={`${screen.label} 화면 원본 크게 보기 (새 탭)`}>
        <img key={screen.id} src={source} width="1474" height="795" loading="lazy" alt={`${productName} ${screen.label} 탭의 실제 화면 — ${screen.title}`}/>
      </a>
      <figcaption>
        <div aria-live="polite"><h4>{screen.title}</h4><p>{screen.description}</p></div>
        <a href={`${serviceUrl}${livePaths[screen.id]}`}>{screen.label} 직접 열어보기 <Icon name="arrow"/></a>
      </figcaption>
    </figure>
    <p className="company-screen-note">2026년 10월 8일 촬영한 기능 화면 기록입니다. 촬영 당시 제품명과 메뉴가 포함되어 있으며, 최신 UI는 각 화면의 “직접 열어보기”에서 확인할 수 있습니다. 멤버십·결제는 출시 전 미리보기입니다.</p>
  </section>;
}
