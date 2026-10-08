// Public content is independent of account state; user state hydrates in the client.
export const dynamic = 'force-static';
import { McpGuide } from '../_components/McpGuide';
import { JsonLd } from '../_components/JsonLd';
import { publicMetadata, publicStructuredData } from '../_lib/seo';
export const metadata = publicMetadata('/mcp');
export default function Page() { return <><JsonLd data={publicStructuredData('/mcp')}/><McpGuide/></>; }
