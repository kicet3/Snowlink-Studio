import Image from 'next/image';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getCreator } from '../../_lib/showcase';
import { ShowcaseNotice, WorkGallery } from '../../_components/Explore';

export async function generateMetadata({ params }) {
  const { handle } = await params;
  return { title: `${getCreator(handle)?.name || '창작자'}의 작품 · Snowlink Studio` };
}

export default async function Page({ params }) {
  const { handle } = await params;
  const creator = getCreator(handle);
  if (!creator) notFound();
  return <div className="studio-page creator-page"><Link className="checkout-back" href="/">← 작품 둘러보기</Link><ShowcaseNotice/><header className="creator-profile"><Image src={creator.image} alt={`${creator.name}의 대표 작품`} width={180} height={180}/><div><p className="eyebrow">CREATOR / SAMPLE PROFILE</p><h1>{creator.name}</h1><p className="creator-tagline">{creator.tagline}</p><p>{creator.bio}</p></div></header><WorkGallery creatorId={creator.id}/></div>;
}
