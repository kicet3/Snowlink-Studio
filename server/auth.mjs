import { mkdirSync, existsSync, readFileSync, writeFileSync, renameSync } from 'node:fs';
import { join } from 'node:path';
import { scrypt, randomBytes, randomUUID, timingSafeEqual, createHash } from 'node:crypto';
import { promisify } from 'node:util';
import { json, readJson } from './http.mjs';

const derive = promisify(scrypt), digest = value => createHash('sha256').update(value).digest('hex');
const bad = (message, status = 400) => Object.assign(new Error(message), { status });
const COST = { N: 32768, r: 8, p: 3, maxmem: 64 * 1024 * 1024 };
const COOKIE = 'snowfall_session', TTL = 7 * 86400000;
const publicUser = user => ({ id: user.id, username: user.username, name: user.name, role: user.role });
const passwordInput = value => { if (typeof value !== 'string' || value.length < 10 || value.length > 128) throw bad('비밀번호는 10~128자로 입력해주세요.'); return value; };
export async function hashPassword(password) {
  passwordInput(password);
  const salt = randomBytes(32).toString('base64url');
  const key = await derive(password + salt, salt, 64, COST);
  return { algorithm: 'scrypt', version: 1, salt, hash: key.toString('base64'), N: COST.N, r: COST.r, p: COST.p };
}
export async function verifyPassword(password, record) {
  if (typeof password !== 'string' || password.length > 128 || !record || record.algorithm !== 'scrypt' || record.version !== 1) return false;
  const key = await derive(password + record.salt, record.salt, 64, { N: record.N, r: record.r, p: record.p, maxmem: COST.maxmem });
  const saved = Buffer.from(record.hash, 'base64');
  return saved.length === key.length && timingSafeEqual(saved, key);
}

