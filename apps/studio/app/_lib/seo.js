export const STUDIO_URL = 'https://studio.snowlink.team';
export const COMPANY_URL = 'https://www.snowlink.team';
export const CONTENT_UPDATED = '2026-10-08';
export const PRODUCT_DESCRIPTION = 'Snowlink Team Studio는 연재 작가와 시리즈 제작자를 위한 AI 창작 작업실입니다. 회차별 소설과 인물·사건·복선의 이야기 기억을 쌓고, 캐릭터 시트와 이미지·영상 장면으로 이어가세요.';
export const AI_CRAWLERS = ['OAI-SearchBot', 'ChatGPT-User', 'GPTBot', 'Claude-SearchBot', 'Claude-User', 'ClaudeBot', 'PerplexityBot', 'Perplexity-User', 'Google-Extended'];
export const PUBLIC_PAGES = [
  { path: '/', title: 'Snowlink Team Studio | AI 캐릭터·소설·이미지·영상 제작', description: PRODUCT_DESCRIPTION },
  { path: '/guide', title: 'AI 캐릭터·소설·영상 제작 사용법 · Snowlink Team Studio', description: '캐릭터 시트를 준비하고 전체 플롯부터 회차별 원고, 이미지·영상과 컷 편집까지 이어가는 Snowlink Team Studio 사용법입니다. 준비할 자료, 단계별 결과물과 현재 제공 범위를 확인하세요.' },
  { path: '/membership', title: '멤버십 미리보기 · Snowlink Team Studio', description: 'Snowlink Team Studio의 Free, Creator, Pro 멤버십 구성안을 비교하세요. 유료 등급은 출시 예정이며 실제 결제 없이 결제 화면을 미리 볼 수 있습니다.' },
  { path: '/mcp', title: 'MCP 연결 안내 · Snowlink Team Studio', description: 'Claude Code·Codex에 Snowlink Team Studio MCP를 연결하는 방법과 OAuth 인증을 안내합니다. 대화로 캐릭터 시트, 회차별 시나리오와 장면 노드를 만들고 웹에서 이어서 편집하세요.' },
];

export function pageMetadata({ path, title, description = PRODUCT_DESCRIPTION, index = false, image, imageAlt }) {
  const canonical = new URL(path, STUDIO_URL);
  if (canonical.origin !== STUDIO_URL) throw new Error('Studio canonical must use the public Studio origin.');
  canonical.search = '';
  canonical.hash = '';
  const url = canonical.href;
  const images = [{ url: new URL(image || '/opengraph-image', STUDIO_URL).href, width: image ? 1536 : 1200, height: image ? 1024 : 630, alt: imageAlt || 'Snowlink Team Studio — 캐릭터에서 이야기로, 이야기에서 장면으로' }];
  return {
    title, description, alternates: { canonical: url },
    robots: { index, follow: true, ...(index ? { googleBot: { index: true, follow: true, 'max-image-preview': 'large', 'max-snippet': -1, 'max-video-preview': -1 } } : {}) },
    openGraph: { type: 'website', locale: 'ko_KR', siteName: 'Snowlink Team Studio', url, title, description, images },
    twitter: { card: 'summary_large_image', title, description, images },
  };
}
export function publicMetadata(path) {
  return pageMetadata({ ...PUBLIC_PAGES.find(page => page.path === path), index: true });
}

export function publicStructuredData(path, { faq = [], type = 'WebPage' } = {}) {
  const page = PUBLIC_PAGES.find(item => item.path === path);
  const url = new URL(path, STUDIO_URL).href;
  return { '@context': 'https://schema.org', '@graph': [
    { '@type': 'Organization', '@id': `${COMPANY_URL}/#organization`, name: 'Snowlink Team', alternateName: '스노우링크 팀', legalName: '스노우링크', url: `${COMPANY_URL}/`, logo: `${STUDIO_URL}/logo.svg` },
    { '@type': 'WebSite', '@id': `${STUDIO_URL}/#website`, name: 'Snowlink Team Studio', url: `${STUDIO_URL}/`, inLanguage: 'ko-KR', publisher: { '@id': `${COMPANY_URL}/#organization` } },
    { '@type': 'WebApplication', '@id': `${COMPANY_URL}/#product`, name: 'Snowlink Team Studio', url: `${STUDIO_URL}/`, description: PRODUCT_DESCRIPTION, applicationCategory: 'MultimediaApplication', operatingSystem: 'Web', publisher: { '@id': `${COMPANY_URL}/#organization` } },
    { '@type': type, '@id': `${url}#webpage`, url, name: page.title, description: page.description, inLanguage: 'ko-KR', dateModified: CONTENT_UPDATED, isPartOf: { '@id': `${STUDIO_URL}/#website` }, about: { '@id': `${COMPANY_URL}/#product` }, ...(path === '/' ? {} : { breadcrumb: { '@id': `${url}#breadcrumb` } }), ...(faq.length ? { hasPart: { '@id': `${url}#faq` } } : {}) },
    ...(path === '/' ? [] : [{ '@type': 'BreadcrumbList', '@id': `${url}#breadcrumb`, itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'Snowlink Team Studio', item: `${STUDIO_URL}/` },
      { '@type': 'ListItem', position: 2, name: page.title.split(' · ')[0], item: url },
    ] }]),
    ...(faq.length ? [{ '@type': 'FAQPage', '@id': `${url}#faq`, mainEntity: faq.map(item => ({ '@type': 'Question', name: item.question, acceptedAnswer: { '@type': 'Answer', text: item.answer } })) }] : []),
  ] };
}
