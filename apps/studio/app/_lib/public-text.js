import { STUDIO_URL, COMPANY_URL, CONTENT_UPDATED, PRODUCT_DESCRIPTION, PUBLIC_PAGES } from './seo.js';
import { GUIDE_INTRO, GUIDE_ACCESS, PRODUCT_STORY, CLAUDE_STATUS, GUIDE_STEPS, GUIDE_FAQ } from './guide.js';

export function publicText({ full = false } = {}) {
  const sections = [
    '# Snowlink Team Studio', `> ${PRODUCT_DESCRIPTION}`,
    `운영사: Snowlink Team (사업자명: 스노우링크)\n제품 안내 기준일: ${CONTENT_UPDATED}\n문의: ceo@snowlink.team`,
    `## 공식 안내\n\n${PUBLIC_PAGES.map(page => `- [${page.title}](${new URL(page.path, STUDIO_URL).href}): ${page.description}`).join('\n')}\n- [회사 및 제품 소개](${COMPANY_URL}/): 기능 상세와 사업자 정보\n- [전체 가이드 텍스트](${STUDIO_URL}/llms-full.txt): 공개 사용 가이드의 텍스트 버전`,
    '## 캐릭터챗\n\n이야기를 만들고, 그 안의 캐릭터와 대화하세요. 일상의 이야기를 편안하게 건넬 수 있는 작은 연결을 지향합니다. /chat에서 공개 작품의 인물을 고르거나 내 캐릭터를 만들어 대화합니다. 선택한 회차의 맥락은 시작 시 고정되고 최근 대화를 참고합니다. 기록은 작업실별로 저장하며 원작·그래프에 자동 반영하지 않습니다.',
    '## 작품 탐색\n\n캐릭터·소설·이미지 콘텐츠를 검색하고 종류별로 둘러보세요. 창작자의 작품을 모아 보거나 소설의 회차를 선택해 읽고, 같은 세계관의 캐릭터와 장면으로 이어갈 수 있습니다.',
    `## 시작하기\n\n${GUIDE_INTRO}\n\n${GUIDE_ACCESS}`,
    `## 문제와 현재 제품 경험\n\n${PRODUCT_STORY.problem}\n\n${PRODUCT_STORY.experience}\n\n${PRODUCT_STORY.steps.map((step, i) => `${i + 1}. ${step}`).join('\n')}\n\n[캐릭터챗 체험](${STUDIO_URL}/chat)\n출처: ${STUDIO_URL}/guide#experience`,
    `## Claude 활용 현황과 개발 계획\n\n${CLAUDE_STATUS.current}\n\n${CLAUDE_STATUS.writing}\n\n계획: ${CLAUDE_STATUS.planned}\n\n${CLAUDE_STATUS.planSteps.map(step => `### 계획: ${step.title}\n\n${step.description}`).join('\n\n')}\n\n${CLAUDE_STATUS.evaluation}\n\n${CLAUDE_STATUS.metrics.map(metric => `- ${metric.name}: ${metric.description}`).join('\n')}\n\n### 필요한 지원\n\n${CLAUDE_STATUS.support}\n\n출처: ${STUDIO_URL}/guide#claude`,
  ];
  if (full) sections.push(...GUIDE_STEPS.map(step => `## ${step.title}\n\n- 준비할 자료: ${step.input}\n- 작업 방법: ${step.action}\n- 결과물: ${step.output}\n\n${step.example}\n\n[${step.link}](${STUDIO_URL}${step.path})\n출처: ${STUDIO_URL}/guide#${step.id}`));
  sections.push(`## 자주 묻는 질문\n\n${GUIDE_FAQ.map(item => `### ${item.question}\n\n${item.answer}\n\n출처: ${STUDIO_URL}/guide#faq-${item.id}`).join('\n\n')}`);
  return sections.join('\n\n') + '\n';
}
