# Snowlink Studio 프론트엔드

제품 표시 이름은 `app/_lib/branding.js`에서 관리합니다. MCP 연결 별칭·패키지 이름·저장소 키는 기존 연동을 유지하기 위해 변경하지 않습니다.

운영 도메인은 Studio `studio.snowlink.team`, API `api.snowlink.team`, 회사 소개 `snowlink.team`입니다. 제품명 변경과 별개로 이 주소를 유지합니다.

Studio 화면을 Next.js App Router와 React로 구성한 독립 앱입니다. 제작 보드, 캐릭터, 시나리오, 이미지·영상, 컷 편집, 트렌드와 설정 화면의 소스 및 빌드 의존성을 이 폴더에 포함합니다. 회사 소개는 별도 앱인 `apps/company`에서 배포합니다.

## 프로젝트 구조

```text
apps/studio/
├── app/
│   ├── layout.jsx              # 로그인 상태·공통 메뉴·전역 스타일
│   ├── page.jsx                # /board로 이동
│   ├── board/page.jsx
│   ├── characters/page.jsx
│   ├── scenarios/page.jsx
│   ├── trends/page.jsx
│   ├── ima2/page.jsx
│   ├── ima2/graph/[sessionId]/page.jsx
│   ├── shortgpt/page.jsx
│   ├── login/page.jsx           # 별도 계정 로그인
│   ├── mcp/page.jsx             # 공개 MCP 안내·연결 관리
│   ├── profile/page.jsx         # 계정 로그인 필요
│   ├── settings/page.jsx
│   ├── settings/google/[result]/page.jsx
│   ├── oauth/[requestId]/page.jsx
│   ├── _components/            # 공용 React 컴포넌트
│   ├── _lib/                   # API·데이터 유틸리티
│   ├── _styles/                # 스타일·디자인 토큰
│   └── _vendor/                # 자체 포함한 React 미디어 편집기
├── public/                     # 로고·폰트·robots.txt
├── scripts/                    # Studio 전용 빌드 변환
├── tests/
├── next.config.mjs
├── package.json
├── package-lock.json
└── vercel.json
```

화면은 각 경로의 `page.jsx`에서 렌더링합니다. 밑줄로 시작하는 폴더는 라우트로 노출하지 않는 내부 코드입니다. `apps/company`의 소스나 의존성을 가져오지 않으며 회사 소개 링크는 외부 URL로만 이동합니다.

## 화면 테마

회사 페이지와 같은 흑백 배경·타이포그래피·얇은 테두리를 `app/_styles/monochrome.css`에서 적용합니다. 원본 디자인 토큰 생성과 별도로 관리하며, 오류·연결 상태에는 구분 색상을 유지합니다.

로그인의 `VectorWordmark.jsx`는 사용자 제공 Originkit 소스를 바탕으로 한 Studio 자체 컴포넌트입니다. 움직임 정지, 동작 줄이기 설정, WebGL 미지원 시 정적 표시와 리소스 정리를 지원합니다. 작업 화면에는 정적인 벡터 장식을 사용합니다.

이미지·영상 편집기는 기본 다크 테마를 사용하며, 사용자가 저장한 라이트·시스템 선택을 유지합니다. 편집기 색상 매핑과 태블릿 노드 캔버스 배치는 `media-theme.css`에서 관리합니다.

## 로컬 실행

```sh
cd apps/studio
npm ci
cp .env.example .env.local
npm run dev
```

접속 주소는 `http://localhost:3410`입니다. 로컬 API 서버는 별도로 실행해야 합니다. 운영 빌드는 `npm run build`, 빌드한 프론트 실행은 `npm start`입니다. 저장소 루트에서도 `npm run studio:dev`, `npm run studio:build`, `npm run studio:start`를 사용할 수 있습니다.

## Vercel 배포

1. `kicet3/Snowlink-Studio` 저장소를 가져오고 **Root Directory를 `apps/studio`**로 지정합니다.
2. Framework Preset은 **Next.js**를 선택합니다. 설치와 빌드 명령은 `vercel.json`에 설정되어 있습니다.
3. 서비스 도메인은 **`studio.snowlink.team`**으로 연결합니다.
4. 백엔드 기본 주소는 **`https://api.snowlink.team`**입니다. 운영 환경에 `.env.example`의 로컬 주소를 입력하지 마세요.

`STUDIO_API_ORIGIN`으로 API 원본 주소를 변경할 수 있습니다. 회사 소개 링크의 기본값은 `https://snowlink.team`이며 `NEXT_PUBLIC_COMPANY_SITE_URL`로 변경할 수 있습니다. 설정 변경 후 재배포해야 합니다.

브라우저는 같은 출처의 `/api`, `/integrations`, `/media`, `/renders`, `/generated` 경로를 사용하고 Next.js가 백엔드로 전달합니다. OAuth 비밀값이나 모델 키는 프론트 환경변수에 넣지 않습니다. 백엔드 도메인과 HTTPS가 준비되어야 로그인·생성 기능을 사용할 수 있습니다. MCP 연결 및 OAuth discovery는 API 도메인에서 제공합니다.

이 앱의 빌드 성공은 FastAPI 전환과 실제 서비스 배포 완료를 의미하지 않습니다. 백엔드 전환 및 통합 검증은 별도로 진행합니다.

