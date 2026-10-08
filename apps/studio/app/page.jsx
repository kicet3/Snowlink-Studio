// Public content is independent of account state; user state hydrates in the client.
export const dynamic = 'force-static';
import { Explore } from './_components/Explore';
import { JsonLd } from './_components/JsonLd';
import { publicMetadata, publicStructuredData } from './_lib/seo';
export const metadata = publicMetadata('/');
export default function Page() { return <><JsonLd data={publicStructuredData('/', { type: 'CollectionPage' })}/><Explore/></>; }
