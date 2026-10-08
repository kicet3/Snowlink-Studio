import { createScenarioStore, nextStoryStep, episodeLength } from './scenarios.mjs';
import { createScenarioWriter } from './scenarioWriter.mjs';
import { createVideoTemplates, planVideoTemplate } from './videoTemplates.mjs';
import { createStudioJobs } from './studioJobs.mjs';
import { createStudioMedia } from './studioMedia.mjs';
import { chatCharacter } from './characterStudio.mjs';
import { saveImage } from './store.mjs';
import { retrieveStoryContext } from './storyGraph.mjs';
import { studioToolDefinitions } from './studioTools.mjs';
import { createPersonaChat } from './personaChat.mjs';

const bad = (message, status = 400) => Object.assign(new Error(message), { status });
export const STUDIO_GUIDE = '영상 템플릿을 고르고 대화로 수정해 저장하세요. 캐릭터는 studio_character_chat → 설정 확인 → studio_character_generate → studio_job → studio_character_register 순서입니다. 시나리오는 전체 플롯 → 순서대로 회차 플롯 → 순서대로 상세 원고와 이야기 기억입니다. studio_story_context로 이전 사실과 떡밥 근거를 검색합니다. 완료된 회차는 studio_episode_nodes로 장면 노드로 바꿉니다. studio_graph_run은 이미지 부모부터 실행하고 studio_job으로 완료를 확인한 뒤 영상 노드를 실행합니다. 비용이 드는 생성은 사용자의 생성 요청 범위에서 실행하세요. 이미 접수한 요청은 재전송하지 말고 같은 작업 번호로 조회하세요. 수정에는 최신 revision/graphVersion이 필요합니다.';

