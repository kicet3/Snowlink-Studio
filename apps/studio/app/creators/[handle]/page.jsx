export const dynamic = 'force-dynamic';
import { pageMetadata } from '../../_lib/seo';
import Image from 'next/image';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getCreator } from '../../_lib/showcase';
import { WorkGallery } from '../../_components/Explore';

export async function generateMetadata({ params }) {
  const { handle } = await params;
  const creator = getCreator(handle);
  if (!creator) notFound();
  return pageMetadata({ path: `/creators/${encodeURIComponent(handle)}`, title: `${creator.name}의 작품 · Snowlink Team Studio`, description: `${creator.bio} 캐릭터·소설·장면 이미지를 함께 살펴보세요.`, image: creator.image, imageAlt: `${creator.name}의 대표 작품` });
}

export default async function Page({ params }) {
  const { handle } = await params;
  const creator = getCreator(handle);
  if (!creator) notFound();
  return <div className="studio-page creator-page"><Link className="checkout-back" href="/">← 작품 둘러보기</Link><header className="creator-profile"><Image src={creator.image} alt={`${creator.name}의 대표 작품`} width={180} height={180}/><div><p className="eyebrow">CREATOR</p><h1>{creator.name}</h1><p className="creator-tagline">{creator.tagline}</p><p>{creator.bio}</p></div></header><WorkGallery creatorId={creator.id}/></div>;
}