export function createAuth(directory, { publicAccess = false } = {}) {
  mkdirSync(directory, { recursive: true, mode: 0o700 });
  const file = join(directory, 'accounts.json');
  let state = existsSync(file) ? JSON.parse(readFileSync(file, 'utf8')) : { version: 1, users: [], sessions: [] };
  if (state.version !== 1 || !Array.isArray(state.users) || !Array.isArray(state.sessions)) throw new Error('회원 저장 형식을 확인해주세요.');
  const attempts = new Map(); let activeHashes = 0;
  const persist = () => { writeFileSync(file + '.tmp', JSON.stringify(state, null, 2), { mode: 0o600 }); renameSync(file + '.tmp', file); };
  const username = input => { if (typeof input !== 'string' || !/^[a-zA-Z0-9][a-zA-Z0-9_.@+-]{2,79}$/.test(input)) throw bad('아이디는 영문·숫자로 시작하는 3~80자이며 _, -, ., @, +를 사용할 수 있습니다.'); return input.toLowerCase(); };
  function token(req) { return String(req.headers.cookie || '').split(';').map(s => s.trim()).find(s => s.startsWith(COOKIE + '='))?.slice(COOKIE.length + 1) || ''; }
  function user(req) {
    const hash = digest(token(req));
    const session = state.sessions.find(s => s.hash === hash && s.expiresAt > Date.now());
    const account = session ? state.users.find(u => u.id === session.userId) : null;
    // Disabling visitor access also rejects sessions issued before the change.
    // Keep their stored work intact; it does not become another account's data.
    return account && (publicAccess || account.role !== 'guest') ? account : null;
  }
  function cookie(req, value, expired = false) {
    const local = /^(127\.0\.0\.1|localhost)(:\d+)?$/.test(req.headers.host || '');
    return `${COOKIE}=${value}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${expired ? 0 : TTL / 1000}${local ? '' : '; Secure'}`;
  }
  function session(req, res, account) {
    const value = randomBytes(32).toString('base64url'), previous = digest(token(req));
    state.sessions = state.sessions.filter(s => s.expiresAt > Date.now() && s.hash !== previous);
    const owned = state.sessions.filter(s => s.userId === account.id);
    if (owned.length >= 10) { const remove = new Set(owned.slice(0, owned.length - 9).map(s => s.hash)); state.sessions = state.sessions.filter(s => !remove.has(s.hash)); }
    state.sessions.push({ hash: digest(value), userId: account.id, expiresAt: Date.now() + TTL }); persist();
    res.setHeader('Set-Cookie', cookie(req, value));
  }
  function rate(req, account) {
    const now = Date.now(); for (const [key, entry] of attempts) if (entry.until <= now) attempts.delete(key);
    for (const key of ['ip:' + req.socket.remoteAddress, 'user:' + account]) {
      const entry = attempts.get(key) || { count: 0, until: now + 15 * 60000 }; entry.count++; attempts.set(key, entry);
      if (entry.count > (key.startsWith('ip:') ? 80 : 12)) throw bad('로그인 시도가 많습니다. 15분 후 다시 시도해주세요.', 429);
    }
    if (activeHashes >= 4) throw bad('로그인 요청이 많습니다. 잠시 후 다시 시도해주세요.', 429);
  }
  async function createUser(input, role = 'member') {
    const login = username(input.username), name = String(input.name || login).trim().slice(0, 80);
    if (state.users.some(u => u.username === login)) throw bad('사용할 수 없는 아이디입니다.', 409);
    const password = await hashPassword(input.password);
    if (state.users.some(u => u.username === login)) throw bad('사용할 수 없는 아이디입니다.', 409);
    const account = { id: randomUUID(), username: login, name, role, password, createdAt: new Date().toISOString() };
    state.users.push(account); persist(); return publicUser(account);
  }
  function dataDirectory(account) { return account.role === 'admin' ? directory : join(directory, 'users', account.id); }
  function bearerUser(req) {
    const value = /^Bearer ([A-Za-z0-9_-]{43})$/.exec(req.headers.authorization || '')?.[1];
    if (!value) return null;
    const supplied = Buffer.from(value);
    return state.users.find(account => {
      if (account.role === 'guest') return false;
      const path = join(dataDirectory(account), 'mcp-token'); if (!existsSync(path)) return false;
      const expected = Buffer.from(readFileSync(path, 'utf8').trim()); return supplied.length === expected.length && timingSafeEqual(supplied, expected);
    }) || null;
  }
  return {
    user, bearerUser, dataDirectory, publicUser,
    hasAdmin: () => state.users.some(u => u.role === 'admin'),
    admin: () => state.users.find(u => u.role === 'admin') || null,
    getUser: id => state.users.find(u => u.id === id) || null,
    sessionBinding: req => digest(token(req)),
    createUser,
    async handle(req, res, url) {
      if (!url.pathname.startsWith('/api/auth/')) return false;
      const account = user(req);
      if (url.pathname === '/api/auth/session' && req.method === 'GET') { json(res, 200, { user: account ? publicUser(account) : null, registration: true, publicAccess }); return true; }
      if (req.method !== 'POST') throw bad('POST 요청이 필요합니다.', 405);
      if (url.pathname === '/api/auth/logout') {
        const hash = digest(token(req)); state.sessions = state.sessions.filter(s => s.hash !== hash); persist(); res.setHeader('Set-Cookie', cookie(req, '', true)); json(res, 200, { ok: true }); return true;
      }
      const input = await readJson(req);
      if (url.pathname === '/api/auth/guest' && publicAccess) {
        if (account) { json(res, 200, { user: publicUser(account) }); return true; }
        const now = Date.now(), key = 'guest:' + req.socket.remoteAddress;
        const entry = attempts.get(key);
        if (entry && entry.until > now && entry.count >= 120) throw bad('작업실 생성 요청이 많습니다. 잠시 후 다시 시도해주세요.', 429);
        attempts.set(key, { count: entry?.until > now ? entry.count + 1 : 1, until: entry?.until > now ? entry.until : now + 60000 });
        const id = randomUUID();
        const guest = { id, username: 'guest-' + id, name: '방문자 작업실', role: 'guest', createdAt: new Date().toISOString() };
        state.users.push(guest); session(req, res, guest);
        json(res, 201, { user: publicUser(guest) }); return true;
      }
      if (url.pathname === '/api/auth/register' || url.pathname === '/api/auth/login') {
        const login = username(input.username); rate(req, login); activeHashes++;
        try {
          if (url.pathname.endsWith('/register')) { if (login === 'admin') throw bad('사용할 수 없는 아이디입니다.', 409); const saved = await createUser(input); const created = state.users.find(u => u.id === saved.id); session(req, res, created); json(res, 201, { user: saved }); }
          else {
            const found = state.users.find(u => u.username === login);
            // A fixed dummy record performs the same KDF for unknown accounts.
            const record = found?.password || { algorithm: 'scrypt', version: 1, salt: 'unknown-account-timing-salt-32-bytes', hash: Buffer.alloc(64).toString('base64'), ...COST };
            const valid = await verifyPassword(input.password, record);
            if (!valid || !found || found.password !== record) throw bad('아이디 또는 비밀번호를 확인해주세요.', 401);
            session(req, res, found); json(res, 200, { user: publicUser(found) });
          }
        } finally { activeHashes--; }
        return true;
      }
      if (url.pathname === '/api/auth/password') {
        if (!account || account.role === 'guest') throw bad('로그인이 필요합니다.', 401);
        rate(req, account.username); activeHashes++;
        try {
          const previous = account.password;
          if (!await verifyPassword(input.currentPassword, previous)) throw bad('현재 비밀번호를 확인해주세요.', 401);
          const password = await hashPassword(input.password);
          if (account.password !== previous) throw bad('비밀번호가 이미 변경됐습니다. 다시 로그인해주세요.', 409);
          account.password = password; state.sessions = state.sessions.filter(s => s.userId !== account.id); session(req, res, account); json(res, 200, { ok: true });
        } finally { activeHashes--; }
        return true;
      }
      throw bad('인증 요청을 찾을 수 없습니다.', 404);
    },
  };
}
