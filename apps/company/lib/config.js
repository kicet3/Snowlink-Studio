// Only these public company fields enter the page. Service credentials are never read.
export function companyConfig(env = process.env) {
  const value = (key, fallback) => env[key]?.trim() || fallback;
  const lines = (key, fallback) => value(key, fallback).replace(/\\n/g, '\n');
  const serviceUrl = env.SERVICE_URL?.trim() || '';
  if (serviceUrl) {
    let parsed;
    try { parsed = new URL(serviceUrl); } catch { throw new Error('SERVICE_URL must be an absolute HTTP(S) URL.'); }
    if (!['https:', 'http:'].includes(parsed.protocol) || parsed.username || parsed.password) {
      throw new Error('SERVICE_URL must be an HTTP(S) URL without embedded credentials.');
    }
  }
  const email = value('COMPANY_EMAIL', 'snowlink@snowlink.team');
  if (!/^[^\s@<>]+@[^\s@<>]+\.[^\s@<>]+$/.test(email)) throw new Error('COMPANY_EMAIL must be a valid email address.');
  return {
    name: value('COMPANY_NAME', '스노우링크(SnowLink)'),
    brand: value('COMPANY_BRAND', 'SnowLink'),
    registration: value('COMPANY_REGISTRATION_NUMBER', '335-17-02746'),
    openingDate: value('COMPANY_OPENING_DATE', '6월 30일'),
    registrationDate: value('COMPANY_REGISTRATION_DATE', '6월 30일'),
    representative: value('COMPANY_REPRESENTATIVE', '이현대'),
    address: value('COMPANY_ADDRESS', '관악구 조원로 8길 10'),
    email,
    service: {
      url: serviceUrl,
      name: value('SERVICE_NAME', 'snowlink-studio'),
      button: value('SERVICE_BUTTON_LABEL', 'snowlink-studio 시작하기'),
      caption: value('SERVICE_CAPTION', 'AI 콘텐츠 제작 작업실'),
      description: value('SERVICE_DESCRIPTION', '캐릭터에서 이야기로, 이야기에서 장면으로.'),
    },
    headline: lines('COMPANY_HEADLINE', '작은 영감을,\n완성된 이야기로'),
    introduction: lines('COMPANY_INTRODUCTION', '스노우링크는 아이디어와 창작 도구를 연결합니다.\n만들고 싶은 이야기에 더 오래 집중할 수 있도록.'),
    aboutTitle: lines('COMPANY_ABOUT_TITLE', '도구 사이의 번거로움을 줄이고,\n창작의 흐름을 이어갑니다.'),
    about: value('COMPANY_ABOUT', '소재를 찾고, 캐릭터를 만들고, 이야기를 쓴 다음 영상으로 옮기는 일. 창작에는 여러 단계가 필요합니다. 스노우링크는 이 과정이 하나의 작업실에서 자연스럽게 이어지는 경험을 만듭니다.'),
    contactTitle: value('COMPANY_CONTACT_TITLE', '함께 만들 이야기가 있나요?'),
    contactDescription: value('COMPANY_CONTACT_DESCRIPTION', '제품과 사업 관련 문의를 기다립니다.'),
    features: [
      ['people', '일관된 캐릭터', '사진이나 아이디어를 바탕으로 AI와 대화하고, 여러 장면에 활용할 캐릭터 시트를 만듭니다.'],
      ['cards', '이어지는 이야기', '전체 플롯부터 회차별 원고까지 순서대로 작성하고, 인물의 변화와 복선을 구조화해 기억합니다.'],
      ['film', '장면으로 완성', '애니메이션과 실사 영화 스타일을 고르고, 이미지·영상 생성과 컷 편집으로 제작을 이어갑니다.'],
    ].map(([icon, title, description], i) => ({ icon,
      title: value(`SERVICE_FEATURE_${i + 1}_TITLE`, title),
      description: value(`SERVICE_FEATURE_${i + 1}_DESCRIPTION`, description),
    })),
  };
}
