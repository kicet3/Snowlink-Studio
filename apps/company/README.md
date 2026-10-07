# SnowLink 회사 소개

메인 Studio와 별개로 배포하는 Next.js 프론트엔드입니다. 이 폴더의 소스·의존성만 사용하며 FastAPI, Studio 로그인 또는 생성 엔진이 필요하지 않습니다. 회사 정보와 서비스 버튼 주소를 환경변수로 설정합니다.

## 로컬 실행

```sh
cd apps/company
npm ci
cp .env.example .env.local
npm run dev
```

접속: http://localhost:3420

운영 빌드: `npm run build`, 운영 실행: `npm start`.

## Vercel

1. GitHub `kicet3/Snowlink-Studio`를 별도 Vercel 프로젝트로 가져옵니다.
2. **Root Directory: `apps/company`**, Framework Preset: Next.js를 선택합니다. 이 폴더 밖의 소스를 포함할 필요는 없습니다.
3. Environment Variables에 `.env.example`의 값을 설정합니다. 최소 `SERVICE_URL`을 실제 서비스 접속 주소로 설정하세요. 나머지 회사 정보는 제공된 기본값을 사용하며 같은 이름의 환경변수로 변경할 수 있습니다.
4. Deploy를 실행합니다. 환경변수를 변경한 뒤에는 재배포합니다.

Vercel에는 회사 소개용 공개 정보만 등록하세요. 서비스의 Google·AI 인증값, 관리자 비밀번호, `.data`는 이 앱에서 사용하지 않습니다. `SERVICE_URL`이 비어 있으면 서비스 이동 버튼을 표시하지 않습니다. Tailscale 주소를 쓰면 해당 네트워크에 접근할 수 있는 방문자만 서비스를 열 수 있습니다.

[루트 디렉터리 설정](https://vercel.com/docs/project-configuration/project-settings), [환경변수 설정](https://vercel.com/docs/environment-variables).

## 검색 노출 제외

SEO description, keywords, canonical, Open Graph, Twitter 카드, 구조화 데이터와 sitemap을 생성하지 않습니다. HTML robots 메타 및 모든 응답의 `X-Robots-Tag`에 `noindex, nofollow, noarchive, nosnippet, noimageindex`를 지정하고 `robots.txt`는 모든 사용자 에이전트에 `Disallow: /`를 반환합니다. 이 지시문은 봇에 대한 요청이며 비공개 접근 제어를 대신하지 않습니다.
