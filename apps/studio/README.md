# snowlink-studio 프론트엔드

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

`STUDIO_API_ORIGIN`으로 API 원본 주소를 변경할 수 있습니다. `NEXT_PUBLIC_COMPANY_SITE_URL`을 설정하면 메뉴에 회사 소개 링크를 표시하고, 비워두면 숨깁니다. 설정 변경 후 재배포해야 합니다.

브라우저는 같은 출처의 `/api`, `/integrations`, `/media`, `/renders`, `/generated` 경로를 사용하고 Next.js가 백엔드로 전달합니다. OAuth 비밀값이나 모델 키는 프론트 환경변수에 넣지 않습니다. 백엔드 도메인과 HTTPS가 준비되어야 로그인·생성 기능을 사용할 수 있습니다. MCP 연결 및 OAuth discovery는 API 도메인에서 제공합니다.

이 앱의 빌드 성공은 FastAPI 전환과 실제 서비스 배포 완료를 의미하지 않습니다. 백엔드 전환 및 통합 검증은 별도로 진행합니다.

## 검색 노출 제외

SEO description, canonical, Open Graph, 구조화 데이터와 sitemap을 생성하지 않습니다. robots 메타와 `X-Robots-Tag`로 색인을 제외하고 `public/robots.txt`에서 모든 봇에 `Disallow: /`를 지정합니다.
