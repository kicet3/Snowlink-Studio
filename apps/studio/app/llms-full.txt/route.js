import { publicText } from '../_lib/public-text';
export const dynamic = 'force-static';
export function GET() { return new Response(publicText({ full: true }), { headers: { 'Content-Type': 'text/plain; charset=utf-8' } }); }
