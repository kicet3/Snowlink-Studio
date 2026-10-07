import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { Client, StreamableHTTPClientTransport } from '@modelcontextprotocol/client';
import { StdioClientTransport } from '@modelcontextprotocol/client/stdio';
import { hashPassword, verifyPassword } from '../server/auth.mjs';
import { studioFixture, TEST_PASSWORD, PNG } from './helpers/studio-fixture.mjs';
import { oauthGrant } from './helpers/oauth-client.mjs';

test('passwords append a unique per-user salt, use scrypt, and verify without exposing plaintext', async () => {
  const a = await hashPassword(TEST_PASSWORD), b = await hashPassword(TEST_PASSWORD);
  assert.equal(a.algorithm, 'scrypt'); assert.notEqual(a.salt, b.salt); assert.notEqual(a.hash, b.hash);
  assert.equal(await verifyPassword(TEST_PASSWORD, a), true); assert.equal(await verifyPassword('wrong-password', a), false);
  assert.ok(!JSON.stringify(a).includes(TEST_PASSWORD));
});
test('accounts isolate records, uploads, story graphs and MCP tokens; password rotation and logout invalidate sessions', async () => {
  const f = await studioFixture();
  const req = async (path, cookie, method = 'GET', body) => fetch(f.base + path, { method, headers: { ...(cookie ? { Cookie: cookie } : {}), ...(body ? { 'Content-Type': 'application/json' } : {}) }, body: body ? JSON.stringify(body) : undefined });
  try {
    for (const path of ['/api/workspace', '/api/export', '/integrations/ima2/api/history', '/media/example.png']) assert.equal((await req(path)).status, 401);
    const register = await req('/api/auth/register', null, 'POST', { username: 'alice', name: '앨리스', password: TEST_PASSWORD, role: 'admin' });
    assert.equal(register.status, 201); const alice = await register.json(); assert.equal(alice.user.role, 'member'); assert.ok(!JSON.stringify(alice).includes('salt'));
    const cookie = register.headers.get('set-cookie').split(';')[0]; assert.match(register.headers.get('set-cookie'), /HttpOnly/); assert.match(register.headers.get('set-cookie'), /SameSite=Lax/);
    const admin = await f.login();
    const lan = await req('/integrations/ima2/api/auth/lan/session', cookie);
    assert.equal(lan.status, 200); assert.equal((await lan.json()).authenticated, true);
    assert.equal((await req('/integrations/ima2/api/auth/lan/session')).status, 401);
    const image = await (await req('/api/media', cookie, 'POST', { data: 'data:image/png;base64,' + PNG.toString('base64') })).json();
    const character = await (await req('/api/characters', cookie, 'POST', { name: '앨리스만의 캐릭터', image: image.image })).json();
    assert.equal((await req(image.image, admin)).status, 404); assert.equal((await req(image.image, cookie)).status, 200);
    assert.equal((await (await req('/api/workspace', admin)).json()).characters.length, 0);
    assert.equal((await (await req('/api/workspace', cookie)).json()).characters[0].id, character.id);
    const tokenA = await (await req('/api/mcp/token', cookie, 'POST', {})).json(); const tokenB = await (await req('/api/mcp/token', admin, 'POST', {})).json(); assert.notEqual(tokenA.token, tokenB.token);
    const execute = async token => fetch(f.base + '/api/mcp/execute', { method: 'POST', headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' }, body: JSON.stringify({ name: 'studio_workspace', arguments: {} }) });
    assert.equal((await (await execute(tokenA.token)).json()).characters.length, 1); assert.equal((await (await execute(tokenB.token)).json()).characters.length, 0);
    assert.equal((await execute('invalid')).status, 401);
    assert.equal((await req('/integrations/ima2/api/auth/switch', cookie, 'POST', { provider: 'codex' })).status, 403);
    const oldSession = await f.login('alice');
    assert.equal((await req('/api/auth/password', cookie, 'POST', { currentPassword: TEST_PASSWORD, password: 'replacement-password-123!' })).status, 200);
    assert.equal((await req('/api/workspace', oldSession)).status, 401); assert.equal((await req('/api/workspace', cookie)).status, 401);
    const nextCookie = await f.login('alice', 'replacement-password-123!'); await req('/api/auth/logout', nextCookie, 'POST', {}); assert.equal((await req('/api/workspace', nextCookie)).status, 401);
    const stored = readFileSync(join(f.dataDir, 'accounts.json'), 'utf8'); assert.ok(!stored.includes(TEST_PASSWORD)); assert.ok(!stored.includes(cookie.split('=')[1]));
    const foreign = await fetch(f.base + '/api/auth/register', { method: 'POST', headers: { 'Content-Type': 'application/json', Origin: 'https://attacker.invalid' }, body: JSON.stringify({ username: 'hacker', password: TEST_PASSWORD }) }); assert.equal(foreign.status, 403);
  } finally { await f.close(); }
});

test('official MCP SDK negotiates HTTP and stdio, exposes schemas, and mutates the same authenticated workspace', async () => {
  const f = await studioFixture(); const cookie = await f.login();
  const token = await (await fetch(f.base + '/api/mcp/token', { method: 'POST', headers: { Cookie: cookie, 'Content-Type': 'application/json' }, body: '{}' })).json();
  const client = new Client({ name: 'test-client', version: '1.0.0' }, { versionNegotiation: { mode: 'auto' } });
  let stdio;
  try {
    assert.equal((await fetch(f.base + '/mcp', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{}' })).status, 401);
    const oauth = await oauthGrant(f.base, cookie);
    await client.connect(new StreamableHTTPClientTransport(new URL(f.base + '/mcp'), { requestInit: { headers: { Authorization: `Bearer ${oauth.tokens.access_token}` } } }));
    const tools = await client.listTools(); assert.ok(tools.tools.some(t => t.name === 'studio_graph_run')); assert.ok(tools.tools.some(t => t.name === 'studio_story_context'));
    const created = await client.callTool({ name: 'studio_scenario', arguments: { operation: 'create', values: { title: 'MCP 이야기', premise: '노드로 이어지는 이야기', episodeCount: 2, minChars: 100, maxChars: 500 } } });
    assert.ok(!created.isError, JSON.stringify(created)); assert.equal(created.structuredContent.title, 'MCP 이야기');
    const resources = await client.listResources(); assert.equal(resources.resources[0].uri, 'snowfall://workflow');
    const invalid = await client.callTool({ name: 'studio_story_write', arguments: { id: created.structuredContent.id, revision: 999, stage: 'overall', plot: '오래된 버전' } }); assert.equal(invalid.isError, true);
    stdio = new Client({ name: 'stdio-test', version: '1.0.0' }, { versionNegotiation: { mode: 'auto' } });
    await stdio.connect(new StdioClientTransport({ command: process.execPath, args: [join(process.cwd(), 'scripts/mcp-stdio.mjs')], env: { PATH: process.env.PATH, SNOWFALL_STUDIO_URL: f.base, SNOWFALL_DATA_DIR: f.dataDir }, stderr: 'pipe' }));
    const listed = await stdio.callTool({ name: 'studio_scenario', arguments: { operation: 'list' } }); assert.equal(listed.structuredContent.scenarios[0].title, 'MCP 이야기');
  } finally { await stdio?.close(); await client.close(); await f.close(); }
});

test('native node graph saves forward If-Match, generate exactly once, preserve parent image intent, and reject other accounts', async () => {
  const f = await studioFixture(); const cookie = await f.login();
  const act = async (name, args, account = cookie) => { const response = await fetch(f.base + '/api/studio/actions', { method: 'POST', headers: { Cookie: account, 'Content-Type': 'application/json' }, body: JSON.stringify({ name, arguments: args }) }); return { status: response.status, result: await response.json() }; };
  try {
    const { result: graph } = await act('studio_graph_save', { title: '두 노드', nodes: [{ id: 'first-image', kind: 'image', prompt: '푸른 문 앞의 서아', templateId: 'animation' }, { id: 'first-video', kind: 'video', prompt: '문을 천천히 연다.', templateId: 'animation' }], edges: [{ source: 'first-image', target: 'first-video' }] });
    assert.equal(graph.graphVersion, 1); assert.equal(f.captured.graphWrites[0], '0');
    assert.deepEqual(graph.edges[0].data, { sourceHandle: 'right', targetHandle: 'left' });
    const tooEarly = await act('studio_graph_run', { sessionId: graph.id, nodeId: 'first-video', graphVersion: 1, idempotencyKey: 'early-video' }); assert.equal(tooEarly.status, 409);
    const input = { sessionId: graph.id, nodeId: 'first-image', graphVersion: 1, idempotencyKey: 'same-image-request' };
    const responses = await Promise.all([act('studio_graph_run', input), act('studio_graph_run', input)]); assert.equal(responses[0].result.id, responses[1].result.id); assert.equal(f.captured.generations.length, 1);
    const moved = structuredClone(graph.nodes); moved[0].x = 650;
    const autosave = await fetch(f.base + `/integrations/ima2/api/sessions/${graph.id}/graph`, { method: 'PUT', headers: { Cookie: cookie, 'Content-Type': 'application/json', 'If-Match': '1' }, body: JSON.stringify({ nodes: moved, edges: graph.edges }) });
    assert.equal(autosave.status, 200);
    await new Promise(r => setTimeout(r, 80)); const result = await act('studio_job', { id: responses[0].result.id }); assert.equal(result.result.status, 'done'); assert.equal(result.result.attached, true);
    let loaded = (await act('studio_graphs', { sessionId: graph.id })).result; assert.equal(loaded.nodes[0].data.status, 'ready'); assert.equal(loaded.nodes[0].x, 650);
    const registrations = await Promise.all([0, 1].map(() => act('studio_character_register', { jobId: result.result.id, profile: { name: '서아', description: '문 앞의 주인공' } })));
    assert.equal(registrations[0].status, 200); assert.equal(registrations[0].result.id, registrations[1].result.id);
    assert.equal((await act('studio_workspace', {})).result.characters.length, 1);
    const nativeSave = await fetch(f.base + `/integrations/ima2/api/sessions/${graph.id}/graph`, { method: 'PUT', headers: { Cookie: cookie, 'Content-Type': 'application/json', 'If-Match': String(loaded.graphVersion) }, body: JSON.stringify({ nodes: loaded.nodes, edges: loaded.edges }) });
    assert.equal(nativeSave.status, 200); assert.equal(f.captured.graphWrites.at(-1), String(loaded.graphVersion));
    loaded = (await act('studio_graphs', { sessionId: graph.id })).result;
    const video = await act('studio_graph_run', { sessionId: graph.id, nodeId: 'first-video', graphVersion: loaded.graphVersion, idempotencyKey: 'video-from-parent' }); assert.equal(video.status, 200);
    assert.equal(f.captured.generations[1].path, '/api/video/generate'); assert.equal(f.captured.generations[1].mode, 'image-to-video'); assert.ok(f.captured.generations[1].sourceFilename); assert.ok(!f.captured.generations[1].referenceImages);
    const editedNodes = structuredClone(loaded.nodes); editedNodes[1].data.prompt = '다른 장면으로 수정';
    const edit = await fetch(f.base + `/integrations/ima2/api/sessions/${graph.id}/graph`, { method: 'PUT', headers: { Cookie: cookie, 'Content-Type': 'application/json', 'If-Match': String(loaded.graphVersion) }, body: JSON.stringify({ nodes: editedNodes, edges: loaded.edges }) });
    assert.equal(edit.status, 200); await new Promise(r => setTimeout(r, 80));
    const staleResult = await act('studio_job', { id: video.result.id });
    assert.equal(staleResult.result.status, 'done'); assert.equal(staleResult.result.attached, false);
    assert.equal((await act('studio_graphs', { sessionId: graph.id })).result.nodes[1].data.prompt, '다른 장면으로 수정');
    const signup = await fetch(f.base + '/api/auth/register', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ username: 'member', password: TEST_PASSWORD }) }); const member = signup.headers.get('set-cookie').split(';')[0];
    assert.equal((await act('studio_graphs', { sessionId: graph.id }, member)).status, 404);
    assert.equal((await act('studio_graphs', {}, member)).result.sessions.length, 0);
    assert.equal((await fetch(f.base + '/integrations/ima2' + result.result.result.url, { headers: { Cookie: member } })).status, 404);
    assert.equal((await act('studio_graph_save', { title: 'cycle', nodes: [{ id: 'a', kind: 'image', prompt: 'a' }, { id: 'b', kind: 'image', prompt: 'b' }], edges: [{ source: 'a', target: 'b' }, { source: 'b', target: 'a' }] })).status, 400);
  } finally { await f.close(); }
});