export function createStudioActions({ config, dataDir, store, ai, templates, ownership }) {
  const scenarios = createScenarioStore(dataDir), videoTemplates = createVideoTemplates(dataDir), jobs = createStudioJobs(dataDir);
  const writer = createScenarioWriter({ scenarios, ai, workspace: store, videoTemplates, jobs });
  const persona = createPersonaChat({ dataDir, store, scenarios, ai });
  const media = createStudioMedia({ config, dataDir, workspace: store, videoTemplates, jobs, ai, ownership });
  function validSettings(values = {}) {
    if (values.videoTemplateId) videoTemplates.get(values.videoTemplateId);
    if (values.characterIds?.some(id => !store.read().characters.some(c => c.id === id && !c.archived))) throw bad('등록된 출연 캐릭터를 선택해주세요.');
    return values;
  }
  const present = series => ({ ...series, nextStep: nextStoryStep(series), episodes: series.episodes.map(episode => ({ ...episode, length: episodeLength(series, episode) })) });
  function ready(input) {
    const series = scenarios.read(input.id), episode = series.episodes[input.episodeNumber - 1];
    if (series.revision !== input.revision) throw bad('시나리오가 변경됐습니다. 다시 불러와주세요.', 409);
    if (!episode || episode.status !== 'ready') throw bad('원고와 이야기 기억이 완성된 화를 선택해주세요.');
    return { series, episode };
  }
  async function scenes(job, input, series, episode) {
    try {
      jobs.update(job.id, { status: 'running', message: '원고를 장면 노드로 나누고 있습니다.' });
      const template = videoTemplates.get(series.videoTemplateId);
      const cast = store.read().characters.filter(c => series.characterIds.includes(c.id));
      const answer = await ai.complete([
        { role: 'system', content: '완성된 한국어 영상 시나리오를 2~20개의 핵심 장면으로 나눕니다. 원고의 사건 순서·인물 정체성·복선·결말을 유지하고 영상 스타일 템플릿을 적용하세요. 각 장면은 5초 영상의 한 동작을 중심으로 합니다. 긴 원고에서는 핵심 장면을 선택하되 요약 노드임을 reply에 명시합니다. JSON만 반환: {"reply":"구성 설명", "scenes":[{"title":"장면명", "imagePrompt":"해당 장면 첫 프레임의 구도·인물·장소·조명", "videoPrompt":"그 프레임에서 시작할 행동·카메라·대사·소리·끝 상태", "characterIds":["제공한 캐릭터 ID, 최대3개"]}]}' },
        { role: 'user', content: JSON.stringify({ title: series.title, episode: episode.number, content: episode.content, characters: cast.map(({ id, name, description }) => ({ id, name, description: description.slice(0, 1500) })), template, instruction: input.instruction }) },
      ], undefined, 'planning');
      const result = JSON.parse(answer.content.trim().replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, ''));
      if (!Array.isArray(result.scenes) || !result.scenes.length || result.scenes.length > 20) throw bad('장면 구성을 읽지 못했습니다.');
      const nodes = [], edges = [];
      result.scenes.forEach((scene, i) => {
        if (!Array.isArray(scene.characterIds) || scene.characterIds.some(id => !series.characterIds.includes(id))) throw bad('장면의 출연 캐릭터를 확인하지 못했습니다.');
        for (const kind of ['image', 'video']) nodes.push({ id: `scene-${i + 1}-${kind}`, kind, prompt: scene[kind + 'Prompt'], characterIds: scene.characterIds, templateId: template.id });
        edges.push({ source: `scene-${i + 1}-image`, target: `scene-${i + 1}-video` });
      });
      ready(input);
      const graph = await media.createGraph({ title: `${series.title} · ${episode.number}화`, nodes, edges });
      jobs.update(job.id, { result: { sessionId: graph.id, url: `/#ima2/graph/${graph.id}`, nodeCount: graph.nodes.length } });
      try { scenarios.linkGraph(series.id, episode.number, series.revision, graph.id); }
      catch (error) { if (error.status === 409) { jobs.update(job.id, { status: 'done', message: '장면 노드를 만들었습니다. 원고가 수정되어 자동 연결을 보류했습니다. 결과 링크에서 확인해주세요.' }); return; } throw error; }
      jobs.update(job.id, { status: 'done', message: String(result.reply || '장면 노드를 만들었습니다. 이미지 노드부터 생성해주세요.').slice(0, 2000) });
    } catch (error) { jobs.update(job.id, { status: 'failed', message: error.status ? error.message : '장면 노드를 만들지 못했습니다. 저장된 원고는 유지됩니다.' }); }
  }
  const actions = {
    studio_workspace: () => ({ ...store.read(), scenarios: scenarios.list(), guide: STUDIO_GUIDE }),
    studio_templates(input) {
      const repository = input.kind === 'video' ? videoTemplates : templates;
      if (input.operation === 'list') return { templates: repository.list() };
      return repository.save({ ...input.template, updatedAt: input.updatedAt }, input.id);
    },
    studio_video_template_chat: input => planVideoTemplate(ai, input),
    studio_character_chat: input => chatCharacter(ai, templates, dataDir, input),
    studio_persona_catalog: () => persona.catalog(),
    studio_persona_conversations: () => persona.list(),
    studio_persona_conversation: input => persona.get(input),
    studio_persona_start: input => persona.start(input),
    studio_persona_send: input => persona.send(input),
    studio_persona_remove: input => persona.remove(input),
    studio_upload_image: input => ({ image: saveImage(dataDir, input.data) }),
    studio_character_generate(input) {
      const template = templates.get(input.templateId);
      return media.submit({ ...input, sheet: { templateId: template.id, templateName: template.name, prompt: input.prompt } });
    },
    studio_character_register: input => media.registerSheet(input.jobId, input.profile),
    studio_scenario(input) {
      if (input.operation === 'list') return { scenarios: scenarios.list() };
      if (input.operation === 'read') return present(scenarios.read(input.id));
      if (input.operation === 'create') return present(scenarios.create(validSettings(input.values)));
      return present(scenarios.update(input.id, { ...validSettings(input.values), revision: input.revision }));
    },
    studio_story_write(input) {
      const method = { overall: 'saveOverall', plot: 'savePlot', content: 'saveContent', limits: 'setEpisodeLimits' }[input.stage];
      return present(input.stage === 'overall' ? scenarios[method](input.id, input) : scenarios[method](input.id, input.episodeNumber, input));
    },
    studio_story_generate: input => writer.start(input.id, input),
    studio_story_context: input => retrieveStoryContext(scenarios.read(input.id), input),
    studio_story_graph: input => scenarios.read(input.id).graph,
    studio_episode_production(input) {
      const { series, episode } = ready(input);
      if (episode.productionId) return { production: store.read().productions.find(p => p.id === episode.productionId), message: '이미 연결된 콘텐츠입니다. 원고 수정 후에는 제작 보드에서도 내용을 확인해주세요.' };
      if (episode.content.length > 30000) throw bad('제작 보드의 원고 길이 한도(30,000자)를 초과합니다. 원고를 나눈 후 연결해주세요.');
      const production = store.upsert('productions', { title: `${series.title} · ${episode.number}화 ${episode.title}`.slice(0, 160), format: 'youtube', stage: 'script', story: episode.content, characterIds: series.characterIds, notes: `영상 스타일: ${videoTemplates.get(series.videoTemplateId).name}\n시나리오 ${series.id} · 원고 버전 ${episode.contentRevision}` });
      scenarios.linkProduction(series.id, episode.number, series.revision, production.id);
      return { production };
    },
    studio_episode_nodes(input) {
      const { series, episode } = ready(input);
      if (episode.graphId) return { status: 'done', result: { sessionId: episode.graphId, url: `/#ima2/graph/${episode.graphId}` }, message: '이미 연결된 장면 노드입니다. 원고 수정은 기존 노드를 자동으로 덮어쓰지 않습니다.' };
      const prior = jobs.list().find(j => j.kind === 'scenes' && j.seriesId === input.id && j.episodeNumber === input.episodeNumber && ['queued', 'running'].includes(j.status));
      if (prior) return prior;
      const job = jobs.create('scenes', { seriesId: series.id, episodeNumber: episode.number });
      void scenes(job, input, series, episode); return jobs.read(job.id);
    },
    studio_graphs: input => input.sessionId ? media.readGraph(input.sessionId) : media.listGraphs(),
    studio_graph_save: input => input.sessionId ? media.replaceGraph(input) : media.createGraph(input),
    studio_graph_run: input => media.submit(input),
    studio_job(input) {
      if (!input.id) return { jobs: jobs.list().slice(-60).reverse().map(({ nodePrompt, profile, sheet, fingerprint, ...job }) => job) };
      if (input.pause) return writer.pause(input.id);
      const job = jobs.read(input.id); return job.kind === 'media' ? media.poll(job.id) : job;
    },
  };
  return {
    async execute(name, input = {}) {
      const definition = studioToolDefinitions[name];
      if (!definition) throw bad('지원하지 않는 작업입니다.', 404);
      const parsed = definition.inputSchema.safeParse(input);
      if (!parsed.success) throw bad('입력값을 확인해주세요: ' + parsed.error.issues.map(i => `${i.path.join('.')}: ${i.message}`).join('; ').slice(0, 2000));
      return actions[name](parsed.data);
    },
  };
}
