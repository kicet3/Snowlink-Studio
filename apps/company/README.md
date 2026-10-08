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

제품명은 `Snowlink Studio`입니다. 회사명과 브랜드는 스노우링크(SnowLink)로 유지합니다. 회사 소개는 `snowlink.team`, Studio는 `studio.snowlink.team`, API는 `api.snowlink.team`을 사용합니다.

## 회사 페이지 디자인

검은 배경과 흰 타이포그래피를 사용합니다. `components/VectorWordmark.jsx`는 사용자가 제공한 Originkit Vector Wordmark를 Next.js 클라이언트 컴포넌트로 적용한 것으로, `SnowLink` 글자에 포인터 반응·점선 외곽선·제어점 효과를 표시합니다.

고정 최소 폭 없이 모바일에 맞춰 줄어들며, 움직임 정지/재개 버튼을 제공합니다. 화면 밖이나 숨겨진 탭에서는 애니메이션을 중지합니다. 동작 줄이기 설정, JavaScript/WebGL 미지원, WebGL 컨텍스트 손실 시에는 정적인 브랜드 이름을 표시합니다. 페이지를 떠날 때 WebGL 리소스와 이벤트를 해제합니다. 색상과 레이아웃은 회사 앱의 `styles/company.css`에만 적용됩니다.

하단 푸터에는 회사·제품 안내 링크와 사업자 정보를 모았습니다. 개업일과 사업자등록일은 모두 `2026년 6월 30일`, 문의 이메일은 `admin@snowlink.team`이며 저작권에도 설립 연도 `2026`을 표시합니다.

## 제품 화면

`components/ProductShowcase.jsx`에서 Studio의 6개 제작 탭 캡처와 설명을 전환합니다. 이미지는 `public/screenshots/*.jpg`에 포함되므로 Studio 서버나 로그인 없이도 표시됩니다. 원본 확대 링크는 새 탭에서 열립니다.

`components/ProductDetails.jsx`는 제작 흐름 4단계와 기획·캐릭터·시나리오·이미지/영상·컷 편집·MCP의 상세 설명을 표시합니다. 문구는 `lib/config.js`의 `workflow`, `productDetails`에서 관리합니다. 콘티 MP4는 무음 미리보기로 안내하며, 구현되지 않은 음성·음악·최종 영상 자동 합성을 제공한다고 설명하지 않습니다.

현재 캡처는 2026년 10월 7일 이름 변경 전 `snowfall studio` UI를 촬영한 이미지입니다. `Snowlink Studio`로 이름을 변경한 뒤의 캡처 갱신은 Mac의 시스템 DNS 캐시 해소 후 진행합니다. 제작 보드, 캐릭터 시트, 시나리오, 트렌드 탐색, 이미지·영상 제작, 컷 편집의 6개 화면이며 설정·OAuth 소개 탭과 캡처는 포함하지 않습니다.

소개용 계정의 예시 캐릭터·기획·컷·플롯을 사용하고, 트렌드는 촬영 당시 공개 수집 결과를 표시합니다. 실제 고객 콘텐츠와 개인 OAuth 정보는 포함하지 않습니다. 이미지는 보정 없이 브라우저 화면을 저장한 JPEG이며 크기는 1474 × 829입니다. 화면 갱신 시 같은 파일명으로 교체하고 `ProductShowcase.jsx`의 이미지 버전도 변경해 이전 캡처 캐시를 구분하세요.

캡처와 검증에는 배포된 프론트를 사용합니다. Mac mini에는 프론트 서버를 상시 또는 임시로 띄우지 않습니다.

[루트 디렉터리 설정](https://vercel.com/docs/project-configuration/project-settings).

## 공개 페이지 크롤링

SEO description, keywords, canonical, Open Graph, Twitter 카드, 구조화 데이터와 sitemap을 생성하지 않습니다. 공개 회사 페이지의 robots 메타와 `X-Robots-Tag` 차단을 제거했으며, `robots.txt`는 모든 사용자 에이전트에 `Allow: /`를 반환합니다. AI 크롤러도 공개 소개 페이지를 읽을 수 있습니다.
