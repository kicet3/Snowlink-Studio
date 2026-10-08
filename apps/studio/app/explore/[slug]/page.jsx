export const dynamic = 'force-dynamic';
import { pageMetadata } from '../../_lib/seo';
import Image from 'next/image';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getCreator, getWork, WORK_KINDS } from '../../_lib/showcase';
import { WorkCard } from '../../_components/Explore';
import { NovelReader } from '../../_components/NovelReader';

export async function generateMetadata({ params }) {
  const { slug } = await params;
  const work = getWork(slug);
  if (!work) notFound();
  return pageMetadata({ path: `/explore/${encodeURIComponent(slug)}`, title: `${work.title} · Snowlink Team Studio`, description: work.summary, image: work.image, imageAlt: work.imageAlt });
}

export default async function Page({ params }) {
  const { slug } = await params;
  const work = getWork(slug);
  if (!work) notFound();
  const creator = getCreator(work.creatorId);
  const related = work.relatedIds.map(getWork).filter(Boolean);
  return <div className="studio-page work-detail-page"><Link className="checkout-back" href="/">← 작품 둘러보기</Link>
    <div className="work-detail-heading"><div><p className="eyebrow">{WORK_KINDS[work.kind]}</p><h1>{work.title}</h1><p>{work.summary}</p><div className="work-tags">{work.tags.map(tag => <span key={tag}>{tag}</span>)}</div></div><Link className="work-detail-author" href={`/creators/${creator.id}`}><span className="creator-initial">{creator.initial}</span><span>{creator.name}<small>창작자의 다른 작품 보기 ↗</small></span></Link></div>
    <Image className="work-detail-image" src={work.image} alt={work.imageAlt} width={1536} height={1024} sizes="(max-width: 760px) 100vw, 85vw" priority/>
    {work.chapters && <NovelReader title={work.title} chapters={work.chapters}/>}
    {work.details && <section className="character-profile" aria-labelledby="character-profile-title"><h2 id="character-profile-title">캐릭터 프로필</h2><dl>{work.details.map(detail => <div key={detail.label}><dt>{detail.label}</dt><dd>{detail.value}</dd></div>)}</dl></section>}
    {work.body && <section className="work-creation-note" aria-labelledby="creation-note-title"><p className="eyebrow">BEHIND THE SCENE</p><h2 id="creation-note-title">장면에 담은 이야기</h2>{work.body.split('\n\n').map((paragraph, i) => <p key={i}>{paragraph}</p>)}</section>}
    <section className="work-related" aria-labelledby="related-title"><div className="explore-section-heading"><h2 id="related-title">같은 세계에서 이어지는 작품</h2></div><div className="explore-grid">{related.map(item => <WorkCard key={item.id} work={item}/>)}</div></section>
  </div>;
}
