# Snow & Autumn 디자인 시스템

눈처럼 밝은 표면에 낙엽의 테라코타·황토색을 사용합니다. 차가운 서리빛은 미디어와 이미지 영역에, 소나무색은 연결·완료 상태에 사용합니다. 패턴은 작은 눈 점과 눈 결정·잎 모양으로 제한하며 콘텐츠 영역의 가독성을 우선합니다.

## 단일 토큰 원본

`tokens.json`이 색상·타이포그래피·간격·모서리·그림자·포커스·모션의 원본입니다.

| 계층 | 예시 | 사용처 |
| --- | --- | --- |
| 팔레트 | `palette-snow-50`, `palette-maple-600` | 의미 토큰을 정의할 때만 사용 |
| 의미 | `color-background`, `color-accent`, `color-info-soft` | 컴포넌트의 색상 |
| 크기·동작 | `space-4`, `radius-lg`, `text-md`, `duration-fast` | 컴포넌트 규칙 |

`{palette-maple-600}`처럼 다른 토큰을 참조할 수 있습니다. 생성기는 누락된 참조와 순환 참조를 거부합니다.

```sh
npm run theme:build
npm run theme:check
```

빌드 결과:

- `public/styles/tokens.css`: 브라우저에서 사용하는 CSS 변수
- `design/tokens.resolved.json`: ShortGPT 콘티 렌더러가 사용하는 해석된 팔레트
- `public/logo.svg`: 동일한 팔레트로 생성한 브랜드 마크
- `public/index.html`의 `theme-color`: 브라우저 주소 표시줄 색상

`npm start`, `npm run dev` 실행 전에도 자동 생성합니다. 실행 중 토큰을 변경했다면 `theme:build` 후 브라우저를 새로고침하세요. `npm test`는 생성 파일의 불일치도 검사합니다. 생성된 CSS·JSON·로고를 직접 수정하지 않습니다.

## 공용 컴포넌트

`public/modules/components.js`가 공용 HTML 컴포넌트를, `public/styles/components.css`가 시각 규칙을 관리합니다. 기존 프로젝트의 ES 모듈 방식을 유지하여 별도 프레임워크나 패키지가 필요하지 않습니다.

| 컴포넌트 | 주요 옵션 | 실제 사용 화면 |
| --- | --- | --- |
| `button` | `variant`, `iconName`, `attrs` | 보드, 캐릭터, 컷 편집, 폼, 도구 연결 |
| `badge` | `tone`, `iconName`, `className` | 콘텐츠 형식, 캐릭터 태그, 도구 상태 |
| `pageHeading` | `title`, `description`, `actionsHtml`, `ornament` | 보드, 캐릭터, 컷 편집 |
| `emptyState` | `title`, `description`, `actionsHtml` | 캐릭터, 컷 편집, 도구 연결 실패 |
| `actionCard` | `title`, `description`, `tone`, `attrs` | 콘텐츠 형식 선택 |
| `field` | `label`, `name`, `value`, `rows`, `options`, `attrs` | 기획·캐릭터 등록, 컷 수정 |
| `dialogHeading` | `title` | 모든 편집·안내 대화상자 |

```js
import { button, field, badge } from './components.js';

button('콘텐츠 추가', {
  iconName: 'plus',
  attrs: { 'data-new-production': 'story' },
});
field({ label: '제목', name: 'title', value: item.title, attrs: { required: true } });
badge('연결됨', { tone: 'pine' });
```

버튼 기본 타입은 `button`입니다. 폼 저장 동작은 `attrs: { type: 'submit' }`을 명시합니다. 텍스트·속성 값은 컴포넌트에서 이스케이프합니다. `actionsHtml`, `illustrationHtml`에는 앱이 만든 마크업만 전달하며 사용자 입력을 직접 넣지 않습니다.

색상 역할은 `maple`(주요 행동·썰), `ochre`(제작·카드뉴스·주의), `frost`(미디어·YouTube), `pine`(완료·연결·태그), `neutral`(보조 정보)입니다. 상태는 색상과 함께 텍스트·아이콘으로 표시합니다.

`surface-card`, `seasonal-surface`, 폼 컨트롤, 대화상자와 알림도 공용 스타일을 사용합니다. 화면별 파일은 배치와 콘텐츠별 크기만 정의하고, 색상 리터럴을 추가하지 않습니다. 반응형 분기점과 이미지·영상의 고유 비율은 페이지 레이아웃에서 관리합니다.

## 적용 범위와 검증

통합 작업실의 보드·캐릭터·트렌드·이미지/영상·ShortGPT·OAuth 설정 화면, 왼쪽 사이드바·공통 툴바·대화상자, 새로 출력하는 콘티의 팔레트에 적용됩니다. 이미지 제작은 `vendor/ima2-ui`의 원래 React 컴포넌트를 직접 마운트하며, `studio-build.mjs`에서 CSS 범위를 한정하고 `public/styles/media-theme.css`에서 의미 색상을 연결합니다. 원래 화면 배치·타이포그래피·기능을 유지합니다. 트렌드는 `vendor/trend-ui`의 소스를 전용 프레임에서 제공하고 공용 색상 토큰을 로드합니다. 과거에 출력한 MP4는 그대로 유지됩니다.

초기 팔레트 검증에서 일반 글자 대비는 4.5:1 이상, 입력 테두리 대비는 3:1 이상을 확인했습니다. 키보드 포커스, 비활성 상태, 작은 화면의 접이식 사이드바와 한 열 카드 배치, `prefers-reduced-motion`을 지원합니다. 토큰을 바꾸면 대비와 실제 화면을 다시 확인하세요.

추가 레이아웃은 `public/styles/studio.css`에서 관리합니다. 색상은 의미 토큰을 재사용하며, 메뉴는 해시 링크와 `aria-current`, 하위 필터는 `aria-pressed`로 선택 상태를 표시합니다.
