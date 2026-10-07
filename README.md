# snowfall studio

Next.js Studio 프론트는 [`apps/studio`](apps/studio/README.md)에 있습니다. Vercel의 Root Directory를 `apps/studio`로 지정하며, 서비스 주소는 `studio.snowlink.team`, API 기본 주소는 `api.snowlink.team`입니다. 아래의 Node.js 실행 설명은 기존 백엔드 기준이며 FastAPI 전환과 통합 검증은 진행 중입니다.

제품 표시 이름은 `snowfall studio`입니다. 회사명은 스노우링크(SnowLink)입니다. 기존 접속 주소·프로젝트 디렉터리·데이터·로그인·MCP 연결은 그대로 사용합니다. 패키지 이름과 MCP 연결 별칭 `snowlink-studio`, `SNOWFALL_*` 환경변수, `snowfall://workflow` 등 기술 식별자는 호환성을 위해 유지합니다.

새 도메인은 회사 소개 `snowfall.it.com`, Studio `studio.snowfall.it.com`, API `api.snowfall.it.com`으로 확정했습니다. 사용자가 네임서버 변경을 진행 중이며, DNS·HTTPS 연결을 확인하기 전까지 현재 서비스 URL과 API 설정을 유지합니다. 회사 공개 이메일은 `ceo@snowfall.it.com`으로 변경했습니다.

캐릭터와 이야기를 중심으로 트렌드 탐색, 이미지·영상 제작, ShortGPT 컷 편집을 모은 작업실입니다. Node.js 22 이상과 공식 MCP SDK를 사용하며, 내재화한 React 제작 UI는 자체 의존성과 빌드 단계를 가집니다.

화면은 눈과 가을을 담은 **Snow & Autumn** 테마를 사용합니다. 색상·간격·타이포그래피·공용 컴포넌트의 관리 방법은 [디자인 시스템](design/README.md)을 참고하세요. 토큰 원본은 `design/tokens.json`입니다.

제품 개선의 기준 문서는 [PRD](docs/PRD.md)입니다. 현재 구현과 부족한 부분, 완료 기준, 개발 우선순위를 정리했습니다. [시장 조사](docs/market-research-2026-10.md), [노드 기반 제작 설계](docs/node-workflow-design.md), [트렌드 분석과 제작 근거 축적](docs/trend-intelligence-plan.md)을 함께 참고하세요. 2026-10-03 코드 조사와 10월 4일 확정한 개인용 도구·AI 대화 시작·누적 후킹 분석 활용·주제별 카드뉴스 분량을 반영한 설계이며 신규 기능 구현 완료를 의미하지 않습니다.

## 접속과 실행

- Mac: <http://localhost:3400>
- 같은 Tailscale 네트워크의 PC: <https://snowfall-macmini.tail447a11.ts.net:9450>

```sh
cd /Users/snowfall/orca/projects/snowfall-studio
npm ci
npm --prefix vendor/ima2-ui ci
npm run ui:build
npm start
npm run status
npm stop
```

`npm start`는 백그라운드 실행입니다. Mac을 재시작하면 다시 실행해야 합니다. 이미 실행 중인 ima2-gen은 재사용하고, 꺼져 있으면 CLI로 실행합니다. trend-viewer를 작업실에서 시작할 때는 OAuth 연결 주소를 환경변수로 전달합니다. 이미 별도로 실행한 trend-viewer는 기존 설정을 유지하므로, 공통 OAuth를 쓰려면 기존 프로세스를 종료하고 작업실을 재시작하세요.

## 회원 계정

