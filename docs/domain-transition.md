# Snowlink Studio 운영 주소

| 용도 | 주소 |
| --- | --- |
| 회사 소개 | `https://snowlink.team` |
| Studio | `https://studio.snowlink.team` |
| API · MCP | `https://api.snowlink.team` |
| 공개 이메일 | `admin@snowlink.team` |

## 반영 상태 · 2026-10-08

- 회사 소개의 제품 버튼, Studio의 회사 소개 링크, API 기본 주소와 MCP 연결 명령을 위 주소로 통일했습니다.
- 회사 소개는 Vercel에서 `www.snowlink.team`으로 이동하며 HTTPS 200을 반환합니다.
- API의 기존 Nginx 가상 호스트와 인증서는 정상이며 `/api/auth/session`이 JSON 200을 반환합니다.
- `studio.snowlink.team`의 Vercel 도메인 연결 후 HTTPS 200 응답을 확인했습니다.
- 이전 도메인의 요청 origin은 전환 중 접속 호환을 위해 허용 목록에만 유지합니다. 공개 링크와 OAuth 기본 주소는 위 표를 따릅니다.
- 프론트는 Vercel에서 배포하고 Mac mini에서는 백엔드만 실행합니다.

## Vercel 설정

Studio 프로젝트의 Root Directory는 `apps/studio`, 회사 소개는 `apps/company`입니다. Studio 프로젝트에 `studio.snowlink.team`을 연결합니다.

아래 환경변수는 코드의 운영 기본값입니다. Vercel에 기존 값이 등록되어 있으면 기본값보다 우선하므로 함께 변경하고 재배포해야 합니다.

```dotenv
STUDIO_API_ORIGIN=https://api.snowlink.team
NEXT_PUBLIC_COMPANY_SITE_URL=https://snowlink.team
```

회사 소개는 별도 환경변수 없이 `apps/company/lib/config.js`의 Studio 주소와 이메일을 사용합니다.

## OAuth · MCP

Google OAuth 클라이언트의 승인된 리디렉션 URI에 다음 주소를 등록합니다. 콜백은 로그인 쿠키를 가진 Studio 프론트를 거쳐 API로 전달됩니다.

```text
https://studio.snowlink.team/api/google/oauth/callback
```

MCP 서버는 `https://api.snowlink.team/mcp`입니다. 기존 MCP 클라이언트의 주소를 변경한 뒤 새 주소에서 로그인합니다. 안내 페이지는 `https://studio.snowlink.team/mcp`입니다.

## Nginx

배포 설정은 `deploy/nginx/api.snowlink.team.conf`입니다. Mac mini의 `/Users/snowfall/orca/cbt_bank/infra/nginx.conf`에 있는 `BEGIN SNOWLINK STUDIO` 블록을 `cbt-nginx` 컨테이너가 사용합니다. 인증서는 기존 Certbot 저장소의 `live/api.snowlink.team/`에 있습니다. 인증서와 개인 키는 Git에 포함하지 않습니다.
