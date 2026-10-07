# snowfall studio 도메인 전환

사용자가 확정한 주소와 공개 이메일입니다.

| 용도 | 새 주소 |
| --- | --- |
| 회사 소개 | `https://snowfall.it.com` |
| Studio | `https://studio.snowfall.it.com` |
| API · MCP | `https://api.snowfall.it.com` |
| 공개 이메일 | `admin@snowfall.it.com` |

## 반영 상태 · 2026-10-07

- 회사 소개 루트 도메인은 Vercel에 연결됐으며 `www.snowfall.it.com`으로 이동합니다.
- API는 Mac mini IP로 연결됐고 Nginx HTTPS 및 Let's Encrypt 인증서 발급을 완료했습니다. 기존 API 주소도 유지합니다.
- `config.json`에 새 API 및 Studio origin을 추가했습니다.
- Studio 서브도메인은 DNS 레코드와 Vercel 프로젝트 연결 확인을 기다립니다. 확인 전까지 회사 페이지의 서비스 버튼과 백엔드의 기본 프론트 주소는 기존 Studio 주소를 사용합니다.

## Studio 전환 시 함께 변경할 값

Vercel의 Studio 프로젝트(`apps/studio`)에 `studio.snowfall.it.com`을 추가하고 Vercel에서 안내하는 DNS 레코드를 등록합니다. 환경변수는 다음과 같습니다.

```dotenv
STUDIO_API_ORIGIN=https://api.snowfall.it.com
NEXT_PUBLIC_COMPANY_SITE_URL=https://snowfall.it.com
```

주소가 정상 응답하면 백엔드 `config.json`의 `publicOrigin`을 `https://api.snowfall.it.com`, `frontendOrigin`을 `https://studio.snowfall.it.com`으로 변경하고 기존 주소는 호환용 origin으로 유지합니다. 회사 페이지 `apps/company/lib/config.js`의 `service.url`도 새 Studio 주소로 바꾸고 재배포합니다.

Google OAuth 클라이언트의 승인된 리디렉션 URI에 `https://studio.snowfall.it.com/api/google/oauth/callback`을 등록합니다. 콜백은 로그인 쿠키가 있는 프론트를 거쳐 API로 전달됩니다. MCP 연결 주소는 `https://api.snowfall.it.com/mcp`이며 새 issuer 주소를 사용하는 연결은 다시 로그인합니다.

## API Nginx

버전 관리용 설정은 `deploy/nginx/api.snowfall.it.com.conf`입니다. 현재 적용본은 `/Users/snowfall/orca/cbt_bank/infra/nginx.conf`의 `BEGIN SNOWFALL API` 블록이며 `cbt-nginx` 컨테이너가 사용합니다. 다른 서비스와 기존 API 설정은 유지합니다.

인증서 파일은 기존 Certbot 저장소의 `live/api.snowfall.it.com/`에 저장됩니다. 인증서·개인 키는 Git에 넣지 않습니다. 기존 Certbot webroot 갱신 대상에 포함되며 갱신 뒤 Nginx를 reload해야 합니다.

Mac mini에서는 백엔드만 실행하고 프론트는 Vercel을 사용합니다.
