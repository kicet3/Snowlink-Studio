import { companyConfig } from './config.js';

const c = companyConfig();
export const siteUrl = c.siteUrl;
export const title = `${c.brand} | ${c.service.name} AI 창작·캐릭터챗`;
export const description = '이야기를 만들고, 그 안의 캐릭터와 대화하세요. Snowlink Team Studio는 회차별 소설과 이야기 그래프, 창작 인물의 성격·세계관을 바탕으로 한 캐릭터챗을 연결하는 서비스입니다.';
export const shareImage = {
  url: `${siteUrl}/opengraph-image`, width: 1200, height: 630,
  alt: 'Snowlink Team Studio — 이야기 창작과 캐릭터챗',
};

export const metadata = {
  metadataBase: new URL(siteUrl),
  title,
  description,
  applicationName: c.service.name,
  // Public ownership token issued by Search Console; keep it after verification.
  verification: { google: 'WWxgi8V7nRehj6Buk0diT3OqAMcIt-NXruyrw8weTYA' },
  alternates: { canonical: '/', types: { 'text/plain': `${siteUrl}/llms-full.txt` } },
  robots: { index: true, follow: true, googleBot: { index: true, follow: true, 'max-image-preview': 'large', 'max-snippet': -1, 'max-video-preview': -1 } },
  openGraph: { type: 'website', locale: 'ko_KR', url: siteUrl, siteName: c.brand, title, description, images: [shareImage] },
  twitter: { card: 'summary_large_image', title, description, images: [shareImage] },
  icons: { icon: '/brandmark.svg' },
};

export function structuredData() {
  return {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'Organization', '@id': `${siteUrl}/#organization`,
        name: c.brand, alternateName: '스노우링크 팀', legalName: c.name, url: `${siteUrl}/`,
        logo: `${siteUrl}/brandmark.svg`, email: c.email,
        foundingDate: '2026-06-30', taxID: c.registration,
        address: { '@type': 'PostalAddress', streetAddress: c.address, addressCountry: 'KR' },
      },
      {
        '@type': 'WebSite', '@id': `${siteUrl}/#website`,
        name: c.brand, alternateName: c.name, url: `${siteUrl}/`, inLanguage: 'ko-KR',
        publisher: { '@id': `${siteUrl}/#organization` },
      },
      {
        '@type': 'WebPage', '@id': `${siteUrl}/#webpage`,
        url: `${siteUrl}/`, name: title, description,
        inLanguage: 'ko-KR', dateModified: c.contentUpdated,
        isPartOf: { '@id': `${siteUrl}/#website` },
        mainEntity: { '@id': `${siteUrl}/#product` },
        hasPart: { '@id': `${siteUrl}/#faq` },
      },
      {
        '@type': 'WebApplication', '@id': `${siteUrl}/#product`,
        name: c.service.name, url: c.service.url, description: c.productSummary,
        applicationCategory: 'MultimediaApplication', operatingSystem: 'Web', inLanguage: 'ko-KR',
        publisher: { '@id': `${siteUrl}/#organization` },
        mainEntityOfPage: { '@id': `${siteUrl}/#webpage` },
        image: shareImage.url, screenshot: ['explore', 'creators', 'novel', 'board', 'membership'].map(id => `${siteUrl}/screenshots/${id}.jpg`),
        featureList: [...c.features.map(feature => `${feature.title}: ${feature.description}`), `작품 탐색: ${c.showcaseDescription}`, `멤버십 미리보기: ${c.membership.notice}`],
      },
      {
        '@type': 'FAQPage', '@id': `${siteUrl}/#faq`,
        mainEntity: c.faq.map(item => ({ '@type': 'Question', '@id': `${siteUrl}/#${item.id}`, name: item.question, acceptedAnswer: { '@type': 'Answer', text: item.answer } })),
      },
    ],
  };
}

// These public text representations use exactly the same product facts as the HTML.
export function productText({ full = false } = {}) {
  const sections = [
    `# ${c.service.name}`,
    `> ${c.productSummary}`,
    `${c.productAudience}\n\n제품 안내 기준일: ${c.contentUpdated}`,
    c.showcaseDescription,
    `## 개발·운영사\n\n${c.identity}`,
    `## Claude 활용 현황과 개발 계획\n\n${c.claude.current.map(item => `${item.title}: ${item.description}`).join('\n\n')}\n\n${c.claude.writing}\n\n계획: ${c.claude.planned}\n\n${c.claude.evaluation}\n\n출처: ${siteUrl}/#claude`,
    `## Product summary in English\n\n${c.englishSummary}`,
    `[Studio 사용 가이드](${c.service.url}/guide): 준비할 자료, 제작 순서, 결과물과 제공 범위.`,
    `## 공식 페이지\n\n- [회사 및 제품 소개](${siteUrl}/): 운영사와 제품 기능\n- [상세 기능](${siteUrl}/#details-title): 탐색과 제작 단계별 설명\n- [자주 묻는 질문](${siteUrl}/#faq): 사용 범위와 이용 방법\n- [작품 둘러보기](${c.service.url}/): 기본 화면, 작품 탐색\n- [내 제작 보드](${c.service.url}/board): 나의 콘텐츠 기획과 제작\n- [멤버십 미리보기](${c.service.url}/membership): Free·Creator·Pro 구성안과 결제 미리보기\n- [MCP 연결 안내](${c.service.url}/mcp): Claude Code·Codex 연결과 계정 인증\n- [전체 제품 안내 텍스트](${siteUrl}/llms-full.txt): 공개 본문의 텍스트 버전`,
    `## Studio 시작 방법\n\n${c.entryPoints.map(entry => `- [${entry.label}](${c.service.url}${entry.path}): ${entry.description}`).join('\n')}`,
  ];
  if (full) {
    sections.push(`## 제작 흐름\n\n${c.workflow.map((step, i) => `${i + 1}. ${step.title}: ${step.description}`).join('\n')}`);
    sections.push(`## 제품 기능\n\n${c.productDetails.map(detail => `### ${detail.title}\n\n${detail.description}\n\n${detail.points.map(point => `- ${point}`).join('\n')}`).join('\n\n')}`);
    sections.push(`## 멤버십 미리보기\n\n${c.membership.description}\n\n${c.membership.plans.map(plan => `### ${plan.name} — ${plan.price}\n\n${plan.description}\n\n${plan.features.map(feature => `- ${feature}`).join('\n')}`).join('\n\n')}\n\n${c.membership.notice}`);
  }
  sections.push(`## 자주 묻는 질문\n\n${c.faq.map(item => `### ${item.question}\n\n${item.answer}\n\n출처: ${siteUrl}/#${item.id}`).join('\n\n')}`);
  sections.push(`## 운영사\n\n- 회사: ${c.name}\n- 대표자: ${c.representative}\n- 사업자등록번호: ${c.registration}\n- 주소: ${c.address}\n- 개업일 및 사업자등록일: ${c.openingDate}\n- 문의: ${c.email}`);
  return sections.join('\n\n') + '\n';
}
