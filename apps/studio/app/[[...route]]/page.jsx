import { notFound } from 'next/navigation';

export default async function WorkspacePage({ params }) {
  const { route = [] } = await params;
  const allowed = ['board', 'characters', 'scenarios', 'trends', 'ima2', 'shortgpt', 'settings', 'oauth'];
  if (route.length && !allowed.includes(route[0])) notFound();
  return null;
}
