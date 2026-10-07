import test from 'node:test';
import assert from 'node:assert/strict';
import { loginDestination } from '../app/_lib/login-destination.js';

test('login returns to protected pages or the original consent request without external redirects', () => {
  for (const path of ['/settings', '/profile', '/mcp', '/board', '/oauth/' + 'a'.repeat(43)]) assert.equal(loginDestination(path), path);
  for (const path of ['https://attacker.invalid', '//attacker.invalid', '/\\attacker.invalid', '/oauth/short', '/settings?next=https://attacker.invalid', null, '']) assert.equal(loginDestination(path), '/mcp');
});
