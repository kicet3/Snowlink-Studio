import { mkdirSync, readFileSync, writeFileSync, renameSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { randomUUID } from 'node:crypto';

export const FORMATS = ['story', 'cards', 'youtube'];
export const STAGES = ['idea', 'script', 'production', 'review', 'done'];
const bad = message => Object.assign(new Error(message), { status: 400 });
const text = (value, max = 10000) => String(value ?? '').trim().slice(0, max);

export function validateRecord(kind, input, state) {
  if (!input || typeof input !== 'object' || Array.isArray(input)) throw bad('입력값을 확인해주세요.');
  if (kind === 'characters') {
    if (!text(input.name, 100)) throw bad('캐릭터 이름을 입력해주세요.');
    const image = text(input.image, 100);
    if (image && !/^\/media\/[\w-]+\.(png|jpg|webp)$/.test(image)) throw bad('시트 이미지를 다시 선택해주세요.');
    const sheet = input.sheet ? { templateId: text(input.sheet.templateId, 100), templateName: text(input.sheet.templateName, 100), prompt: text(input.sheet.prompt, 20000) } : undefined;
    return { name: text(input.name, 100), description: text(input.description), tags: text(input.tags, 300), image, ...(sheet ? { sheet } : {}) };
  }
  if (!text(input.title, 160)) throw bad('콘텐츠 제목을 입력해주세요.');
  if (!FORMATS.includes(input.format) || !STAGES.includes(input.stage)) throw bad('형식과 제작 단계를 선택해주세요.');
  const characterIds = [...new Set(Array.isArray(input.characterIds) ? input.characterIds : [])];
  if (characterIds.some(id => !state.characters.some(c => c.id === id))) throw bad('선택한 캐릭터를 찾을 수 없습니다.');
  const source = text(input.source, 2000);
  if (source && !/^https?:\/\//i.test(source)) throw bad('참고 링크는 http 또는 https 주소를 입력해주세요.');
  return { title: text(input.title, 160), format: input.format, stage: input.stage, story: text(input.story, 30000), source, characterIds, notes: text(input.notes) };
}

export function createStore(directory) {
  mkdirSync(directory, { recursive: true, mode: 0o700 });
  const file = join(directory, 'studio.json');
  let state = existsSync(file) ? JSON.parse(readFileSync(file, 'utf8')) : { version: 1, characters: [], productions: [] };
  if (state.version !== 1 || !Array.isArray(state.characters) || !Array.isArray(state.productions)) throw new Error('지원하지 않는 작업실 데이터 형식입니다.');
  const save = next => {
    if (existsSync(file)) writeFileSync(`${file}.bak`, readFileSync(file), { mode: 0o600 });
    writeFileSync(`${file}.tmp`, JSON.stringify(next, null, 2), { mode: 0o600 });
    renameSync(`${file}.tmp`, file);
    state = next;
  };
  return {
    read: () => structuredClone(state),
    upsert(kind, input, id) {
      const existing = id && state[kind].find(item => item.id === id);
      if (id && !existing) throw Object.assign(new Error('항목을 찾을 수 없습니다.'), { status: 404 });
      if (existing && input.updatedAt !== existing.updatedAt) throw Object.assign(new Error('다른 화면에서 수정됐습니다. 닫고 다시 열어주세요.'), { status: 409 });
      const values = validateRecord(kind, input, state);
      const now = new Date(Math.max(Date.now(), existing ? Date.parse(existing.updatedAt) + 1 : 0)).toISOString();
      const item = { ...values, id: id || randomUUID(), createdAt: existing?.createdAt || now, updatedAt: now, archived: input.archived === true };
      const items = existing ? state[kind].map(row => row.id === id ? item : row) : [...state[kind], item];
      save({ ...state, [kind]: items });
      return item;
    },
  };
}

export function saveImage(directory, data) {
  const match = /^data:image\/(png|jpeg|webp);base64,([A-Za-z0-9+/=]+)$/.exec(String(data || ''));
  if (!match) throw bad('PNG, JPG, WebP 이미지를 선택해주세요.');
  const bytes = Buffer.from(match[2], 'base64');
  if (!bytes.length || bytes.length > 6 * 1024 * 1024) throw bad('이미지는 6MB 이하여야 합니다.');
  const valid = match[1] === 'png' ? bytes.subarray(0, 8).equals(Buffer.from('89504e470d0a1a0a', 'hex'))
    : match[1] === 'jpeg' ? bytes[0] === 255 && bytes[1] === 216 && bytes[2] === 255
      : bytes.subarray(0, 4).toString() === 'RIFF' && bytes.subarray(8, 12).toString() === 'WEBP';
  if (!valid) throw bad('이미지 파일 형식을 확인해주세요.');
  const name = `${randomUUID()}.${match[1] === 'jpeg' ? 'jpg' : match[1]}`;
  mkdirSync(join(directory, 'media'), { recursive: true, mode: 0o700 });
  writeFileSync(join(directory, 'media', name), bytes, { mode: 0o600 });
  return `/media/${name}`;
}
