export function loginDestination(value) {
  if (typeof value !== 'string' || !value.startsWith('/') || value.startsWith('//') || /[\\\s]/.test(value)) return '/';
  const url = new URL(value, 'https://studio.snowlink.team');
  const routes = ['/', '/board', '/chat', '/characters', '/scenarios', '/trends', '/ima2', '/shortgpt', '/explore', '/guide', '/membership', '/checkout', '/mcp', '/settings', '/profile'];
  if (!routes.includes(url.pathname) && !/^\/(?:explore|creators|ima2\/graph)\/[A-Za-z0-9_-]+$/.test(url.pathname) && !/^\/oauth\/[A-Za-z0-9_-]{43}$/.test(url.pathname)) return '/';
  // Carry supported product state, never arbitrary redirect parameters or RSC flags.
  const allowed = url.pathname === '/chat' ? ['character', 'source', 'conversation'] : url.pathname === '/checkout' ? ['plan', 'cycle'] : [];
  for (const key of [...url.searchParams.keys()]) if (!allowed.includes(key)) url.searchParams.delete(key);
  return url.pathname + url.search + url.hash;
}
