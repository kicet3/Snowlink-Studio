# 캐릭터챗과 제품 포지셔닝 보강 — 2026-10-09

## 요청과 판단 근거

- 기존 담당자가 `kicet3/Snowlink-Studio`의 기존 Node 운영 백엔드와 `apps/company`, `apps/studio`를 수정한다. 별도 FastAPI 마이그레이션 WIP와 `.env.example` 사용자 변경은 포함하지 않는다.
- 기존 `server/characterStudio.mjs`의 `chatCharacter`와 `studio_character_chat`은 캐릭터 시트 제작용 AI 아트 디렉터였다. 인물 자체와 대화하는 기능과 서버 대화 기록은 없었다. 기존 기능은 유지하고 별도 캐릭터챗을 연결했다.
- 제품 메리트가 과거 신청 탈락 원인이라는 증거는 없다. 현재 신청 결과나 내부 심사 기준을 추정하지 않는다. 이번 보완은 실제 제품 흐름과 외부 설명을 일치시키는 작업이다.
- 법적 사업자 스노우링크, 브랜드 Snowlink Team, 제품 Snowlink Team Studio, 대표 이현대, 연락처 ceo@snowlink.team은 유지한다. DNS·메일·OAuth 콘솔·기존 API 호스트를 변경하지 않는다.

## 구현과 설명

- 공개 진입: `https://studio.snowlink.team/chat`. 회사 히어로, Studio 첫 화면·메뉴, 공개 작품 상세와 내 캐릭터 목록에서 연결한다.
- 공개 원작의 서린·아린·도윤 또는 이름·성격·말투·세계관으로 만든 내 캐릭터를 선택한다. 이미지는 선택 사항이다. 기존 공개 갤러리의 동일 데이터를 재사용한다.
- 공개 작품은 선택한 회차까지의 원고, 내 작품은 출연 인물을 연결한 시나리오의 연속 완료 회차만 선택한다. 내 작품은 기존 그래프 검색 결과의 요약·사실·복선 및 마지막 회차 원고 일부를 사용한다. 미래 플롯과 stale 원고를 넣지 않는다. 캐릭터 프로필 자체의 설정은 항상 참고한다.
- 시작 시 맥락을 고정하며 최근 최대 20개 메시지(문자 예산 내 완전한 문답)를 참고한다. 설정 변경은 새 대화에 반영한다. 대화가 원고·그래프를 자동 수정하지 않는다. 장기 기억·무제한 기억을 주장하지 않는다.
- 계정/방문자 데이터 디렉터리의 `persona-chats.json`에 원자적으로 저장한다. 대화방 50개, 방당 100문답. 파일 권한 0600. 손상 시 빈 기록으로 덮어쓰지 않는다. 기록 조회·삭제는 같은 작업실만 가능하다.
- revision으로 동시 편집을 보호하고 requestId로 진행 중/완료 요청 재전송을 중복 생성하지 않는다. 오류 시 입력과 기존 기록을 유지한다. UI에 재조회·재시도·삭제 확인과 빈 상태를 제공한다.
- 인증된 MCP에도 `studio_persona_catalog`, `studio_persona_conversations`, `studio_persona_conversation`, `studio_persona_start`, `studio_persona_send`, `studio_persona_remove`를 노출한다. 기존 시트 제작 도구의 의미를 바꾸지 않는다.
- 회사·Studio·가이드·영문 소개·메타데이터·구조화 데이터·공개 텍스트에서 “이야기를 만들고, 그 안의 캐릭터와 대화하세요”로 설명한다. 웹툰용 인물 설정 대화와 웹툰 제작 기능을 구분한다. 유명 IP 제공·제휴·사용자 실적을 추가하지 않는다.

## 검증 기록

