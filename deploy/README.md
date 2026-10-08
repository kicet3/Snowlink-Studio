# 분리 배포

| 서비스 | 소스 / 실행 | 주소 |
| --- | --- | --- |
| Studio 프론트 | Vercel Root Directory `apps/studio` | `https://studio.snowlink.team` |
| 회사 소개 프론트 | 별도 Vercel 프로젝트, Root Directory `apps/company` | `https://snowlink.team` |
| API | Mac mini `127.0.0.1:3400` → Nginx | `https://api.snowlink.team` |

두 프론트는 각각의 `package.json`, lockfile, Next.js 설정과 소스만으로 빌드합니다. Studio에 회사 소개 화면을 포함하지 않으며 `NEXT_PUBLIC_COMPANY_SITE_URL`로 외부 소개 사이트를 연결합니다. 회사 소개의 제품 버튼은 `https://studio.snowlink.team`으로 연결합니다.

현재 API 실행은 기존 서버이며 전체 FastAPI 전환은 별도 진행 중입니다. 이 배포 설정은 API 내부 구현과 무관하게 3400 포트로 전달합니다.

## Nginx

`nginx/api.snowlink.team.conf`는 `http` 블록 안에 넣는 설정입니다. 기존 Mac mini에서는 `cbt-nginx` 컨테이너의 공유 설정에 `BEGIN SNOWLINK STUDIO`와 `END SNOWLINK STUDIO` 사이에 적용합니다. 다른 서비스의 가상 호스트는 유지합니다. Docker DNS resolver `127.0.0.11`이 필요합니다.

HTTPS 인증서는 Certbot webroot 방식으로 `/etc/letsencrypt/live/api.snowlink.team/`에 발급합니다. 인증서 파일과 개인 키는 저장소에 포함하지 않습니다. 인증서 최초 발급 전에는 80 포트의 ACME 경로만 먼저 준비해야 합니다.

Mac의 단일 파일 bind mount에서는 변경 내용을 컨테이너가 모두 읽는지 확인하고 `docker exec cbt-nginx nginx -t`가 성공한 뒤 `docker exec cbt-nginx nginx -s reload`를 실행합니다. 전체 Nginx 컨테이너를 재시작할 필요는 없습니다.

API의 연결 실패(502/503/504)는 JSON 503 응답으로 처리합니다. SSE와 영상 요청을 위해 프록시 버퍼링을 끄고 900초 제한을 둡니다.

Google Cloud의 승인된 리디렉션 URI는 다음 값을 사용합니다. 로그인 쿠키를 가진 Studio 프론트가 이 요청을 API로 전달합니다.

```text
https://studio.snowlink.team/api/google/oauth/callback
```

MCP 클라이언트는 `https://api.snowlink.team/mcp`에 연결하며, OAuth 승인 화면만 Studio 프론트에서 표시합니다.

## 연결 확인

`https://api.snowlink.team/api/auth/session` 및 `https://studio.snowlink.team/api/auth/session`은 로그인 전에도 HTTP 200의 JSON을 반환해야 합니다. 인증 없이 `/api/workspace`를 조회하면 JSON 401이 정상입니다. HTML 오류 페이지가 반환되면 API 도메인의 인증서, Nginx 가상 호스트와 3400 포트의 실행 상태를 확인합니다.
