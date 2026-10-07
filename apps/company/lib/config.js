// All public company details, page copy and the service URL are fixed here.
export function companyConfig() {
  return {
    name: '스노우링크(SnowLink)',
    brand: 'SnowLink',
    registration: '335-17-02746',
    openingDate: '6월 30일',
    registrationDate: '6월 30일',
    representative: '이현대',
    address: '관악구 조원로 8길 10',
    email: 'snowlink@snowlink.team',
    service: {
      url: 'https://studio.snowlink.team',
      name: 'snowlink-studio',
      button: 'snowlink-studio 시작하기',
      caption: 'AI 콘텐츠 제작 작업실',
      description: '캐릭터에서 이야기로, 이야기에서 장면으로.',
    },
    headline: '작은 영감을,\n완성된 이야기로',
    introduction: '스노우링크는 아이디어와 창작 도구를 연결합니다.\n만들고 싶은 이야기에 더 오래 집중할 수 있도록.',
    aboutTitle: '도구 사이의 번거로움을 줄이고,\n창작의 흐름을 이어갑니다.',
    about: '소재를 찾고, 캐릭터를 만들고, 이야기를 쓴 다음 영상으로 옮기는 일. 창작에는 여러 단계가 필요합니다. 스노우링크는 이 과정이 하나의 작업실에서 자연스럽게 이어지는 경험을 만듭니다.',
    contactTitle: '함께 만들 이야기가 있나요?',
    contactDescription: '제품과 사업 관련 문의를 기다립니다.',
    features: [
      { icon: 'people', title: '일관된 캐릭터', description: '사진이나 아이디어를 바탕으로 AI와 대화하고, 여러 장면에 활용할 캐릭터 시트를 만듭니다.' },
      { icon: 'cards', title: '이어지는 이야기', description: '전체 플롯부터 회차별 원고까지 순서대로 작성하고, 인물의 변화와 복선을 구조화해 기억합니다.' },
      { icon: 'film', title: '장면으로 완성', description: '애니메이션과 실사 영화 스타일을 고르고, 이미지·영상 생성과 컷 편집으로 제작을 이어갑니다.' },
    ],
  };
}
