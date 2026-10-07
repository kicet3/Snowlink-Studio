'use client';

import { useState } from 'react';
import { Icon } from './Icon';

const screens = [
  { id: 'board', label: '제작 보드', icon: 'board', title: '아이디어부터 완성까지, 한눈에', description: '콘텐츠를 제작 단계별로 정리하고, 이야기와 출연 캐릭터를 하나의 기획에 연결합니다.' },
  { id: 'characters', label: '캐릭터 시트', icon: 'people', title: '다음 장면에서도, 같은 캐릭터', description: '사진이나 새로운 설정에서 시작해 AI와 캐릭터를 만들고, 시트와 프롬프트 템플릿을 관리합니다.' },
  { id: 'scenarios', label: '시나리오 · 영상 스타일', icon: 'cards', title: '한 줄의 구상을 이어지는 이야기로', description: '전체 플롯, 회차별 플롯, 상세 원고를 순서대로 작성합니다. 회차별 분량과 이야기 기억도 함께 관리합니다.' },
  { id: 'trends', label: '트렌드 탐색', icon: 'radar', title: '새로운 이야기의 출발점', description: '여러 채널의 트렌드와 관심 주제를 살펴보고, 다음 콘텐츠에 활용할 소재를 발견합니다.' },
  { id: 'media', label: '이미지 · 영상 제작', icon: 'image', title: '상상한 장면을 눈앞에', description: '이미지와 영상의 생성 설정을 조정하고, 작업 결과를 갤러리와 노드 작업실에서 이어갑니다.' },
  { id: 'cuts', label: 'ShortGPT · 컷 편집', icon: 'film', title: '장면의 흐름을 다듬는 시간', description: '컷별 내레이션, 화면 연출, 길이를 편집하고 AI와 대화하면서 장면 구성을 수정합니다.' },
];

export function ProductShowcase() {
  const [selected, setSelected] = useState(0);
  const screen = screens[selected];
  const source = `/screenshots/${screen.id}.jpg`;

  return <section className="company-showcase" aria-labelledby="showcase-title">
    <div className="company-showcase-heading">
      <div><p className="eyebrow">INSIDE THE STUDIO</p><h3 id="showcase-title">작업실을 둘러보세요</h3></div>
      <p>탭을 선택하면 실제 제품 화면을 볼 수 있습니다.</p>
    </div>
    <div className="company-screen-picker" role="group" aria-label="제품 화면 선택">
      {screens.map((item, index) => <button key={item.id} type="button" aria-pressed={selected === index} aria-controls="company-screen" onClick={() => setSelected(index)}><Icon name={item.icon}/>{item.label}</button>)}
    </div>
    <figure id="company-screen" className="company-screen">
      <div className="company-screen-bar"><span><i/><i/><i/></span><span>snowlink-studio</span><span>{String(selected + 1).padStart(2, '0')} / {String(screens.length).padStart(2, '0')}</span></div>
      <a className="company-screen-image" href={source} target="_blank" rel="noopener noreferrer" aria-label={`${screen.label} 화면 원본 크게 보기 (새 탭)`}>
        <img key={screen.id} src={source} width="1474" height="829" loading="lazy" alt={`snowlink-studio ${screen.label} 탭의 실제 화면 — ${screen.title}`}/>
      </a>
      <figcaption>
        <div aria-live="polite"><h4>{screen.title}</h4><p>{screen.description}</p></div>
        <a href={source} target="_blank" rel="noopener noreferrer">원본 크게 보기 <Icon name="external"/><span className="sr-only"> (새 탭)</span></a>
      </figcaption>
    </figure>
    <p className="company-screen-note">소개용 예시 데이터로 구성한 실제 서비스 화면입니다. 연결 상태와 콘텐츠는 계정에 따라 달라집니다.</p>
  </section>;
}
