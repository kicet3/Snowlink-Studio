export function loginDestination(value) {
  return ['/', '/board', '/mcp', '/settings', '/profile'].includes(value) || /^\/oauth\/[A-Za-z0-9_-]{43}$/.test(value || '') ? value : '/mcp';
}
