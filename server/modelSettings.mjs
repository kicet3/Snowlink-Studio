import { readFileSync, writeFileSync, renameSync, existsSync } from 'node:fs';
import { join } from 'node:path';

export const MODEL_ROLES = ['planning', 'chat', 'image', 'video'];
export function createModelSettings(config, dataDir) {
  const file = join(dataDir, 'ai.json');
  const defaults = () => ({ planning: { provider: config.ai.provider, model: config.ai.provider === 'grok' ? config.ai.grokModel : config.ai.gptModel }, chat: { provider: config.ai.provider, model: config.ai.provider === 'grok' ? config.ai.grokModel : config.ai.gptModel }, image: { provider: 'gpt', model: config.ai.gptModel }, video: { provider: 'grok', model: config.ai.videoModel || 'grok-imagine-video-1.5' } });
  function read() {
    const saved = existsSync(file) ? JSON.parse(readFileSync(file, 'utf8')) : {};
    const roles = defaults();
    if (['gpt', 'grok'].includes(saved.provider)) for (const key of ['planning', 'chat']) roles[key] = { provider: saved.provider, model: saved.provider === 'grok' ? config.ai.grokModel : config.ai.gptModel };
    for (const role of MODEL_ROLES) if (saved.roles?.[role]) roles[role] = saved.roles[role];
    return { roles, revision: saved.revision || 0 };
  }
  function save(role, value, revision) {
    if (!MODEL_ROLES.includes(role) || !['gpt', 'grok'].includes(value?.provider) || typeof value?.model !== 'string' || !value.model.trim()) throw Object.assign(new Error('제공자와 모델을 확인해주세요.'), { status: 400 });
    const current = read();
    if (revision !== undefined && revision !== current.revision) throw Object.assign(new Error('다른 화면에서 설정이 변경됐습니다. 새로고침 후 다시 선택해주세요.'), { status: 409 });
    if (role === 'video' && value.provider !== 'grok') throw Object.assign(new Error('영상 제작은 Grok OAuth를 사용합니다.'), { status: 400 });
    const next = { roles: { ...current.roles, [role]: { provider: value.provider, model: value.model } }, revision: current.revision + 1 };
    writeFileSync(file + '.tmp', JSON.stringify({ provider: next.roles.chat.provider, ...next }, null, 2), { mode: 0o600 });
    renameSync(file + '.tmp', file);
    return next;
  }
  return { read, save };
}

export function createModelCatalog(config) {
  let cached;
  let expires = 0;
  return async function catalog(force = false) {
    if (cached && Date.now() < expires && !force) return cached;
    const get = async path => {
      const response = await fetch(config.tools.ima2.target + path, { signal: AbortSignal.timeout(6000) });
      if (!response.ok) throw new Error('model catalog unavailable');
      return response.json();
    };
    const [models, oauth, grok] = await Promise.allSettled([get('/api/models'), get('/api/oauth/status'), get('/api/grok/status')]);
    const lanes = models.status === 'fulfilled' ? models.value.lanes || {} : {};
    const normalize = values => [...new Map(values.map(v => typeof v === 'string' ? { id: v, label: v } : v).map(v => [v.id, v])).values()];
    const text = {
      gpt: normalize((oauth.status === 'fulfilled' ? oauth.value.models || [] : []).filter(id => /^gpt-/.test(id) && !/image|audio|realtime/.test(id)).concat(config.ai.gptModel)),
      grok: normalize((grok.status === 'fulfilled' ? grok.value.models || [] : []).filter(id => /^grok-/.test(id) && !/imagine|video|image|vision|embedding/.test(id)).concat(config.ai.grokTextModels || [config.ai.grokModel])),
    };
    const image = { gpt: normalize(lanes.oauth?.models?.image || [config.ai.gptModel]), grok: normalize(lanes.grok?.models?.image || ['grok-imagine-image-2.0']) };
    const video = { grok: normalize(lanes.grok?.models?.video || [config.ai.videoModel || 'grok-imagine-video-1.5']) };
    cached = { planning: text, chat: text, image, video };
    expires = Date.now() + 60000;
    return cached;
  };
}
