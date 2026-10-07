import { readFileSync } from 'node:fs';
import { parseEnv } from 'node:util';

// Keep Meta credentials out of shared config and process.env: child tools and
// AI providers must not inherit credentials from the studio's .env file.
export function loadMetaCredentials(envPath, environment = process.env) {
  let file = {};
  try { file = parseEnv(readFileSync(envPath, 'utf8')); }
  catch (error) {
    if (error.code !== 'ENOENT') throw new Error('Meta 설정 파일을 읽지 못했습니다. .env 파일 형식과 접근 권한을 확인해주세요.');
  }
  const value = key => String(environment[key] ?? file[key] ?? '').trim();
  return Object.freeze({ appId: value('META_APP_ID'), appSecret: value('META_APP_SECRET') });
}

// Presence is not authentication. This endpoint intentionally makes no Graph
// calls and never treats MCP authorization as an Instagram account connection.
export function metaSetupStatus(credentials = {}) {
  const appId = credentials.appId?.trim() || '';
  const appSecret = credentials.appSecret?.trim() || '';
  const idStatus = !appId ? 'missing' : /^\d+$/.test(appId) ? 'present' : 'invalid';
  const ready = idStatus === 'present' && !!appSecret;
  return {
    provider: 'meta',
    loginMethod: 'facebook_login',
    status: ready ? 'credentials_present' : 'credentials_required',
    credentials: { appId: idStatus, appSecret: appSecret ? 'present' : 'missing' },
    validationMethod: 'presence_only',
    credentialsVerified: false,
    accountConnected: false,
    oauthImplemented: false,
    callbackUrl: null,
    capabilities: { collection: false, insights: false, publishing: false, scheduling: false },
    message: ready
      ? '앱 자격증명이 준비되었습니다. 이 화면은 입력 여부만 확인하며, Instagram 계정은 아직 연결되지 않았습니다.'
      : 'Meta 앱 ID와 앱 시크릿을 준비해주세요. Instagram 계정은 아직 연결되지 않았습니다.',
  };
}