- 두 Next.js 앱 운영 빌드 성공.
- Studio 기존 테스트 7개 통과.
- `tests/persona-chat.test.mjs` 신규 7개: 공개 인물/회차 범위, 실제 메시지 전달과 저장 복원, 중복·동시 요청, 실패 후 재시도, 최근 대화 제한, 시나리오 그래프 연결·고정 스냅샷·원고 불변, 손상 파일 보존, HTTP 입력 검증·방문자 간 격리.
- 기존 캐릭터 시트 6개 및 스토리·계정·MCP·공개 작업실 회귀 8개 통과. 총 28개 관련 테스트 통과.
- 운영 백엔드 재시작 전 진행 중 Studio 작업 0개 확인. 미디어 엔진 연결 중단을 발견하여 기존 시작 절차로 복구. API 연결 조회에서 이미지/트렌드 엔진 online 확인.
- 실제 `https://studio.snowlink.team/api/studio/actions` 호출 검증: 공개 카탈로그 → 서린 첫 응답 → 사용자 이름/동행 약속을 묻는 후속 응답 → 기록 재조회 → 같은 requestId 재전송으로 추가 생성 없음.
- 독립 QA 방문자에서 직접 캐릭터 생성 → 전체 플롯/회차 플롯/원고/근거 기억 저장 → 선택한 인물이 원고의 푸른 열쇠에 답함 → 원고 revision 불변. 대화방은 삭제하고 QA 캐릭터/시나리오를 보관 처리한 뒤 로그아웃했다. 실제 사용자 대화·쿠키·토큰은 문서에 수록하지 않는다.
- 실제 생성 응답의 provider=`gpt`, model=`gpt-6-luna`. Claude Code는 개발 도구이며 MCP는 연결 기능이다. Claude API 집필·캐릭터챗 전환, 장기 일관성 평가, prompt caching은 계획이다.

## 배포 상태

기능 커밋 `5d416ad`를 main에 푸시했고 GitHub Vercel 상태에서 `snowlink-team`, `snowlink-team-studio` 모두 success를 확인했다. 기존 자동 Production 배포 경로를 사용했으며 Vercel/Cloudflare 콘솔은 변경하지 않았다.

- 회사 배포: https://vercel.com/linkers-projects-eaaa7ebb/snowlink-team/45ixincNGdsS9DNV1Q3ofYdyQfsB
- Studio 배포: https://vercel.com/linkers-projects-eaaa7ebb/snowlink-team-studio/F3DnSRqK5GbXnSsYu7suDL3M8Jyo
- `https://snowlink.team` → `https://www.snowlink.team/` 308 유지.
- 회사, Studio 루트, `/chat`, `/guide`, 공개 소설 상세, API 세션 조회 HTTPS 200.
- 회사/Studio의 title·canonical·캐릭터챗 CTA 확인. 위 HTML에서 Netium/네티움/옛 도메인 문자열 없음.
- 양쪽 `llms.txt`, `llms-full.txt`, Open Graph PNG, sitemap 모두 200. Studio sitemap에 `/chat`, 공개 텍스트에 현재 기능과 Claude API 계획 포함.
- 브라우저 검증 후 이름 뒤 잘못된 조사(예: 서린와)를 중립적인 “서린에게 말 걸기 / 서린 · 새 대화 시작”으로 수정하고, 초기 API 연결 실패 시 캐릭터를 바꿔도 오류와 재시도 버튼을 유지하도록 보완했다. 보완 후 Studio 운영 빌드도 통과. 최종 후속 커밋/배포 상태는 터미널 완료 보고와 Git 이력에서 확인한다.

### 실제 브라우저 검증 환경과 결과

이 터미널에 연결된 Chrome 확장 브라우저의 별도 검증 탭에서 공개 운영 URL을 사용했다. 로컬 담당자의 제목만 갱신되고 회색으로 나온 별도 브라우저 결과는 UI 검증 근거에 포함하지 않았다. 모바일은 실제 기기 실험이 아니라 390×844 viewport 검증이다.

- 로그인 없는 방문자 상태에서 공개 캐릭터 선택과 새 대화 시작, 입력·전송·대기 상태와 실제 답변 표시 확인.
- 서린 첫 인사 후 이름과 배달 동행 약속을 다시 묻는 후속 질문에 답변. 실제 마지막 응답에 이름이 포함되는지 확인했다.
- 브라우저 새로고침 후 4개 메시지(2문답) 복원과 저장 목록 진입 확인.
- 모바일에서 “나만의 캐릭터 만들기”로 이름·성격·말투만 저장하고 새 대화. 실제 답변이 설정의 나침반을 참조함을 확인. 이미지 없이 등록 가능.
- Studio 390px viewport에서 문서 폭=scrollWidth=390, 데스크톱 문서 폭=scrollWidth=1474. 회사 390px에서도 가로 넘침 없음. 임시 viewport는 원래대로 복원했다.
- 브라우저 QA에서 만든 인물/문답은 해당 방문자 작업실의 검증 기록이며 공개 작품이나 실제 고객 실적이 아니다. 대화 본문을 이 문서에 싣지 않는다.

## 로컬 브라우저 담당자 재현 절차

