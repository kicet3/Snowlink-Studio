# SnowLink 회사 소개

메인 Studio와 별개로 배포하는 Next.js 프론트엔드입니다. 이 폴더의 소스·의존성만 사용하며 FastAPI, Studio 로그인 또는 생성 엔진이 필요하지 않습니다. 회사 정보·날짜·이메일·서비스 버튼 주소와 모든 소개 문구는 `lib/config.js`에 고정되어 있습니다. 환경변수 설정은 필요하지 않습니다.

## 로컬 실행

```sh
cd apps/company
npm ci
npm run dev
```

접속: http://localhost:3420

운영 빌드: `npm run build`, 운영 실행: `npm start`.

## Vercel

1. GitHub `kicet3/Snowlink-Studio`를 별도 Vercel 프로젝트로 가져옵니다.
2. **Root Directory: `apps/company`**, Framework Preset: Next.js를 선택합니다. 이 폴더 밖의 소스를 포함할 필요는 없습니다.
3. 환경변수 입력 없이 Deploy를 실행합니다. 기존에 등록한 `COMPANY_*`, `SERVICE_*` 환경변수는 사용하지 않으므로 삭제해도 됩니다.
4. 회사 정보나 서비스 주소를 변경하려면 `lib/config.js`를 수정하고 재배포합니다.

서비스 버튼은 `https://studio.snowlink.team`으로 연결됩니다.

[루트 디렉터리 설정](https://vercel.com/docs/project-configuration/project-settings).

## 검색 노출 제외

SEO description, keywords, canonical, Open Graph, Twitter 카드, 구조화 데이터와 sitemap을 생성하지 않습니다. HTML robots 메타 및 모든 응답의 `X-Robots-Tag`에 `noindex, nofollow, noarchive, nosnippet, noimageindex`를 지정하고 `robots.txt`는 모든 사용자 에이전트에 `Disallow: /`를 반환합니다. 이 지시문은 봇에 대한 요청이며 비공개 접근 제어를 대신하지 않습니다.
