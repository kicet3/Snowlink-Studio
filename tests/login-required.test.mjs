import test from 'node:test';
import assert from 'node:assert/strict';
import { once } from 'node:events';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createAuth } from '../server/auth.mjs';
import { createApp } from '../server/app.mjs';
import { studioFixture } from './helpers/studio-fixture.mjs';

test('turning off public access rejects previously issued guest cookies across API and media without deleting their data', async t => {
  const f=await studioFixture(0,{publicAccess:true}); t.after(()=>f.close());
  const guest=await fetch(f.base+'/api/auth/guest',{method:'POST',headers:{'Content-Type':'application/json'},body:'{}'});
  const guestCookie=guest.headers.get('set-cookie').split(';')[0];
  const guestUser=(await guest.json()).user;
  await fetch(f.base+'/api/characters',{method:'POST',headers:{Cookie:guestCookie,'Content-Type':'application/json'},body:JSON.stringify({name:'preserved visitor character'})});
  const adminCookie=await f.login();
  const before=readFileSync(join(f.dataDir,'accounts.json'),'utf8');
  const auth=createAuth(f.dataDir,{publicAccess:false});
  const allowedOrigins=[];
  const server=createApp({root:fileURLToPath(new URL('../',import.meta.url)),dataDir:f.dataDir,config:{...f.config,publicAccess:false},auth,allowedOrigins,toolUrls:()=>({})});
  server.listen(0,'127.0.0.1'); await once(server,'listening');
  const base=`http://127.0.0.1:${server.address().port}`; allowedOrigins.push(base);
  t.after(()=>{server.closeAllConnections();return new Promise(resolve=>server.close(resolve));});
  const request=(path,cookie,method='GET',body)=>fetch(base+path,{method,headers:{...(cookie?{Cookie:cookie}:{}),...(body?{'Content-Type':'application/json'}:{})},body:body?JSON.stringify(body):undefined});
  for(const cookie of [undefined,'snowfall_session='+'x'.repeat(43),guestCookie]) {
    const session=await (await request('/api/auth/session',cookie)).json();
    assert.equal(session.user,null); assert.equal(session.publicAccess,false);
    for(const path of ['/api/workspace','/api/export','/api/ai/status','/api/google/status','/integrations/ima2/api/history','/media/example.png','/renders/example/storyboard.mp4','/generated/example.png']) assert.equal((await request(path,cookie)).status,401,path);
    for(const path of ['/api/characters','/api/studio/actions','/v1/chat/completions','/integrations/ima2/api/generate']) assert.equal((await request(path,cookie,'POST',{})).status,401,path);
  }
  assert.equal((await request('/api/auth/guest',guestCookie,'POST',{})).status,404);
  assert.equal((await request('/api/workspace',adminCookie)).status,200);
  assert.equal((await (await request('/api/auth/session',adminCookie)).json()).user.role,'admin');
  assert.equal(auth.user({headers:{cookie:guestCookie}}),null);
  assert.equal(auth.getUser(guestUser.id).role,'guest');
  assert.equal(readFileSync(join(f.dataDir,'accounts.json'),'utf8'),before);
  assert.equal(f.captured.chats.length,0); assert.equal(f.captured.generations.length,0);
});
