import { readFile } from 'node:fs/promises';
import { join, extname } from 'node:path';
import { json, readJson } from './http.mjs';

const bad = (message, status = 400) => Object.assign(new Error(message), { status });
const bounded = (value, max) => typeof value === 'string' && value.length <= max;
const INSTRUCTIONS = `당신은 캐릭터 등록을 돕는 한국어 AI 아트 디렉터입니다. 사용자와 짧게 대화하여 캐릭터를 구체화하고 실제 시트 이미지 생성을 준비합니다.
사용자가 고른 템플릿 하나만 따르세요. 서로 다른 템플릿의 규칙을 섞지 마세요. 영상용의 무텍스트 규칙과 애니메이션용의 한국어 라벨 규칙은 별개입니다.
첨부 사진이 있으면 얼굴형, 이목구비, 피부 톤, 헤어, 보이는 체형과 의상, 표현 스타일을 관찰합니다. 보이지 않는 부분은 추정임을 설명하고 자연스럽게 보완합니다. 사진 없이 사진을 분석했다고 주장하지 마세요. 실존 인물의 신원을 추정하지 마세요.
새 캐릭터는 유형, 연령·인상, 스타일, 의상, 목적을 바탕으로 나머지를 조화롭게 설계합니다. 사용자가 자동으로 맡긴 빈 항목을 다시 묻지 마세요. 부족한 필수 정보가 있을 때만 간단히 질문합니다.
충분한 정보가 있으면 짧은 설정 요약과 “이 설정으로 캐릭터 시트를 직접 생성할까요?”를 reply에 담습니다. 이름이 없으면 어울리는 이름을 제안합니다. 변경 요청에는 기존의 핵심 외형을 유지하며 요청한 부분만 수정합니다.
이미지는 사용자가 별도의 생성 버튼으로 확인한 뒤 생성됩니다. 이미 생성됐다고 말하지 마세요. 프롬프트를 사용자에게 설명하거나 reply에 출력하지 마세요.
템플릿 속 '프롬프트만 출력' 지시는 sheetPrompt 필드에만 적용합니다. 실제 이미지에 필요한 완성된 구체적 생성 지시를 sheetPrompt에 넣고 플레이스홀더를 남기지 마세요. 사용자에게 질문하는 지시와 제작 절차는 이미지 프롬프트에 넣지 마세요.
반드시 JSON 객체 하나만 반환합니다: {"reply":"한국어 대화 및 짧은 설정 요약", "profile":{"name":"100자 이하", "description":"외형·성격·의상·유지할 특징, 10000자 이하", "tags":"쉼표 구분, 300자 이하"}, "ready":true, "sheetPrompt":"20000자 이하의 실제 이미지 생성 프롬프트"}.
ready는 생성에 필요한 설정이 모였을 때만 true입니다. false라면 sheetPrompt는 빈 문자열입니다.`;

export async function chatCharacter(ai, templates, dataDir, input) {
  if (!input || !bounded(input.message, 4000) || !input.message.trim()) throw bad('대화 내용을 4,000자 이내로 입력해주세요.');
  if (!['photo', 'new'].includes(input.mode)) throw bad('캐릭터 생성 방식을 선택해주세요.');
  const template = templates.get(input.templateId);
  const history = input.messages || [];
  if (!Array.isArray(history) || history.length > 16 || history.some(m => !m || !['user', 'assistant'].includes(m.role) || !bounded(m.content, 6000))) throw bad('대화 기록 형식을 확인해주세요.');
  const settings = {};
  for (const key of ['type', 'age', 'style', 'outfit', 'purpose', 'layout']) {
    if (input.settings?.[key] !== undefined && !bounded(input.settings[key], 1000)) throw bad('캐릭터 설정은 항목별 1,000자 이내로 입력해주세요.');
    settings[key] = input.settings?.[key] || '자동 추천';
  }
  const profile = input.profile || {};
  if (!bounded(profile.name || '', 100) || !bounded(profile.description || '', 10000) || !bounded(profile.tags || '', 300)) throw bad('캐릭터 설정 길이를 확인해주세요.');
  const images = [];
  if (input.mode === 'photo') {
    if (typeof input.referenceImage !== 'string' || !/^\/media\/[\w-]+\.(png|jpg|webp)$/.test(input.referenceImage)) throw bad('참고할 사진을 먼저 첨부해주세요.');
    let bytes;
    try { bytes = await readFile(join(dataDir, input.referenceImage)); }
    catch { throw bad('참고 사진을 찾을 수 없습니다. 다시 첨부해주세요.'); }
    if (!bytes.length || bytes.length > 6 * 1024 * 1024) throw bad('참고 이미지는 6MB 이하로 선택해주세요.');
    const type = extname(input.referenceImage).slice(1);
    images.push(`data:image/${type === 'jpg' ? 'jpeg' : type};base64,${bytes.toString('base64')}`);
  }
  const answer = await ai.complete([
    { role: 'system', content: INSTRUCTIONS + '\n선택한 템플릿:\n' + template.prompt },
    { role: 'user', content: '현재 작업 설정:\n' + JSON.stringify({ mode: input.mode, settings, profile, referenceAttached: !!images.length }) },
    ...history.slice(-8),
    { role: 'user', content: input.message.trim() },
  ], undefined, 'chat', images);
  let result;
  try { result = JSON.parse(answer.content.trim().replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '')); }
  catch { throw bad('AI 응답 형식을 확인하지 못했습니다. 대화 내용을 유지했으니 다시 보내주세요.', 502); }
  if (!result || !bounded(result.reply, 6000) || !result.reply.trim() || !result.profile || !bounded(result.profile.name, 100) || !bounded(result.profile.description, 10000) || !bounded(result.profile.tags, 300) || typeof result.ready !== 'boolean' || !bounded(result.sheetPrompt, 20000) || (result.ready && (!result.sheetPrompt.trim() || !result.profile.name.trim() || !result.profile.description.trim()))) {
    throw bad('AI가 완전한 캐릭터 설정을 반환하지 않았습니다. 다시 요청해주세요.', 502);
  }
  return { reply: result.reply.trim(), profile: { name: result.profile.name.trim(), description: result.profile.description.trim(), tags: result.profile.tags.trim() }, ready: result.ready, sheetPrompt: result.ready ? result.sheetPrompt.trim() : '', provider: answer.provider, model: answer.model };
}

export async function handleCharacterStudio(req, res, pathname, context) {
  const match = /^\/api\/character-templates(?:\/([\w-]+))?$/.exec(pathname);
  if (match) {
    if (req.method === 'GET' && !match[1]) json(res, 200, { templates: context.templates.list() });
    else if (req.method === 'POST' && !match[1] || req.method === 'PUT' && match[1]) json(res, match[1] ? 200 : 201, context.templates.save(await readJson(req), match[1]));
    else if (req.method === 'DELETE' && match[1]) { context.templates.remove(match[1], (await readJson(req)).updatedAt); json(res, 200, { ok: true }); }
    else throw bad('지원하지 않는 템플릿 요청입니다.', 405);
    return true;
  }
  if (pathname !== '/api/character-studio/chat') return false;
  if (req.method !== 'POST') throw bad('지원하지 않는 대화 요청입니다.', 405);
  json(res, 200, await chatCharacter(context.ai, context.templates, context.dataDir, await readJson(req)));
  return true;
}
