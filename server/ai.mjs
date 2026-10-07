import { pathToFileURL } from 'node:url';
import { join } from 'node:path';
import { collectResponseText } from './responses.mjs';
import { createModelSettings, createModelCatalog } from './modelSettings.mjs';

export function createAi(config, dataDir) {
  const load = name => import(pathToFileURL(join(config.tools.ima2.directory, 'lib', name)).href);
  const settings = createModelSettings(config, dataDir);
  const catalog = createModelCatalog(config);
  let active = 0;
  async function complete(messages, provider, role = 'chat', images = []) {
    const selection = settings.read().roles[role];
    provider ||= selection.provider;
    const model = provider === selection.provider ? selection.model : provider === 'grok' ? config.ai.grokModel : config.ai.gptModel;
    if (!['gpt', 'grok'].includes(provider)) throw Object.assign(new Error('GPT OAuth 또는 Grok OAuth를 선택해주세요.'), { status: 400 });
    if (!Array.isArray(messages) || !messages.length || messages.length > 40 || messages.some(m => !['system', 'user', 'assistant'].includes(m.role) || typeof m.content !== 'string') || JSON.stringify(messages).length > 100000) {
      throw Object.assign(new Error('대화 입력이 너무 길거나 형식이 올바르지 않습니다.'), { status: 400 });
    }
    if (!Array.isArray(images) || images.length > 1 || images.some(image => typeof image !== 'string' || image.length > 8 * 1024 * 1024 + 100 || !/^data:image\/(png|jpeg|webp);base64,[A-Za-z0-9+/=]+$/.test(image))) throw Object.assign(new Error('참고 이미지 형식을 확인해주세요.'), { status: 400 });
    if (active >= 3) throw Object.assign(new Error('AI 작업이 진행 중입니다. 잠시 후 다시 시도해주세요.'), { status: 429 });
    active++;
    try { return await send(messages, provider, model, images); }
    catch (error) {
      if (error.status) throw error;
      const auth = /AUTH|SESSION/.test(error.code || '');
      throw Object.assign(new Error(auth ? `${provider.toUpperCase()} OAuth 로그인이 필요합니다. 설정 · OAuth에서 로그인해주세요.` : `${provider.toUpperCase()} OAuth 응답을 받지 못했습니다. 잠시 후 다시 시도해주세요.`), { status: auth ? 401 : 502 });
    }
    finally { active--; }
  }
  async function send(messages, provider, model, images) {
    const input = aiInput(messages, provider, images);
    const body = JSON.stringify({ model, messages: input, stream: false });
    const signal = AbortSignal.timeout(120000);
    let response;
    if (provider === 'gpt') {
      const { codexFetch } = await load('codexBackend/index.js');
      response = await codexFetch('/v1/responses', { method: 'POST', body: JSON.stringify({ model, input, stream: true, reasoning: { effort: 'low' } }), signal });
      if (response.ok) {
        const content = await collectResponseText(response.body);
        if (!content.trim()) throw Object.assign(new Error('GPT가 빈 응답을 반환했습니다.'), { status: 502 });
        return { content, model, provider };
      }
    } else {
      const { fetchWithGrokAuth, getGrokEndpoint } = await load('grokRuntime.js');
      response = await fetchWithGrokAuth({}, 'grok', credential => {
        const endpoint = getGrokEndpoint('/v1/chat/completions', credential);
        return fetch(endpoint.url, { method: 'POST', headers: endpoint.headers, body, signal });
      }, { signal });
    }
    const result = await response.json();
    if (!response.ok) throw Object.assign(new Error(`${provider.toUpperCase()} OAuth 요청 실패 (${response.status}). 설정 · OAuth에서 로그인 상태를 확인해주세요.`), { status: response.status === 401 ? 401 : 502 });
    const content = result.choices?.[0]?.message?.content;
    if (typeof content !== 'string' || !content.trim()) throw Object.assign(new Error('AI가 빈 응답을 반환했습니다.'), { status: 502 });
    return { content, model, provider };
  }
  async function status() {
    const checks = await Promise.allSettled([
      load('codexBackend/index.js').then(m => m.codexSessionStore().get()).then(() => true),
      load('grokRuntime.js').then(m => m.resolveGrokCredential({}, 'grok')).then(() => true),
    ]);
    const selected = settings.read().roles.chat.provider;
    const selectedModel = settings.read().roles.chat.model;
    return { selected, selectedModel, providers: { gpt: { ready: checks[0].status === 'fulfilled', model: config.ai.gptModel }, grok: { ready: checks[1].status === 'fulfilled', model: config.ai.grokModel } } };
  }
  return { complete, status, settings, catalog, select(provider) {
    const current = settings.read().roles.chat;
    const model = current.provider === provider ? current.model : provider === 'gpt' ? config.ai.gptModel : config.ai.grokModel;
    settings.save('chat', { provider, model });
  } };
}

// Keep image data out of persisted conversation text and attach it only to the current user turn.
export function aiInput(messages, provider, images = []) {
  const lastUser = messages.findLastIndex(message => message.role === 'user');
  return messages.map((message, index) => ({
    ...message,
    role: provider === 'gpt' && message.role === 'system' ? 'developer' : message.role,
    content: index !== lastUser || !images.length ? message.content : provider === 'gpt'
      ? [{ type: 'input_text', text: message.content }, ...images.map(image => ({ type: 'input_image', image_url: image, detail: 'high' }))]
      : [{ type: 'text', text: message.content }, ...images.map(image => ({ type: 'image_url', image_url: { url: image } }))],
  }));
}

export function responseMessages(body) {
  if (!Array.isArray(body.input)) throw Object.assign(new Error('input 배열이 필요합니다.'), { status: 400 });
  return body.input.map(message => ({ role: message.role, content: Array.isArray(message.content) ? message.content.map(c => c.text || '').join('\n') : message.content }));
}
