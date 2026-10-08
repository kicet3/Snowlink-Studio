import { STUDIO_URL, COMPANY_URL, CONTENT_UPDATED, PRODUCT_DESCRIPTION, PUBLIC_PAGES } from './seo.js';
import { GUIDE_INTRO, GUIDE_STEPS, GUIDE_FAQ } from './guide.js';

export function publicText({ full = false } = {}) {
  const sections = [
    '# Snowlink Studio', `> ${PRODUCT_DESCRIPTION}`,
    `운영사: 스노우링크(SnowLink)\n제품 안내 기준일: ${CONTENT_UPDATED}\n문의: admin@snowlink.team`,
    `## 공식 안내\n\n${PUBLIC_PAGES.map(page => `- [${page.title}](${new URL(page.path, STUDIO_URL).href}): ${page.description}`).join('\n')}\n- [회사 및 제품 소개](${COMPANY_URL}/): 기능 상세와 사업자 정보\n- [전체 가이드 텍스트](${STUDIO_URL}/llms-full.txt): 공개 사용 가이드의 텍스트 버전`,
    '## 공개 범위\n\n작품 쇼케이스는 가상 창작자와 AI 생성 이미지로 구성한 목업이며 실제 사용자 게시물이 아닙니다. 실제 사용자 공개 게시 연동은 준비 중입니다. 개인 작업 자료와 계정 정보는 이 안내에 포함하지 않습니다.',
    `## 시작하기\n\n${GUIDE_INTRO}`,
  ];
  if (full) sections.push(...GUIDE_STEPS.map(step => `## ${step.title}\n\n- 준비할 자료: ${step.input}\n- 작업 방법: ${step.action}\n- 결과물: ${step.output}\n\n${step.example}\n\n[${step.link}](${STUDIO_URL}${step.path})\n출처: ${STUDIO_URL}/guide#${step.id}`));
  sections.push(`## 자주 묻는 질문\n\n${GUIDE_FAQ.map(item => `### ${item.question}\n\n${item.answer}\n\n출처: ${STUDIO_URL}/guide#faq-${item.id}`).join('\n\n')}`);
  return sections.join('\n\n') + '\n';
}
