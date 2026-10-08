# 네티움 스튜디오 운영 주소

| 용도 | 주소 |
| --- | --- |
| 회사 소개 | `https://netiumpartners.com` → `https://www.netiumpartners.com/` |
| Studio | `https://studio.netiumpartners.com` |
| API · MCP | `https://api.netiumpartners.com` |
| 공개 이메일 | `admin@netiumpartners.com` |

## 반영 상태 · 2026-10-08

- 새 회사·Studio 도메인의 Vercel HTTPS 응답을 확인했습니다. 회사 대표 주소는 www 도메인입니다.
- `api.netiumpartners.com` DNS는 Mac mini 공인 IP를 가리킵니다. Nginx HTTPS 가상 호스트와 Let's Encrypt 인증서를 적용했으며 최초 인증서 만료일은 2027-01-06입니다.
- API 세션 조회 JSON 200, 비인증 작업실 요청 401, MCP OAuth 메타데이터의 새 resource·issuer 주소, HTTP → HTTPS 301을 확인했습니다.
- `config.json`의 API·프론트 원본 주소와 새 도메인 요청 허용 설정을 반영했습니다. 기존 `api.snowlink.team`과 이전 도메인의 Nginx 및 허용 목록은 연결 전환을 위해 유지합니다.
- 두 프론트의 링크·canonical·OG·사이트맵·AI 안내문·MCP 안내는 새 도메인을 사용합니다.
- 프론트는 Vercel에서 배포하고 Mac mini에서는 백엔드만 실행합니다.

## Vercel

Studio 프로젝트 Root Directory는 `apps/studio`입니다. 아래 값을 설정하고 재배포합니다. 기존 환경변수가 있으면 코드 기본값보다 우선합니다.

```dotenv
STUDIO_API_ORIGIN=https://api.netiumpartners.com
NEXT_PUBLIC_COMPANY_SITE_URL=https://netiumpartners.com
```

회사 소개 프로젝트 Root Directory는 `apps/company`이며 별도 환경변수 없이 `lib/config.js`의 회사·제품 주소와 이메일을 사용합니다. 메일 계정과 수신 DNS 설정은 사이트에 표시되는 주소 변경과 별개입니다.

## Google OAuth · MCP

Google Cloud OAuth 클라이언트의 승인된 리디렉션 URI에는 새 콜백을 추가해야 합니다. 이 외부 콘솔 등록은 Nginx 설정만으로 자동 변경되지 않습니다.

```text
https://studio.netiumpartners.com/api/google/oauth/callback
```

MCP 주소는 `https://api.netiumpartners.com/mcp`입니다. 기존 클라이언트의 서버 주소를 변경한 뒤 새 주소에서 로그인합니다. 안내 페이지는 `https://studio.netiumpartners.com/mcp`입니다.

## Nginx · 인증서

배포 설정은 `deploy/nginx/api.netiumpartners.com.conf`입니다. Mac mini `/Users/snowfall/orca/cbt_bank/infra/nginx.conf`의 `BEGIN NETIUM API` 블록을 `cbt-nginx`가 읽습니다. Certbot 저장소의 `live/api.netiumpartners.com/`에서 인증서를 읽으며 비밀 파일은 Git에 포함하지 않습니다.

자동 갱신 스크립트와 launchd 등록 방법은 [배포 안내](../deploy/README.md)를 따릅니다. 다른 서비스의 인증서·가상 호스트는 변경하지 않습니다.
