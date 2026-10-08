import { companyConfig } from './config.js';

const c = companyConfig();
export const siteUrl = c.siteUrl;
export const title = `${c.service.name} | AI 캐릭터·소설·이미지·영상 제작`;
export const description = '캐릭터 시트부터 소설·시나리오, 이미지·영상 생성과 컷 편집까지. Snowlink Studio에서 회차별 플롯과 인물·복선의 맥락을 이어 쓰고, Claude Code·Codex MCP로 제작 작업을 연결하세요.';
export const shareImage = {
  url: `${siteUrl}/opengraph-image`, width: 1200, height: 630,
  alt: 'Snowlink Studio — AI 캐릭터 시트, 스토리와 영상 제작 작업실',
};

export const metadata = {
  metadataBase: new URL(siteUrl),
  title,
  description,
  applicationName: c.service.name,
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
        name: c.name, alternateName: c.brand, url: `${siteUrl}/`,
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
      },
      {
        '@type': 'WebApplication', '@id': `${siteUrl}/#product`,
        name: c.service.name, url: c.service.url, description: c.productSummary,
        applicationCategory: 'MultimediaApplication', operatingSystem: 'Web', inLanguage: 'ko-KR',
        publisher: { '@id': `${siteUrl}/#organization` },
        mainEntityOfPage: { '@id': `${siteUrl}/#webpage` },
        image: shareImage.url, screenshot: `${siteUrl}/screenshots/board.jpg`,
        featureList: c.features.map(feature => `${feature.title}: ${feature.description}`),
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
    `## 공식 페이지\n\n- [회사 및 제품 소개](${siteUrl}/): 운영사와 제품 기능\n- [상세 기능](${siteUrl}/#details-title): 제작 단계별 설명\n- [자주 묻는 질문](${siteUrl}/#faq): 사용 범위와 이용 방법\n- [Studio](${c.service.url}): 웹 작업실\n- [MCP 연결 안내](${c.service.url}/mcp): Claude Code·Codex 연결과 계정 인증\n- [전체 제품 안내 텍스트](${siteUrl}/llms-full.txt): 공개 본문의 텍스트 버전`,
  ];
  if (full) {
    sections.push(`## 제작 흐름\n\n${c.workflow.map((step, i) => `${i + 1}. ${step.title}: ${step.description}`).join('\n')}`);
    sections.push(`## 제품 기능\n\n${c.productDetails.map(detail => `### ${detail.title}\n\n${detail.description}\n\n${detail.points.map(point => `- ${point}`).join('\n')}`).join('\n\n')}`);
  }
  sections.push(`## 자주 묻는 질문\n\n${c.faq.map(item => `### ${item.question}\n\n${item.answer}\n\n출처: ${siteUrl}/#${item.id}`).join('\n\n')}`);
  sections.push(`## 운영사\n\n- 회사: ${c.name}\n- 대표자: ${c.representative}\n- 사업자등록번호: ${c.registration}\n- 주소: ${c.address}\n- 개업일 및 사업자등록일: ${c.openingDate}\n- 문의: ${c.email}`);
  return sections.join('\n\n') + '\n';
}
