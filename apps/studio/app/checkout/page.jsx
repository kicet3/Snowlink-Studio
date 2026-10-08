export const dynamic = 'force-dynamic';
import { pageMetadata } from '../_lib/seo';
import { redirect } from 'next/navigation';
import { Checkout } from '../_components/Checkout';
import { BILLING_CYCLES, getPaidPlan } from '../_lib/membership';

export const metadata = pageMetadata({ path: '/checkout', title: '결제 미리보기 · Snowlink Studio', description: '멤버십과 결제 주기, 결제 수단을 살펴보는 출시 전 미리보기입니다. 실제 청구나 구독 신청은 발생하지 않습니다.' });

export default async function Page({ searchParams }) {
  const params = await searchParams;
  const plan = getPaidPlan(params.plan || 'creator');
  if (!plan) redirect('/membership');
  const cycle = BILLING_CYCLES.some(item => item.id === params.cycle) ? params.cycle : 'monthly';
  return <Checkout key={`${plan.id}-${cycle}`} plan={plan} initialCycle={cycle}/>;
}
