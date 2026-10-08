import { redirect } from 'next/navigation';
import { Checkout } from '../_components/Checkout';
import { BILLING_CYCLES, getPaidPlan } from '../_lib/membership';

export const metadata = { title: '결제 미리보기 · Snowlink Studio' };

export default async function Page({ searchParams }) {
  const params = await searchParams;
  const plan = getPaidPlan(params.plan || 'creator');
  if (!plan) redirect('/membership');
  const cycle = BILLING_CYCLES.some(item => item.id === params.cycle) ? params.cycle : 'monthly';
  return <Checkout key={`${plan.id}-${cycle}`} plan={plan} initialCycle={cycle}/>;
}
