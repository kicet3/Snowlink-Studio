'use client';

import { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { Icon } from './Icon';
import { Button } from './Primitives';
import { filterWorks, getCreator, showcaseCreators, showcaseWorks, WORK_KINDS } from '../_lib/showcase';

export function ShowcaseNotice() {
  return <p className="showcase-notice"><span>SHOWCASE PREVIEW</span>가상 창작자와 AI 생성 이미지로 구성한 목업입니다. 실제 사용자 게시물이 아닙니다.</p>;
}

export function WorkCard({ work }) {
  const creator = getCreator(work.creatorId);
  return <article className={`work-card work-card-${work.kind}`}>
    <Link className="work-card-image" href={`/explore/${work.id}`} aria-label={`${work.title} ${WORK_KINDS[work.kind]} 보기`}><Image src={work.image} alt={work.imageAlt} width={1536} height={1024} sizes="(max-width: 760px) 100vw, (max-width: 1100px) 45vw, 30vw"/><span className="work-kind">{WORK_KINDS[work.kind]}</span>{work.chapters && <span className="work-chapter-count">{work.chapters.length}화 미리보기</span>}</Link>
    <div className="work-card-meta"><Link className="work-creator" href={`/creators/${creator.id}`}><span>{creator.initial}</span>{creator.name}</Link><span>{work.tags[0]}</span></div>
    <h3><Link href={`/explore/${work.id}`}>{work.title}</Link></h3><p>{work.summary}</p>
  </article>;
}

export function WorkGallery({ creatorId = '' }) {
  const [kind, setKind] = useState('all'), [query, setQuery] = useState(''), [sort, setSort] = useState('recent');
  const works = filterWorks(showcaseWorks, { kind, query, sort, creatorId });
  return <section className="explore-gallery" aria-labelledby="explore-works-title">
    <div className="explore-section-heading"><div><p className="eyebrow">DISCOVER YOUR NEXT STORY</p><h2 id="explore-works-title">{creatorId ? '창작자의 작품' : '새로운 세계를 만나보세요.'}</h2></div><span aria-live="polite">{works.length}개의 목업 작품</span></div>
    <div className="explore-toolbar"><div className="explore-filters" role="group" aria-label="작품 종류">{[['all', '전체'], ...Object.entries(WORK_KINDS)].map(([value, label]) => <button key={value} type="button" aria-pressed={kind === value} onClick={() => setKind(value)}>{label}</button>)}</div><div className="explore-search"><label><Icon name="search"/><span className="sr-only">작품·캐릭터·창작자 검색</span><input type="search" value={query} onChange={event => setQuery(event.target.value)} placeholder="작품, 캐릭터, 창작자 검색"/></label><label><span className="sr-only">작품 정렬</span><select value={sort} onChange={event => setSort(event.target.value)}><option value="recent">최신순</option><option value="title">제목순</option></select></label></div></div>
    {works.length ? <div className="explore-grid">{works.map(work => <WorkCard key={work.id} work={work}/>)}</div> : <div className="explore-empty"><Icon name="search"/><h3>아직 일치하는 작품이 없어요.</h3><p>다른 검색어나 작품 종류로 찾아보세요.</p><Button variant="secondary" onClick={() => { setQuery(''); setKind('all'); }}>전체 작품 보기</Button></div>}
  </section>;
}

export function Explore() {
  return <div className="studio-page explore-page">
    <div className="explore-page-heading"><div><p className="eyebrow">SNOWLINK STUDIO / EXPLORE</p><h1>이야기가 시작되는 곳<span>.</span></h1><p>캐릭터를 만나고, 이야기를 읽고, 다음 장면을 발견하세요.</p><Link className="explore-guide-link" href="/guide">AI 캐릭터·소설·영상 제작 사용 가이드 →</Link></div><Link className="button secondary" href="/board">내 작업실 열기<Icon name="arrow"/></Link></div>
    <ShowcaseNotice/>
    <section className="explore-hero" aria-labelledby="featured-title"><Image src="/showcase/moon-post.png" alt="커다란 달 아래 언덕 도시의 지붕을 걷는 우편배달부 서린" fill sizes="(max-width: 760px) 100vw, 85vw" priority/><div className="explore-hero-shade"/><div className="explore-hero-copy"><p className="eyebrow">FEATURED STORY / 01</p><span className="explore-hero-tag">판타지 · 미스터리</span><h2 id="featured-title">잊힌 기억에도<br/>도착할 주소가 있다.</h2><p>수신인 없는 편지 한 통.<br/>서린의 마지막 배달이 시작됩니다.</p><Link className="button primary" href="/explore/moon-post-office">월광우체국 읽기<Icon name="arrow"/></Link><Link className="explore-featured-author" href="/creators/moon-writer">서월의 세계관 ↗</Link></div><span className="explore-hero-index">CHARACTER → STORY → SCENE</span></section>
    <WorkGallery/>
    <section className="explore-creators" aria-labelledby="explore-creators-title"><div className="explore-section-heading"><div><p className="eyebrow">MEET THE CREATORS</p><h2 id="explore-creators-title">서로 다른 상상의 주인들</h2></div><span>예시 창작자</span></div><div>{showcaseCreators.map(creator => <Link key={creator.id} href={`/creators/${creator.id}`}><Image src={creator.image} alt={`${creator.name}의 대표 작품`} width={100} height={100}/><div><h3>{creator.name}</h3><p>{creator.tagline}</p></div><Icon name="arrow"/></Link>)}</div></section>
    <section className="explore-cta"><div><p className="eyebrow">YOUR STORY IS NEXT</p><h2>이제, 당신의 이야기를 시작해 보세요.</h2><p>캐릭터에서 이야기로, 이야기에서 장면으로.</p></div><Link className="button primary" href="/board">창작 시작하기<Icon name="arrow"/></Link></section>
  </div>;
}
