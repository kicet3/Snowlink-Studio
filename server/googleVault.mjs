import { mkdirSync, readFileSync, writeFileSync, renameSync, rmSync, chmodSync } from 'node:fs';
import { join } from 'node:path';
import { randomBytes, createCipheriv, createDecipheriv } from 'node:crypto';

// Separate from workspace/export data. The local encryption key and ciphertext
// are accessible only to this OS user; neither enters config, logs or responses.
export function createGoogleVault(dataDir) {
  const directory = join(dataDir, 'oauth');
  const keyFile = join(directory, 'google.key');
  const file = join(directory, 'google.enc.json');
  const aad = Buffer.from('snowfall-google-oauth-v1');
  function key(create = false) {
    if (create) {
      mkdirSync(directory, { recursive: true, mode: 0o700 });
      chmodSync(directory, 0o700);
      try { writeFileSync(keyFile, randomBytes(32), { flag: 'wx', mode: 0o600 }); }
      catch (error) { if (error.code !== 'EEXIST') throw error; }
    }
    chmodSync(keyFile, 0o600);
    const value = readFileSync(keyFile);
    if (value.length !== 32) throw new Error('Invalid key');
    return value;
  }
  function failure() {
    return Object.assign(new Error('Google 연결 저장소를 읽거나 저장하지 못했습니다. 서버의 파일 접근 권한을 확인해주세요.'), { status: 503, code: 'storage_error' });
  }
  return {
    read() {
      let raw;
      try { raw = readFileSync(file, 'utf8'); }
      catch (error) { if (error.code === 'ENOENT') return null; throw failure(); }
      try {
        const data = JSON.parse(raw);
        if (data.version !== 1) throw new Error('Invalid version');
        const decipher = createDecipheriv('aes-256-gcm', key(), Buffer.from(data.iv, 'base64'));
        decipher.setAAD(aad);
        decipher.setAuthTag(Buffer.from(data.tag, 'base64'));
        return JSON.parse(Buffer.concat([decipher.update(Buffer.from(data.data, 'base64')), decipher.final()]).toString('utf8'));
      } catch { throw failure(); }
    },
    write(value) {
      const temporary = file + '.' + randomBytes(8).toString('hex') + '.tmp';
      try {
        const iv = randomBytes(12);
        const cipher = createCipheriv('aes-256-gcm', key(true), iv);
        cipher.setAAD(aad);
        const data = Buffer.concat([cipher.update(JSON.stringify(value), 'utf8'), cipher.final()]);
        writeFileSync(temporary, JSON.stringify({ version: 1, iv: iv.toString('base64'), tag: cipher.getAuthTag().toString('base64'), data: data.toString('base64') }), { flag: 'wx', mode: 0o600 });
        renameSync(temporary, file);
      } catch { throw failure(); }
      finally { rmSync(temporary, { force: true }); }
    },
    remove() {
      try { rmSync(file, { force: true }); }
      catch { throw failure(); }
    },
  };
}
