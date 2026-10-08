# Snowlink Team 운영 주소

공개 회사 브랜드는 **Snowlink Team**(스노우링크 팀), 제품은 **Snowlink Team Studio**입니다. 법적 사업자명 스노우링크(SnowLink), 사업자등록번호 335-17-02746과 기존 대표자·주소·2026년 6월 30일 개업 및 등록 정보는 보존합니다. 공개 연락처는 사용자가 Cloudflare 라우팅과 Gmail 수신으로 확인한 주소입니다.

| 용도 | 주소 |
| --- | --- |
| 회사 소개 | `https://snowlink.team` → `https://www.snowlink.team/` (308) |
| Studio | `https://studio.snowlink.team` |
| API · MCP | `https://api.snowlink.team` |
| 공개 이메일 | `ceo@snowlink.team` |

## 구성 및 검증 · 2026-10-08

- 코드의 회사·제품명, 내부 링크, canonical, Open Graph, JSON-LD, sitemap, robots, AI 안내문과 MCP 안내를 위 주소로 통일합니다. 회사 Organization의 법적 이름은 별도 `legalName`으로 표기합니다.
- 로컬 브라우저 담당자가 Vercel 프로젝트 이름·Root Directory·main 자동 Production 배포·새 도메인 Valid Configuration·환경변수를 확인했습니다. 코드 담당자는 main 푸시 후 실제 공개 응답을 별도로 검증합니다.
- `api.snowlink.team` Nginx HTTPS 가상 호스트를 확인했으며 기존 인증서 만료일은 2027-01-05입니다. 인증서 dry-run 갱신과 새 launchd 작업의 실행 종료 코드 0을 확인했습니다.
- API 세션 JSON 200, 비인증 작업실·MCP 401, OAuth resource·issuer의 새 주소, HTTP → HTTPS 301, API 루트 → 새 Studio 302를 확인했습니다. 허용되지 않은 요청 Origin은 403입니다.
- `config.json`의 API·프론트 기본 주소를 갱신하고 백엔드를 재시작했습니다. 기존 API Nginx 호스트와 인증서 갱신, 추가 허용 주소는 보존합니다.
- 프론트는 Vercel에서 배포하고 Mac mini에서는 기존 백엔드만 실행합니다. 다른 작업자의 FastAPI 전환 파일은 이 변경에 포함하지 않습니다.

## Vercel

- 회사 프로젝트: `snowlink-team`, Root Directory `apps/company`.
- Studio 프로젝트: `snowlink-team-studio`, Root Directory `apps/studio`.
- 두 프로젝트 모두 `kicet3/Snowlink-Studio`의 `main` 푸시로 Production을 배포합니다.
- 최신 사용자 지시에 따라 `netiumpartners.com` 계열의 회사·Studio 연결은 Vercel에서만 해제합니다. Cloudflare의 옛 DNS·메일 라우팅과 기존 API Nginx 호스트는 삭제하지 않습니다.

Studio Production 및 Preview 환경변수:

```dotenv
STUDIO_API_ORIGIN=https://api.snowlink.team
NEXT_PUBLIC_COMPANY_SITE_URL=https://www.snowlink.team
```

환경변수는 새 빌드에 적용되므로 저장 후 새 배포가 필요합니다. 회사 앱은 별도 환경변수 없이 `lib/config.js`를 사용합니다. 프론트에 API 키를 넣지 않습니다.

## Google OAuth · MCP

Google Cloud OAuth 클라이언트의 승인된 리디렉션 URI에는 다음 주소가 필요합니다. 서버는 이 주소를 기준으로 콜백을 구성하지만 Google 외부 콘솔의 등록 상태는 별도 확인 대상입니다. 기존 콜백을 삭제할 필요는 없습니다.

```text
https://studio.snowlink.team/api/google/oauth/callback
```

승인된 JavaScript 원본을 사용하는 클라이언트 설정에는 `https://studio.snowlink.team`을 사용합니다. MCP 주소는 `https://api.snowlink.team/mcp`, 안내 페이지는 `https://studio.snowlink.team/mcp`입니다. 기술 식별자와 CLI 별칭 `snowlink-studio`는 기존 클라이언트 호환성을 위해 유지합니다.

## Nginx · 인증서

배포 설정은 `deploy/nginx/api.snowlink.team.conf`입니다. Mac mini `/Users/snowfall/orca/cbt_bank/infra/nginx.conf`의 `BEGIN SNOWLINK STUDIO` 블록을 `cbt-nginx`가 읽습니다. Certbot 저장소의 `live/api.snowlink.team/`에서 인증서를 읽으며 비밀 파일은 Git에 포함하지 않습니다.

`deploy/renew-snowlink-api.sh`와 `team.snowlink.api-cert-renew.plist`는 매일 03:37·15:37에 해당 인증서만 갱신하고 실제 갱신 후 Nginx 문법 검사·graceful reload를 실행합니다. Docker와 서버 계정의 launchd 세션이 실행 중이어야 합니다. 기존 Netium API 갱신 작업은 별도 시각에 유지합니다. 자세한 절차는 [배포 안내](../deploy/README.md)를 따릅니다.

## 공개 제품 설명에 사용할 확인된 범위

캐릭터 시트·사용자 프롬프트 템플릿, 전체 플롯 → 회차별 플롯 → 원고 작성, 구조화된 인물·사건·관계·복선 기억, 이미지·영상 생성과 컷 편집, Claude Code·Codex에서의 OAuth MCP 연결이 저장소에 구현되어 있습니다. SNS 자동 게시·예약 업로드는 향후 목표이며 유료 멤버십은 결제 없는 미리보기입니다. 현재 서버의 기본 생성 제공자는 텍스트 GPT, 이미지·영상 Grok입니다. Claude와의 MCP 연결을 Claude API 엔진을 운영 중이라는 의미로 설명하지 않습니다.
