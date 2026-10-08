import { CharacterChat } from '../_components/CharacterChat';
import { publicMetadata, publicStructuredData } from '../_lib/seo';

export const dynamic = 'force-dynamic';
export const metadata = publicMetadata('/chat');

export default async function Page({ searchParams }) {
  const params = await searchParams;
  return <><script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(publicStructuredData('/chat')).replace(/</g, '\\u003c') }}/><CharacterChat initialCharacter={typeof params.character === 'string' ? params.character : ''} initialSource={params.source === 'workspace' ? 'workspace' : 'public'} initialConversation={typeof params.conversation === 'string' ? params.conversation : ''}/></>;
}
