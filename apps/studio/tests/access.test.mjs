import test from 'node:test';
import assert from 'node:assert/strict';
import { bypassPageAuth, hasAccountSession, isPublicBrowsePage } from '../app/_lib/access.js';

test('only published work browsing is public; creation, chat and account pages remain protected', () => {
  for (const path of ['/', '/explore', '/explore/moon-post-office', '/explore/character-seorin', '/creators/moon-writer']) {
    assert.equal(isPublicBrowsePage(path), true, path);
    assert.equal(bypassPageAuth(path), true, path);
  }
  for (const path of ['/chat', '/chat/extra', '/board', '/characters', '/scenarios', '/trends', '/ima2', '/ima2/graph/session', '/shortgpt', '/guide', '/membership', '/checkout', '/mcp', '/settings', '/profile', '/oauth/'+'a'.repeat(43), '/explore/character-seorin/edit', '/creators/moon-writer/settings', '/explore-other']) {
    assert.equal(isPublicBrowsePage(path), false, path);
    assert.equal(bypassPageAuth(path), false, path);
  }
  for (const path of ['/login', '/api/auth/login', '/api/google/oauth/callback', '/media/example.png', '/generated/example.png', '/integrations/ima2/api/history', '/logo.svg', '/studio-media/fonts/Satoshi-400.woff2', '/llms.txt']) assert.equal(bypassPageAuth(path), true, path);
  for (const path of ['/login-other', '/api-other', '/showcase-other', '/studio-media/private']) assert.equal(bypassPageAuth(path), false, path);
});

test('page auth validates the actual server session and fails closed for guests, revoked sessions and outages', async () => {
  const token='a'.repeat(43), origin='https://api.snowlink.team';
  let calls=0;
  const session = user => async (url, options) => {
    calls++; assert.equal(url.href, origin+'/api/auth/session'); assert.equal(options.headers.Cookie, 'snowfall_session='+token); assert.equal(options.cache,'no-store'); assert.equal(options.redirect,'error');
    return Response.json({user});
  };
  for (const invalid of [undefined, '', 'fake', 'a'.repeat(43)+'; other=1']) assert.equal(await hasAccountSession(invalid,origin,session({id:'member',role:'member'})),false);
  assert.equal(calls,0);
  for (const role of ['member','admin']) assert.equal(await hasAccountSession(token,origin,session({id:role,role})),true);
  for (const user of [null, {}, {id:'visitor',role:'guest'}, {role:'member'}]) assert.equal(await hasAccountSession(token,origin,session(user)),false);
  assert.equal(await hasAccountSession(token,origin,async()=>new Response('unavailable',{status:503})),false);
  assert.equal(await hasAccountSession(token,origin,async()=>new Response('<html>')),false);
  assert.equal(await hasAccountSession(token,origin,async()=>{throw new Error('offline');}),false);
});
