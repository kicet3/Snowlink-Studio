# 회사 소개와 Studio 검색·AI 검색 대응

적용 기준일: 2026-10-08. 두 Next.js 앱은 각각 독립적으로 빌드·배포한다.

## 확인한 문제와 변경

| 항목 | 이전 | 적용 후 |
| --- | --- | --- |
| Studio 첫 화면 | `noindex`, canonical·OG 없음 | 공개 쇼케이스임을 설명하는 색인 가능 페이지, 자체 canonical·OG |
| Studio 멤버십 | `noindex`, canonical·OG 없음 | 공개 구성안으로 색인 허용, 실제 결제 미지원 명시 |
| Studio 공개 문서 | MCP 안내만 사이트맵에 포함 | 첫 화면·사용 가이드·멤버십·MCP 네 페이지 |
| Studio 렌더링 | 루트의 `force-dynamic` 상속 | 공개 네 페이지는 빌드 시 HTML 생성, 계정·작업 페이지는 동적 유지 |
| Studio 공유 정보 | 일부 페이지만 제목 제공 | 모든 정상 페이지에 서버 메타데이터, 동적 작품·창작자별 설명과 이미지 |
| 중복 URL | `/explore` 임시 이동, 쿼리별 canonical 미정 | `/explore` → `/` 308, 추적·결제·로그인 쿼리를 제외한 canonical |
| AI 봇 | 와일드카드 허용 | 와일드카드와 주요 AI 검색·사용자·학습 봇의 명시적 허용 |
| FAQ·구조화 데이터 | 회사 사이트 운영사/제품 정보 중심 | 본문과 동일한 회사 FAQ, Studio 페이지·운영사·웹앱·경로·가이드 FAQ |
| 공개 텍스트 | Studio 링크 목록 | 실제 사용 가이드의 준비물·작업·결과물·FAQ를 같은 원본에서 생성 |

회사 대표 URL은 `https://www.snowlink.team/`, Studio 대표 URL은 `https://studio.snowlink.team/`이다. 회사 본문에서 Studio 사용 가이드를 연결하고 Studio에서 회사의 제품·운영사 정보로 연결한다. 개인 작업·인증·설정·프로필·결제 미리보기와 가상 작품/창작자 상세는 `noindex, follow`이며 사이트맵에 넣지 않는다. noindex는 접근 통제가 아니며 기존 세션/계정 권한 검사를 변경하지 않는다.

## 참고 사이트에서 채택한 점

[ETF쇼핑](https://etfshopping.com/)의 공개 본문은 구체적인 기능 설명과 기능별 링크, 운영사 정보를 제공한다. `/robots.txt`는 AI 검색 봇을 명시하고 `/llms.txt`는 실제 기능별 URL을 분류해 안내한다. Snowlink에는 이 정보 구조를 적용했다. 참고 사이트 원본 홈페이지의 직접 HTTP 요청은 Vercel 보안 확인(429)을 반환해 전체 원본 메타데이터 비교는 하지 않았으며, 웹 도구의 공개 본문과 직접 접근 가능한 robots·사이트맵·공개 텍스트를 확인했다.

참고 사이트는 일부 학습 봇을 차단하지만 Snowlink는 사용자의 기존 AI 접근 허용 방침을 유지한다. `GPTBot`·`ClaudeBot`은 학습 목적, `OAI-SearchBot`·`Claude-SearchBot`은 검색 목적이므로 둘을 동일한 검색 랭킹 설정으로 설명하지 않는다. 허구의 이용자 수, 평점, 리뷰, 유료 가격이나 검색 조작 문구를 추가하지 않는다.

## 검증

```sh
npm --prefix apps/company run build
npm --prefix apps/studio run build
npm --prefix apps/studio test
node scripts/audit-seo.mjs --local
# 두 앱 배포 완료 후 실제 URL 검사
node scripts/audit-seo.mjs
```

검증 스크립트는 프론트 서버를 실행하지 않는다. 정적 HTML과 실제 배포 응답에서 canonical·robots·OG·Twitter·언어·H1·구조화 데이터·FAQ 일치, AI 봇 규칙, sitemap 공개 URL 목록, 공개 텍스트 범위를 검사한다. 배포 검사는 동적/개인 페이지의 noindex, 쿼리 canonical, 308 이동, 없는 작품/창작자의 404, 공유 이미지의 1200×630 크기, AI 검색 봇 HTTP 응답도 확인한다. 출력은 기술 검증 항목 수이며 Lighthouse/GEO 점수가 아니다.

2026-10-08 최초 Google PageSpeed API 요청은 공용 할당량 초과(429)로 측정값을 반환하지 않았다. 이후 사용자가 별도 점수 도구 없이 참고 사이트를 기준으로 진행하도록 지정했다. 측정하지 않은 점수나 향상 폭을 보고하지 않는다.

## 운영 시 확인

- 내용이 변경된 날짜만 `CONTENT_UPDATED`와 회사 `contentUpdated`에 반영한다. 배포 때마다 허위로 날짜를 갱신하지 않는다.
- 사이트 소유자의 Search Console·Bing Webmaster Tools에서 실제 색인/검색/인용 상황을 확인한다. 소유권 인증과 사이트맵 제출을 수행했다고 가정하지 않는다.
- 실제 사용자 공개 게시가 구현되면 공개 동의·정상 상태·원본 URL을 확인한 작품만 색인과 사이트맵에 포함한다.
- 회사 FAQ와 Studio 가이드는 공통 데이터로 HTML·JSON-LD·텍스트를 함께 갱신한다. 공개 문서에 사용자 원고나 연결 비밀값을 포함하지 않는다.
- `llms.txt`는 보조 안내다. 검색 순위·AI 인용이나 특정 점수를 보장하지 않는다. 일반 SaaS의 FAQPage가 Google FAQ 리치 결과를 보장하지도 않는다.

## 근거

- [Google AI 기능과 웹사이트](https://developers.google.com/search/docs/appearance/ai-features): 크롤링·색인 가능성, 본문·구조화 데이터의 일치, 내부 링크와 실제 사용자에게 유용한 내용.
- [Google canonical 안내](https://developers.google.com/search/docs/crawling-indexing/consolidate-duplicate-urls): 중복 URL의 대표 주소.
- [Bing AI Performance](https://www.bing.com/webmasters/help/ai-performance-9f8e7d6c): 인용·근거 검색어 등 실제 AI 노출 측정.
- [OpenAI 크롤러](https://developers.openai.com/api/docs/bots), [Anthropic 크롤러](https://privacy.claude.com/en/articles/8896518-does-anthropic-crawl-data-from-the-web-and-how-can-site-owners-block-the-crawler), [Perplexity 크롤러](https://docs.perplexity.ai/docs/resources/perplexity-crawlers): 검색·학습·사용자 요청 봇의 구분.