## 공개 페이지 크롤링

회사 소개와 Studio의 공개 안내를 검색·AI 검색에서 이해할 수 있도록 구성합니다. Studio의 `/`, `/guide`, `/membership`, `/mcp`는 계정과 무관한 공개 내용을 빌드 시 미리 렌더링하고 색인을 허용합니다. 이 네 경로만 `/sitemap.xml`에 포함하며 실제 내용 수정일을 `lastModified`로 사용합니다. 개인 작업·로그인·설정·프로필·OAuth·결제와 가상 작품/창작자 상세는 `noindex, follow`를 유지합니다.

`app/_lib/seo.js`에서 페이지별 제목·설명·canonical·Open Graph·Twitter 카드와 색인 정책을 관리합니다. 동적 작품·창작자에는 해당 이미지와 요약을 제공하며 없는 항목은 404로 처리합니다. `/explore`는 `/`로 308 이동합니다. 추적·결제 주기·로그인 복귀 쿼리는 canonical에 포함하지 않습니다. `/opengraph-image`는 이 앱의 예시 이미지로 생성하는 1200 × 630 PNG로 회사 앱 배포에 의존하지 않습니다.

`app/robots.js`에서 모든 봇과 GPTBot·OAI-SearchBot·ChatGPT-User·ClaudeBot·Claude-SearchBot·Claude-User·PerplexityBot·Perplexity-User·Google-Extended를 명시적으로 허용합니다. 검색용과 학습용 봇의 목적은 다르며 허용 자체가 검색 노출을 보장하지는 않습니다. 크롤링 허용과 계정 인증은 별개입니다.

`/guide`는 단계별 준비물·작업 방법·결과물·예시와 FAQ를 제공하며 `/llms.txt`, `/llms-full.txt`가 같은 공개 데이터에서 생성됩니다. JSON-LD는 운영사·웹사이트·웹앱·페이지·경로와 실제 표시한 FAQ를 설명합니다. 허구의 평점·가격·실사용자 실적은 추가하지 않습니다. [검증 방법](../../docs/seo-geo.md).

## 공개 탐색과 멤버십 미리보기

- `/`가 기본 작품 탐색 화면입니다. `/board`는 내 제작 보드로 유지합니다. 검색·종류 필터·정렬, `/explore/[slug]` 작품 상세, 소설 회차 읽기, `/creators/[handle]` 창작자별 작품 목록을 제공합니다.
- `app/_lib/showcase-data.json`의 가상 창작자 3명, 캐릭터 3개, 소설 3개/6개 회차, 이미지 콘텐츠 3개를 사용합니다. `public/showcase/*.png`는 image_gen으로 생성한 원본이며 프롬프트는 내부 문서 [`docs/showcase-images.md`](docs/showcase-images.md)에 있습니다. Next Image로 전달 크기를 최적화합니다.
- 실제 사용자의 비공개 작품을 조회하거나 자동 공개하지 않습니다. 실제 공개 게시 API와 운영 DB 연동 전까지는 목업입니다. 탐색 첫 화면은 색인을 허용합니다. 사용자 요청에 따라 공개 화면·검색 설명·AI 안내문에서 목업·예시 창작자 표시는 제거했습니다. 개별 예시 작품과 가상 창작자 상세는 검색엔진에 실제 작품으로 오인되지 않도록 noindex를 유지합니다.
- `/membership`은 Free·Creator·Pro 구성안입니다. 유료 가격은 모두 **출시 예정**입니다. `/checkout?plan=creator&cycle=monthly`에서 플랜·월간/연간·결제 수단 선택과 완료 화면을 미리 확인합니다.
- 카드/계좌 번호를 수집하지 않고 결제 API·PG·구독 저장을 호출하지 않습니다. 화면 상태만 바뀌며 새로고침하면 초기 상태로 돌아갑니다. 등급별 기능 제한이나 실제 권한 변경도 적용하지 않습니다.
- 탐색·작품·창작자·멤버십·결제 미리보기는 세션 로딩이나 API 장애와 관계없이 열립니다. 기존 설정·프로필 인증은 유지합니다.

DB 관계 설계와 실행 가능한 PostgreSQL DDL·목업 시드는 [`../../database/README.md`](../../database/README.md)를 참고하세요. 운영 저장소 이전은 실행하지 않았습니다.

## 접근 및 기본 AI

일반 제작 페이지는 방문자 세션으로 로그인 없이 사용할 수 있습니다. `/settings`와 `/profile`은 `/login?next=...`로 이동하며 로그인 후 원래 페이지로 돌아옵니다. 제공업체 OAuth 로그인과 Provider 선택 UI는 표시하지 않습니다. 서버의 기존 OAuth 연결을 사용하며 대화·기획은 GPT, 이미지·영상은 Grok이 기본입니다. Claude API 키를 프론트 환경변수에 설정할 필요가 없습니다.

MCP 설명은 `/mcp`에서 누구나 읽을 수 있습니다. MCP 연결 인증과 계정 작업 접근은 로그인·OAuth 승인이 필요합니다. `/oauth/[requestId]` 승인 요청은 별도 로그인 후 이어집니다. 방문자 작업실과 계정 작업실은 분리됩니다.
