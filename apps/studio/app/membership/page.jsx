// Public content is independent of account state; user state hydrates in the client.
export const dynamic = 'force-static';
import { Membership } from '../_components/Membership';
import { JsonLd } from '../_components/JsonLd';
import { publicMetadata, publicStructuredData } from '../_lib/seo';
export const metadata = publicMetadata('/membership');
export default function Page() { return <><JsonLd data={publicStructuredData('/membership')}/><Membership/></>; }