검색 노출용 description·keywords·Open Graph·구조화 데이터·사이트맵은 제공하지 않습니다. 작업실과 제작·트렌드 호환 주소 모두 `/robots.txt`에서 `User-agent: *`, `Disallow: /`를 반환하고, 모든 공개 HTTP 응답에 `X-Robots-Tag: noindex, nofollow, nosnippet, noimageindex`를 적용합니다. `robots.txt`는 이를 준수하는 봇에 대한 지침이며 실제 데이터 접근은 로그인과 Tailscale 접근 권한으로 제한합니다. 이미 검색된 URL의 즉시 삭제를 보장하지 않습니다. [robots.txt의 범위](https://developers.google.com/search/docs/crawling-indexing/robots/intro).

첫 화면에서 회원가입하거나 로그인합니다. 비밀번호에는 사용자별 난수 salt를 붙인 후 scrypt를 적용하며 원문을 저장하지 않습니다. 로그인 쿠키는 HttpOnly·SameSite=Lax이고 HTTPS에서는 Secure를 적용합니다. 비밀번호 변경은 기존 로그인 세션과 MCP OAuth 승인을 무효화합니다.

관리자는 기존 `.data` 작업을 이어 사용하고, 일반 회원의 캐릭터·시나리오·프롬프트·Google 연결·생성 기록은 계정별로 분리합니다. 이미지·영상 생성 엔진의 GPT/Grok 연결은 관리자가 관리하며 회원들이 같은 모델 계정의 사용량을 소비합니다. 공개 회원가입으로 관리자 권한을 얻을 수 없습니다. 이메일 인증·비밀번호 찾기는 아직 제공하지 않습니다.

기존 엔진의 전역 설정·외부 MCP 제공자·공유 에셋 관리와 트렌드 관리 작업은 관리자에게 제한합니다. 일반 회원의 캐릭터 참조는 작업실 캐릭터 시트 라이브러리를 사용합니다.

## MCP · Claude와 Codex

**설정 · OAuth → MCP · Claude와 Codex 연결**에서 주소와 연결 명령을 복사할 수 있습니다. Streamable HTTP 주소는 `https://snowfall-macmini.tail447a11.ts.net:9450/mcp`입니다. 같은 Mac에서는 `http://127.0.0.1:3400/mcp`도 사용할 수 있습니다.

Codex CLI:

```sh
codex mcp add snowlink-studio --url https://snowfall-macmini.tail447a11.ts.net:9450/mcp
codex mcp login snowlink-studio
```

Claude Code:

```sh
claude mcp add --transport http snowlink-studio https://snowfall-macmini.tail447a11.ts.net:9450/mcp
claude mcp login snowlink-studio
```

로그인 링크에서 **작업실 회원 계정**으로 로그인한 뒤 접근을 허용합니다. Google·GPT OAuth와 별개의 작업실 인증입니다. OAuth discovery, 동적 클라이언트 등록, Authorization Code + S256 PKCE, resource 검증, 일회성 코드, 갱신 토큰 회전과 폐기를 지원합니다. 액세스 토큰은 1시간, 갱신 토큰은 30일이며 서버에는 토큰 해시만 저장합니다. 설정의 **승인한 연결 → 연결 해제**로 권한을 철회합니다.

Tailscale 주소는 해당 네트워크에 접근하는 로컬 Claude Code·Codex에서 사용합니다. Claude 웹 등 클라우드 커넥터로 사용하려면 외부에서 접근할 수 있는 HTTPS 배포와 `publicOrigin` 설정이 별도로 필요합니다. 공식 연결 방법: [Codex MCP](https://learn.chatgpt.com/docs/extend/mcp?surface=cli), [Claude Code MCP](https://code.claude.com/docs/en/mcp).

대화 예시:

- “캐릭터 시트 템플릿을 보여주고, 새 인물을 만드는 질문부터 시작해줘.”
- “수채화 애니메이션 스타일을 대화로 정한 뒤 내 템플릿으로 저장해줘.”
- “총 6화, 화당 2,000~3,000자로 전체 플롯부터 차례대로 만들고 이전 사건과 복선을 이어줘.”
- “완료된 1화를 장면 노드로 만들고 첫 장면 이미지부터 생성해줘.”

도구는 웹과 같은 서비스·저장소를 사용합니다. `snowfall://workflow` 리소스에 권장 순서가 있습니다. 생성은 작업 번호로 진행 상태를 조회하며, 동일 idempotencyKey의 요청을 중복 실행하지 않습니다. 외부 생성 요청의 응답이 끊기면 결과를 먼저 조회하고 자동 재전송하지 않습니다. 이미지·영상 생성에는 연결 모델의 사용량 또는 비용이 발생합니다.

로컬 stdio 호환 연결은 `npm run mcp` 또는 설정의 고급 연결 JSON을 사용합니다. 이는 계정별 로컬 연결 파일을 사용하는 별도 방식이며 OAuth 연결은 위 HTTP URL 방식을 사용합니다. 연결 파일·회원 파일·OAuth 파일은 백업에 포함하면 자격 증명으로 취급해야 합니다.

## 시나리오 · 영상 스타일

**시나리오 · 영상 스타일**에서 애니메이션 또는 실사 영화 템플릿을 선택하고, 대화와 직접 프롬프트 편집으로 사용자 템플릿을 저장합니다. 전체 플롯 → 각 화 플롯 → 각 화 상세 원고 순서로 작성합니다. 원고는 앞 화의 본문과 이야기 기억이 확정되어야 이어집니다. 화별 최소·최대 글자 수와 공백 포함 여부를 설정할 수 있고, 길이 조건을 충족하지 못하면 다음 화로 넘어가지 않습니다.

본문에서 인물·사건·관계·복선을 근거 문장과 함께 추출해 로컬 속성 그래프로 저장합니다. 다음 화를 쓸 때 키워드 검색, 연결 2단계 탐색, 최근 화, 미회수 복선을 결합하는 GraphRAG를 사용합니다. 미래 화와 수정으로 오래된 화는 검색에서 제외하며, 앞 내용을 수정하면 뒤 화를 재검토 상태로 바꿉니다. 화면에서 복선의 시작·진행·회수와 원문 근거를 확인할 수 있습니다. 외부 그래프 DB나 벡터 임베딩 서비스는 사용하지 않습니다.

완료된 원고를 제작 보드로 보내거나 장면별 이미지→영상 노드로 만듭니다. 캐릭터 시트와 영상 스타일을 생성 참조에 적용하며, 이미지가 완료된 다음 해당 이미지를 시작점으로 영상을 생성합니다. 장면 생성 이후 대사 음성·음악·영상 자동 연결까지 완성하는 기능은 현재 범위에 포함하지 않습니다.

## 사용 흐름

1. **트렌드 탐색**에서 소재를 찾습니다. 작업실에 내재화한 화면에서 급상승 검색·YouTube·Shorts·Instagram·TikTok·X·Threads·AI 소식·데이트 소재·AI 분석을 탐색합니다. 소재를 보관하고, 급상승 탭의 **SNS 영상** 버튼으로 같은 키워드의 관련 영상을 조회합니다. YouTube·Shorts는 검색 결과, TikTok은 현재 수집된 영상에서의 일치 결과를 보여줍니다. Instagram·X는 현재 수집 제한과 원본 검색 링크를 표시합니다.
2. **캐릭터 시트**에 이름, 설정, 태그, 이미지(PNG/JPEG/WebP, 6MB 이하)를 등록합니다.
3. **제작 보드**에서 썰 영상·카드뉴스·YouTube 형식을 고르고 대본, 출연 캐릭터, 제작 단계를 저장합니다. 기획 카드의 제작 자료에서 프롬프트와 시트를 가져갈 수 있습니다.
4. **이미지 · 영상 제작**에서 GPT/Grok OAuth로 이미지 생성·원본 편집·Grok 영상 생성을 진행합니다. 저장한 기획과 캐릭터 시트를 불러올 수 있고, 생성 결과는 다운로드·캐릭터 등록·참고 이미지로 재사용할 수 있습니다. 진행 상황은 SSE로 이어지며 메뉴를 옮겨도 작업이 유지됩니다.
5. **ShortGPT · 컷 편집**에서 기획을 선택해 컷을 나누고, “2번 컷을 3초로 줄여줘”처럼 수정합니다. 직접 수정·순서 이동·삭제·최근 20회 되돌리기·JSON 내보내기를 지원합니다.
6. **콘티 MP4**는 실제 ShortGPT CoreEditingEngine으로 캐릭터 시트와 대사를 합성한 무음 미리보기를 출력합니다. 썰 영상은 세로, YouTube는 가로입니다.

## GPT OAuth / Grok OAuth

새 작업실의 컷 편집과 트렌드 분석은 선택한 **GPT OAuth 또는 Grok OAuth**만 사용합니다. ShortGPT의 `llm_completion`도 동일한 로컬 연결로 바꿨습니다. API 키로 자동 전환하지 않습니다.

- 로그인: **왼쪽 사이드바 → 설정 · OAuth**에서 로그인 버튼을 누르고 인증 페이지에 코드를 입력합니다. Tailscale PC에서도 같은 코드 방식으로 로그인합니다. 대기·취소·만료·재시도 상태를 표시하며, 기존 토큰을 화면으로 전달하지 않습니다.
- 선택: **설정 · OAuth → 작업별 AI 모델**에서 기획·트렌드 분석 / 대화·컷 편집 / 이미지 / 영상을 각각 선택합니다. 제공자와 모델이 서버에 저장되어 다음 요청에 적용됩니다.
- 제작 화면에서도 해당 작업의 모델을 선택할 수 있습니다. GPT OAuth 이미지의 선택값은 기획 모델이며, 실제 렌더러는 현재 `gpt-image-2`입니다. OAuth 인증과 이미지·영상 지원 능력을 구분합니다.
- OAuth 토큰은 ima2-gen의 기존 세션 저장소에 남습니다. 작업실·ShortGPT DB나 브라우저에 복사하지 않습니다.
- 로그인 계정 정보와 현재 OAuth 자격 증명 확인 결과를 함께 표시합니다. 실제 모델 호출의 사용량·권한 제한은 요청 결과로 표시됩니다.
- 현재 기본값은 GPT OAuth / `gpt-6-luna`, Grok OAuth / `grok-4.3`입니다. 모델·경로·포트는 `config.local.json`에서 덮어쓸 수 있습니다.

## SNS API 자격증명 준비

루트 `.env`에 아래 여섯 항목을 준비합니다. [`.env.example`](.env.example)은 같은 항목의 설명과 공유용 템플릿입니다. 기존 `.env`를 덮어쓰지 말고 필요한 빈 항목만 채우세요. `.env`는 Git 제외 대상이며 GPT·Grok API 키는 필요하지 않습니다.

| 변수 | 연결 구현 후 사용할 용도 |
| --- | --- |
| `YOUTUBE_API_KEY` | YouTube 공개 영상 검색·통계의 API key 인증 |
| `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET` | 내 YouTube 채널의 웹 OAuth 연결·채널 통계 조회 |
| `META_APP_ID`, `META_APP_SECRET` | Instagram 계정 연결용 Meta 앱; Facebook Login 경로의 앱 설정 준비 상태 확인 |
| `X_BEARER_TOKEN` | X 공개 게시물 조회용 앱 전용 토큰 |

**현재 실행의 필수 설정은 아니며, 연결할 플랫폼의 항목만 설정합니다.** 서버는 시작할 때 루트 `.env`의 Google 세 항목과 `META_APP_ID`, `META_APP_SECRET`을 읽습니다. 이미 설정된 프로세스 환경변수는 빈 값까지 우선하며 파일을 변경하지 않습니다. 시크릿·API 키는 일반 설정 객체, 자식 도구의 환경변수, 브라우저, 백업에 전달하지 않습니다. Google 클라이언트 ID는 인증에 필요한 Google 로그인 URL에만 포함됩니다. `YOUTUBE_API_KEY`는 입력 상태만 확인하며 기존 트렌드 수집기는 이 키를 사용하지 않습니다. X 키는 아직 로드하지 않습니다.

`npm run meta:status`, `GET /api/meta/status`, **설정 · OAuth → Instagram 연결 준비**에서 비밀값 없는 입력 상태를 확인할 수 있습니다. ID의 숫자 형식과 값의 존재만 확인하므로 **앱 자격증명 준비, Meta MCP 로그인, Instagram 계정 연결은 각각 별개**입니다. `.env`를 수정하면 서버를 재시작해야 합니다. Instagram·X의 공식 API 어댑터, OAuth 콜백·계정 토큰 보관, 수집·성과 조회·게시·예약 실행은 아직 구현 전입니다. Meta 콜백 URL은 구현과 검증이 끝난 뒤에 등록합니다.

Instagram은 [Facebook Login 경로](https://developers.facebook.com/docs/instagram-platform/instagram-api-with-facebook-login/)를 사용하도록 준비합니다. Facebook 페이지에 연결된 비즈니스·크리에이터 계정이 필요합니다. 본인 또는 관리 계정의 개발 테스트에는 [Standard Access](https://developers.facebook.com/docs/instagram-platform/overview/)를 기준으로 하며 앱을 개발 상태로 유지합니다. 다른 계정의 데이터는 [Business Discovery](https://developers.facebook.com/docs/instagram-platform/instagram-api-with-facebook-login/business-discovery/)가 허용하는 프로페셔널 계정의 공개 메타데이터·지표 범위에 한정됩니다. 일반 개인 계정, 임의 검색·전체 수집, 타 계정의 비공개 인사이트를 제공하는 기능으로 취급하지 않습니다.

개발 앱에 추가한 권한은 계정·페이지 조회의 `pages_show_list`, `pages_read_engagement`, `instagram_basic`, 성과 조회의 `instagram_manage_insights`, 승인된 결과 게시의 `instagram_content_publish`입니다. 대시보드의 **테스트 준비 완료**는 실제 사용자의 데이터 접근 승인이나 앱 검수 승인을 뜻하지 않습니다. 계정 OAuth 구현 시 사용하는 엔드포인트의 종속 권한과 실제 승인 범위를 확인해야 합니다. 댓글·DM·광고·결제 권한은 이번 준비 범위에 포함하지 않습니다. 해시태그 검색에는 별도의 Instagram Public Content Access 검토가 필요합니다. [공식 권한 참고](https://developers.facebook.com/docs/permissions/).

현재 GPT·Grok 로그인은 위 설정 화면을 사용합니다. 플랫폼 계정별 액세스/갱신 토큰은 `.env`에 직접 넣지 않습니다. Google 토큰은 아래 OAuth 연결에서 발급·보관합니다. 인증 참고: [YouTube API 자격증명](https://developers.google.com/youtube/registering_an_application), [X 앱 전용 Bearer Token](https://docs.x.com/fundamentals/authentication/oauth-2-0/application-only).

### Google · YouTube 연결

1. Google Cloud 프로젝트에서 **YouTube Data API v3**를 활성화합니다.
2. Google Auth Platform에서 OAuth 동의 화면을 설정합니다. 외부 앱을 테스트 모드로 사용하면 로그인할 Google 계정을 **테스트 사용자**로 추가합니다.
3. **웹 애플리케이션** OAuth 클라이언트의 **승인된 리디렉션 URI**에 실제 접속할 주소를 등록합니다. 기본 설정에서는 다음 세 주소를 지원합니다. JavaScript 원본이 아닌 리디렉션 URI 항목에 등록하며, 끝에 `/`를 추가하지 않습니다.

   ```text
   http://localhost:3400/api/google/oauth/callback
   http://127.0.0.1:3400/api/google/oauth/callback
   https://snowfall-macmini.tail447a11.ts.net:9450/api/google/oauth/callback
   ```

4. 해당 클라이언트의 ID와 시크릿을 `.env`의 `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`에 입력하고 `npm run stop` 후 `npm start`로 재시작합니다. 공개 검색용 `YOUTUBE_API_KEY`는 OAuth 연결에는 필요하지 않습니다.
5. **설정 · OAuth → 내 YouTube 채널 → Google로 연결**에서 로그인하고 채널 조회 권한을 허용합니다. 로그인은 시작한 브라우저에서 마치세요. Google이 내장 브라우저 로그인을 거부하면 Chrome/Safari에서 작업실을 열고 연결을 처음부터 다시 시작합니다.

`config.local.json`으로 포트·`publicOrigin`을 변경했다면 **Google 앱 설정 · 콜백 URL**에 표시되는 주소를 등록합니다. `GOOGLE_REDIRECT_URI` 환경변수는 필요하지 않으며, 서버가 허용한 접속 주소를 기준으로 콜백을 결정합니다. Tailscale 주소는 해당 기기에서 접근할 수 있어야 합니다.

현재 권한은 `https://www.googleapis.com/auth/youtube.readonly`입니다. 연결한 채널의 이름·누적 조회수·구독자·공개 영상 수를 조회하며, **채널 통계 새로고침**에서 최신 값을 가져옵니다. YouTube Analytics의 시청 시간·수익, 동영상 업로드·예약 게시, 공개 영상 검색 API 전환은 포함하지 않습니다. 값이 없는 지표는 추정하지 않습니다.

인증 요청은 10분 동안 유효하며 일회성 state·브라우저 쿠키·PKCE로 검증합니다. 액세스 토큰은 필요할 때 갱신하고, 권한이 취소되면 재연결을 안내합니다. 계정을 바꿀 때 이전 계정의 갱신 토큰을 재사용하지 않습니다. 토큰과 채널 스냅샷은 `.data/oauth/google.enc.json`에 AES-256-GCM으로 암호화 저장하며 암호화 키는 같은 디렉터리의 `google.key`에 보관합니다. 디렉터리는 `0700`, 파일은 `0600`으로 제한하고 작업실 JSON 백업에는 포함하지 않습니다. **연결 해제**는 Google 토큰을 폐기한 뒤 로컬 연결 정보를 삭제합니다. 폐기 요청이 실패하면 연결을 유지하여 재시도할 수 있습니다.

| 경로 | 동작 |
| --- | --- |
| `GET /api/google/status` | 비밀값 없는 설정·연결 상태와 현재 콜백 URL |
| `POST /api/google/connect` | 같은 출처의 JSON 요청으로 Google 로그인 시작 |
| `GET /api/google/oauth/callback` | 인증 코드 교환 후 설정 화면으로 이동 |
| `GET /api/google/channels` | 필요 시 토큰 갱신 후 내 채널 통계 조회 |
| `POST /api/google/disconnect` | 같은 출처의 JSON 요청으로 Google 권한·로컬 연결 해제 |

오류: `redirect_uri_mismatch`는 등록한 URI와 화면의 URI를 대조하고, `access_denied`는 테스트 사용자·동의 권한을 확인합니다. 채널 조회 실패 시 YouTube Data API v3 활성화와 할당량을 확인합니다. 외부 앱의 테스트 모드에서는 YouTube 권한의 갱신 토큰이 7일 후 만료될 수 있으므로 다시 연결해야 합니다. [Google OAuth 공식 문서](https://developers.google.com/identity/protocols/oauth2/web-server), [토큰 만료 조건](https://developers.google.com/identity/protocols/oauth2#expiration)

## 프로젝트 구성

| 폴더 | 용도 |
| --- | --- |
| `../ima2-gen` | 기존 이미지·영상 제작 앱 및 OAuth 세션 관리 |
| `../trend-viewer` | 기존 트렌드 탐색 앱 |
| `../shortgpt` | RayVentura/ShortGPT 원본과 OAuth 연결 변경 |
| `server/` | 작업실 API, 로컬 프록시, OAuth 연결, 컷 이력·렌더링 |
| `public/` | 작업실 UI, 공용 컴포넌트·디자인 토큰·내재화 연결 |
| `vendor/ima2-ui/` | 프로젝트가 소유하고 빌드하는 원본 React 제작 UI와 작업실 데이터 연결 |
| `vendor/trend-ui/` | 원래 배치를 유지한 트렌드 UI 소스, 색상 토큰과 SNS 키워드 탐색 |
| `docs/` | PRD·시장 조사·노드 설계·제작 기획·사용자 결정·참고 영상 분석 |
| `.data/` | 실제 사용자 기획·캐릭터·이미지·컷 이력·출력물·로그 |

ShortGPT는 `3df4e0f7a422bf7386565d498bf4521a2544c614`에서 가져왔습니다. 원본의 Gradio UI와 외부 TTS·스톡 서비스 대신, 이번 작업실용 웹 편집 화면과 렌더러를 연결했습니다. 원본 전체 앱 실행에 필요한 대규모 의존성은 설치하지 않았습니다.

다른 환경에서 최소 렌더러를 준비하려면 [ShortGPT 저장소](https://github.com/RayVentura/ShortGPT)를 형제 폴더 `shortgpt`로 복제하고 아래 명령을 사용합니다. 현재 환경에는 이미 적용되어 있습니다.

```sh
git -C ../shortgpt apply "$PWD/integrations/shortgpt/oauth.patch"
uv venv --python 3.11 --managed-python ../shortgpt/.venv
uv pip install --python ../shortgpt/.venv/bin/python 'moviepy==2.1.2' 'pillow==10.4.0' pyyaml tiktoken
```

이 Mac의 Homebrew Python에 libexpat 연결 문제가 있어 uv가 관리하는 Python 3.11을 사용합니다. 렌더러는 macOS의 Apple SD Gothic Neo 글꼴과 `/opt/homebrew/bin/ffmpeg`를 사용합니다. ShortGPT의 MIT 고지는 `integrations/shortgpt/LICENSE`에 있습니다.

## Tailscale

| HTTPS 포트 | 로컬 대상 |
| --- | --- |
| 9450 | 작업실 `127.0.0.1:3400` |
| 9451 | `127.0.0.1:3401` → 로그인한 작업실의 제작 화면·API로 이동 |
| 9452 | 트렌드 전용 프록시 `127.0.0.1:3402` → `8779` |

이미지·영상 제작 화면은 iframe 없이 작업실 DOM 안에서 실행합니다. 트렌드는 내부 소스를 전용 프레임으로 표시합니다. `/integrations/ima2/*`, `/integrations/trends/*`는 허용된 API·생성 파일만 전달하는 같은 origin의 스트리밍 경로입니다. SSE, 바이너리 업로드, 영상 Range 요청을 유지합니다. 9451의 시작 주소는 통합 제작 화면으로 이동하고, 9452는 트렌드 화면의 호환 경로로 유지합니다. 서버는 loopback에만 바인딩됩니다. Tailscale Serve를 이용하므로 접속 PC의 Tailscale 로그인과 해당 장치 접근 권한이 필요합니다. 기존 8443·9443 설정은 유지합니다.

```sh
/Applications/Tailscale.app/Contents/MacOS/Tailscale serve --bg --https=9450 http://127.0.0.1:3400
/Applications/Tailscale.app/Contents/MacOS/Tailscale serve --bg --https=9451 http://127.0.0.1:3401
/Applications/Tailscale.app/Contents/MacOS/Tailscale serve --bg --https=9452 http://127.0.0.1:3402
```

## 저장·백업·검증

캐릭터와 기획은 `.data/studio.json`, 시트는 `.data/media`, 컷과 대화 이력은 `.data/edits`, 출력 MP4는 `.data/renders`에 저장됩니다. 동시에 수정한 내용은 버전을 검사해 덮어쓰기를 막습니다. 기획·캐릭터는 보관함으로 옮겼다가 복원할 수 있습니다.

시나리오와 그래프는 `scenarios.json`, 생성 작업은 `studio-jobs.json`, 영상 템플릿은 `video-templates.json`에 저장합니다. 일반 회원은 `.data/users/<회원 ID>/` 아래 같은 구조를 사용합니다. 회원·세션은 `.data/accounts.json`, MCP OAuth는 `.data/mcp-oauth.json`, 공유 생성 엔진의 소유권은 `.data/media-ownership.json`에 저장합니다. 서버 재시작 시 중단된 원고 작업은 표시하고, 이미지·영상 작업은 재생성 없이 결과 조회로 복구합니다.

화면의 **기획 데이터 백업**은 기획·캐릭터 메타데이터만 내려받습니다. 이미지, 컷 이력, 출력물을 포함한 전체 백업은 `npm stop` 후 `.data` 폴더를 복사하세요. OAuth 세션은 ima2-gen에서 별도로 관리합니다.

```sh
npm test
```

저장·동시 수정·복원, 업로드 검사, 컷 이력, OAuth 스트림 조립, API 연결의 SSE/Range/출처 검사, OAuth 전용 생성 요청, 영상 참조 모드 구분, 늦게 도착한 이벤트 처리, 트렌드 데이터 변환을 테스트합니다. `node tests/fixtures/integrated-server.mjs`로 임시 데이터만 쓰는 브라우저 검증 서버(3480)를 열 수 있습니다. 종료하면 임시 데이터도 제거합니다. 실행 로그는 `.data/server.log`, 개별 콘티 실패 로그는 `.data/renders/<작업 ID>/render.log`에 있습니다.

## 현재 범위

이미지 제작 UI는 `vendor/ima2-ui`의 React 컴포넌트를 작업실 DOM에 직접 마운트합니다. iframe 없이 원래 프롬프트·기록·노드·캔버스·설정을 유지하고, CSS를 `.snowfall-media`에 한정해 공용 토큰을 연결합니다. 작업실 캐릭터를 참조로 추가하고, 선택한 생성 이미지를 캐릭터로 등록하며, 제작 자료에서 원고·캐릭터 시트를 제작 화면으로 전달합니다. 메뉴 이동 시 화면 이벤트는 해제하고 작업 상태는 유지합니다.

트렌드는 프로젝트 내부에 복사한 원래 소스를 전용 프레임에서 구동해 기존 전체 UI 구조를 유지합니다. 화면 파일은 형제 프로젝트에서 가져다 제공하지 않으며, 수집 API만 기존 엔진에 연결합니다. 기존 독립 미디어 주소 9451은 통합 제작 화면으로 이동합니다.

다중 채널 프로필·세션 메모리 AI 대화·시퀀스 기반 완성 영상·카드뉴스 제작 자동화·플랫폼 OAuth·예약 게시의 요구사항은 [제작 기획](docs/production-plan.md)에 정리되어 있습니다. 이 부분은 설계 단계이며 구현 완료로 표시하지 않습니다. 네 영상의 확인 범위는 [참고 영상 분석](docs/reference-analysis.md), 참조 자료·대사 타이밍·테이크 편집의 개발 순서는 [AI 애니메이션 기능 적용 계획](docs/animation-workflow-plan.md)을 참고하세요.

## 회사 소개 사이트

회사 소개는 메인 제품과 분리된 Next.js 앱 [`apps/company`](apps/company/README.md)입니다. Vercel Root Directory를 `apps/company`로 지정해 환경변수 설정 없이 독립 배포합니다. 회사 정보·개업일·사업자등록일·이메일·서비스 이동 버튼 주소와 소개 문구는 [`lib/config.js`](apps/company/lib/config.js)에 고정되어 있습니다. SEO를 제외하고 검색 수집·색인을 차단하며, 메인 제품에는 사업자 정보 푸터를 표시하지 않습니다.
