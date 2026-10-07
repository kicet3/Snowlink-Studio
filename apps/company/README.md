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

## 회사 페이지 디자인

검은 배경과 흰 타이포그래피를 사용합니다. `components/VectorWordmark.jsx`는 사용자가 제공한 Originkit Vector Wordmark를 Next.js 클라이언트 컴포넌트로 적용한 것으로, `SnowLink` 글자에 포인터 반응·점선 외곽선·제어점 효과를 표시합니다.

고정 최소 폭 없이 모바일에 맞춰 줄어들며, 움직임 정지/재개 버튼을 제공합니다. 화면 밖이나 숨겨진 탭에서는 애니메이션을 중지합니다. 동작 줄이기 설정, JavaScript/WebGL 미지원, WebGL 컨텍스트 손실 시에는 정적인 브랜드 이름을 표시합니다. 페이지를 떠날 때 WebGL 리소스와 이벤트를 해제합니다. 색상과 레이아웃은 회사 앱의 `styles/company.css`에만 적용됩니다.

## 제품 화면

`components/ProductShowcase.jsx`에서 Studio의 6개 제작 탭 캡처와 설명을 전환합니다. 이미지는 `public/screenshots/*.jpg`에 포함되므로 Studio 서버나 로그인 없이도 표시됩니다. 원본 확대 링크는 새 탭에서 열립니다.

캡처는 2026년 10월 7일 Studio의 실제 Next.js 화면을 소개용 예시 데이터로 열어 저장했습니다. 운영 계정, 개인 OAuth 정보, 실제 고객 콘텐츠를 사용하지 않았습니다. 화면을 갱신할 때도 예시 작업실에서 캡처하고, 계정 정보가 보이지 않는지 확인한 후 같은 파일명으로 교체하세요. 현재 캡처 크기는 1474 × 829입니다.

[루트 디렉터리 설정](https://vercel.com/docs/project-configuration/project-settings).

## 검색 노출 제외

SEO description, keywords, canonical, Open Graph, Twitter 카드, 구조화 데이터와 sitemap을 생성하지 않습니다. HTML robots 메타 및 모든 응답의 `X-Robots-Tag`에 `noindex, nofollow, noarchive, nosnippet, noimageindex`를 지정하고 `robots.txt`는 모든 사용자 에이전트에 `Disallow: /`를 반환합니다. 이 지시문은 봇에 대한 요청이며 비공개 접근 제어를 대신하지 않습니다.
