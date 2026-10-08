import { productText } from '../../lib/seo';

export const dynamic = 'force-static';
export function GET() {
  return new Response(productText(), { headers: { 'Content-Type': 'text/plain; charset=utf-8' } });
}
