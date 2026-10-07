import { existsSync, readFileSync, writeFileSync, renameSync } from 'node:fs';
import { join } from 'node:path';

export function createMediaOwnership(directory) {
  const file = join(directory, 'media-ownership.json');
  let state = existsSync(file) ? JSON.parse(readFileSync(file, 'utf8')) : { sessions: {}, requests: {}, files: {}, nodes: {} };
  for (const kind of ['sessions', 'requests', 'files', 'nodes']) state[kind] = Object.assign(Object.create(null), state[kind]);
  const persist = () => { writeFileSync(file + '.tmp', JSON.stringify(state), { mode: 0o600 }); renameSync(file + '.tmp', file); };
  return account => {
    const owns = (kind, id) => !!id && (state[kind]?.[id] ? state[kind][id] === account.id : account.role === 'admin');
    const require = (kind, id) => { if (!owns(kind, id)) throw Object.assign(new Error('해당 제작 자료를 찾을 수 없습니다.'), { status: 404 }); };
    const claim = (kind, id) => { if (!id) return; if (state[kind]?.[id] && !owns(kind, id)) throw Object.assign(new Error('이미 사용 중인 제작 요청입니다.'), { status: 409 }); state[kind] ||= {}; state[kind][id] = account.id; persist(); };
    return { owns, require, claim, account, ownsResult: item => {
      const known = [['requests', item.requestId], ['sessions', item.sessionId], ['files', item.filename], ['nodes', item.nodeId]].filter(([kind, id]) => id && state[kind][id]);
      return known.length ? known.every(([kind, id]) => owns(kind, id)) : account.role === 'admin';
    } };
  };
}
