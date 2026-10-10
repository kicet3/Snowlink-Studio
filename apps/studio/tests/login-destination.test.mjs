import test from 'node:test';
import assert from 'node:assert/strict';
import { loginDestination } from '../app/_lib/login-destination.js';

test('login returns to the requested workspace, selected character or MCP consent', () => {
  for (const path of ['/', '/chat', '/scenarios', '/characters', '/settings', '/profile', '/mcp', '/board', '/guide#experience', '/explore/moon-post-office', '/ima2/graph/session-1', '/oauth/'+'a'.repeat(43), '/chat?character=character-seorin&source=public&conversation=chat-1', '/checkout?plan=pro&cycle=yearly']) assert.equal(loginDestination(path),path);
  assert.equal(loginDestination('/chat?character=character-seorin&_rsc=internal&next=https://attacker.invalid'),'/chat?character=character-seorin');
  assert.equal(loginDestination('/settings?next=https://attacker.invalid'),'/settings');
  for (const path of ['https://attacker.invalid', '//attacker.invalid', '/\\attacker.invalid', '/oauth/short', '/login', '/api/export', '/%2f%2fattacker.invalid', null, '']) assert.equal(loginDestination(path),'/');
});