1. 데스크톱/모바일에서 `https://studio.snowlink.team/chat`을 연다. 로그인 없이 서린·아린·도윤 선택이 보여야 한다.
2. 서린 → 1화까지 → 새 대화 시작. 이름을 알려주고 함께 배달하자고 인사한 뒤 이름과 약속을 다시 묻는다.
3. 새로고침 후 문답 유지와 왼쪽 “이어서 대화하기”의 재진입을 확인한다.
4. “나만의 캐릭터 만들기”에서 원작 인물을 이름/성격만으로 저장하고 대화한다. 이미지가 필수여서는 안 된다.
5. 시나리오 작업실에서 그 인물을 출연자로 선택해 회차 원고와 이야기 기억을 완성하면, 새 대화의 작품 선택에 해당 작품·완료 회차가 보여야 한다.
6. 두 번째 방문자/다른 계정에서 첫 방문자의 대화 주소를 열면 기록을 찾을 수 없다는 오류가 나야 한다.
7. `/`, `/explore/moon-post-office`, `/characters`, `/guide#chat`, 회사 소개에서 캐릭터챗 CTA를 확인한다. 390px 및 데스크톱에서 가로 넘침·버튼/입력 접근·오류 재조회·키보드 초점도 확인한다.

## 남은 범위와 외부 의존성

- 방문자 기록은 해당 쿠키/세션으로 접근하며 다른 기기나 로그인 계정으로 자동 이관되지 않는다.
- 캐릭터챗의 최근 대화 맥락은 전체 기록의 영구 기억이 아니다. AI의 원작 해석 오류가 가능하다. 변경한 원고의 맥락으로 대화하려면 새 대화를 시작한다.
- 서버 중단 시 완료되기 전 AI 호출은 저장되지 않을 수 있다. 완료된 문답의 재전송 중복 방지와 원자적 저장은 제공하지만 공급자 호출의 중단 시점까지 exactly-once를 보장하지 않는다.
- Google OAuth callback 콘솔 Save는 별도 사용자 실행 승인 보류 상태를 유지한다. 이 기능의 방문자 흐름에는 새 OAuth 승인이 필요 없다.
- 웹툰 회차 자동 제작, 특정 유명 IP 제공, 자동 SNS 게시를 새 기능으로 주장하지 않는다.

## 후속 포지셔닝 — 일상 속 작은 연결 (2026-10-09)

- 사용자 요청에 따라 창작·캐릭터챗 기능 설명에 사회적 목적을 더했다. 핵심 기능 문구 “이야기를 만들고, 그 안의 캐릭터와 대화하세요”는 유지한다.
- 회사 미션: “스노우링크는 소설·웹툰 속 창작 캐릭터와의 대화를 통해, 한국 사회에서 외로움을 느끼는 사람들이 일상에서 작은 연결감을 얻도록 돕고자 합니다.” 보조 문구: “이야기 속 대화로, 일상에 작은 연결을.”
- 회사 히어로/소개/제품 요약/영문 소개, Studio 첫 화면/캐릭터챗 안내/가이드, 메타데이터·구조화 데이터·공개 AI 텍스트를 함께 맞췄다. 목적을 설명하며 효과 입증·의료 기능·고객 성과를 주장하지 않는다. 별도 경고나 동의창을 추가하지 않는다.
- 문구만 변경했다. 기존 캐릭터챗 구현, 운영 모델 GPT(gpt-6-luna), Claude Code 개발·인증 MCP, 향후 Claude API·장기 맥락·prompt caching 계획의 구분은 유지한다. 기존 28개 기능 검증 및 유료 AI 대화는 반복하지 않는다.
- 이번 검증: 회사·Studio Next.js 운영 빌드 성공, 기존 SEO/공개 텍스트 테스트 2개 통과. 회사/Studio의 현재 AI 설명·Claude 계획, 공개 텍스트와 영문 초안 일치 및 500자 제한을 확인했다. 공개 문구/링크·배포 확인 결과는 완료 보고에 구분해 기록한다. 다른 작업자의 WIP, 도메인·DNS·메일, OAuth 콘솔 Save 보류 상태와 신청 제출 상태는 변경하지 않는다.

## 신청서용 영문 초안 (최신 포지셔닝, 각 500자 이내, 제출하지 않음)

Product:
Snowlink Team Studio aims to offer moments of connection to people experiencing loneliness in Korea. Creators write stories and readers chat with original novel or webtoon characters using personality, selected story context and recent messages, with saved histories. We develop with Claude Code and offer authenticated MCP tools. Writing and chat currently use GPT; Claude API migration and prompt caching are planned.

Support:
We seek Claude API credits and technical guidance for a story and character-chat service aimed at everyday connection for people experiencing loneliness in Korea. We plan to migrate dialogue and serial writing from GPT, evaluate character consistency, longer context, latency and cost, and test prompt caching for prior manuscripts. We also plan to expand our existing authenticated MCP tools.
