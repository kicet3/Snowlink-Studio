// Public UI proposal only. These values do not grant access or enforce quotas.
export const MEMBERSHIP_PLANS = [
  {
    id: 'free', name: 'Free', label: '첫 이야기를 위한 시작', price: '무료',
    description: '작업실을 둘러보고 나에게 맞는 제작 흐름을 발견하세요.',
    features: ['제작 보드와 트렌드 탐색', '캐릭터·시나리오 제작 흐름 살펴보기', '이미지·영상과 컷 편집 화면', '공개 MCP 연결 안내'],
  },
  {
    id: 'creator', name: 'Creator', label: '꾸준히 만드는 크리에이터', price: '출시 예정', recommended: true,
    description: '캐릭터와 이야기를 쌓아가며 개인 콘텐츠 제작을 이어가는 구성입니다.',
    features: ['Free의 기본 제작 흐름', '캐릭터 시트·프롬프트 템플릿 확장', '회차별 원고와 복선 관리 중심 구성', '이미지·영상 생성 이용량 확장 예정', 'MCP를 통한 대화형 제작'],
  },
  {
    id: 'pro', name: 'Pro', label: '더 긴 이야기, 더 많은 장면', price: '출시 예정',
    description: '장편 시리즈와 여러 콘텐츠를 지속적으로 제작하는 분을 위한 구성입니다.',
    features: ['Creator의 제작 구성', '장편·다회차 프로젝트를 위한 이용량', '캐릭터·스타일 템플릿 활용 확대', '이미지·영상 생성 이용량 추가 확대 예정', '생성 작업 우선 처리 검토 중'],
  },
];

export const MEMBERSHIP_COMPARISON = [
  { label: '권장 작업', values: ['작업실 탐색', '개인 콘텐츠 제작', '장편·다회차 제작'] },
  { label: '캐릭터·프롬프트 템플릿', values: ['기본 흐름', '활용 확대 예정', '확장 구성 예정'] },
  { label: '소설·시나리오', values: ['작성 흐름 확인', '연재·복선 관리 중심', '긴 시리즈 중심'] },
  { label: '이미지·영상 생성 이용량', values: ['출시 시 안내', '확대 예정', '추가 확대 예정'] },
  { label: '작업 우선 처리', values: ['기본', '기본', '검토 중'] },
  { label: '정식 요금·상세 한도', values: ['무료', '출시 시 안내', '출시 시 안내'] },
];

export const BILLING_CYCLES = [
  { id: 'monthly', label: '월간', description: '매월 결제하는 구성' },
  { id: 'yearly', label: '연간', description: '1년 단위로 결제하는 구성' },
];

export function getPaidPlan(id) {
  return MEMBERSHIP_PLANS.find(plan => plan.id === id && plan.id !== 'free');
}
