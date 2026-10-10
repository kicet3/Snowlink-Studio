# Snowlink Team Studio — 제품·Claude 활용 지원 자료

갱신: 2026-10-10. 수정 가능한 후속 초안이며, 이번 작업에서는 신청서를 제출하지 않는다. 기술 구현과 현재 운영 상태는 [캐릭터챗 배포 기록](character-chat-release.md)을 기준으로 한다.

## 정체성과 공개 링크

- 법적 사업자: 스노우링크 / 대표·신청자: 이현대
- 공개 회사 브랜드: Snowlink Team / 제품: Snowlink Team Studio
- 문의: ceo@snowlink.team / Claude 조직: SnowLink
- 회사: https://www.snowlink.team (snowlink.team → www)
- 제품 체험: https://studio.snowlink.team/chat
- 문제·현재 경험: https://www.snowlink.team/#experience 및 https://studio.snowlink.team/guide#experience
- 현재 Claude 활용과 개발 계획: https://www.snowlink.team/#claude 및 https://studio.snowlink.team/guide#claude
- 평가·지원 목적: https://www.snowlink.team/#evaluation 및 https://studio.snowlink.team/guide#evaluation

## 한국어 설명

### 문제와 미션

외로움을 느끼는 순간, 감정이나 하루의 이야기를 부담 없이 나눌 대화 경험을 찾기 어려울 때가 있습니다. 스노우링크는 한국 사회의 이런 일상에 주목합니다.

스노우링크는 소설·웹툰 속 창작 캐릭터와의 대화를 통해, 한국 사회에서 외로움을 느끼는 사람들이 일상에서 작은 연결감을 얻도록 돕고자 합니다.

**이야기 속 대화로, 일상에 작은 연결을.** 이는 제품의 목적이며 사회적 효과를 측정해 입증했다는 의미는 아닙니다.

### 현재 제품이 제공하는 경험

**이야기를 만들고, 그 안의 캐릭터와 대화하세요.** 창작자는 소설을 쓰고 소설·웹툰용 인물의 성격과 세계관을 만듭니다. 독자는 인물을 선택해 작품 속 질문부터 오늘의 이야기까지 자신의 속도로 대화합니다.

1. 공개 인물 서린·아린·도윤 또는 이름·성격만으로 만든 내 캐릭터를 선택합니다. 이미지는 필수가 아닙니다.
2. 선택한 작품과 회차의 맥락으로 첫 대화를 나눕니다. AI는 인물의 관점으로 답합니다.
3. Studio에 로그인한 계정에서 저장한 대화방을 열어 이어갑니다. 모든 Studio 작업실 페이지는 로그인이 필요합니다.

현재 운영 집필·대화 모델은 GPT `gpt-6-luna`입니다. 캐릭터챗은 시작 시 저장한 인물 설정·선택한 작품 맥락과 최근 최대 20개 메시지를 길이 한도 안에서 참고합니다. 내 시나리오를 연결하면 완료된 회차의 그래프 정보와 원고 일부를 사용합니다. 대화가 원작이나 이야기 그래프를 자동으로 수정하지 않습니다. 이전 방문자 접근은 중단됐으며, 기존 방문자 자료를 계정으로 자동 이전하지 않습니다. 웹툰은 사용자가 설정한 인물과의 대화 범위이고, 웹툰 회차 자동 제작이나 특정 유명 IP 캐릭터 제공을 뜻하지 않습니다.

### Claude로 발전시키려는 방식

현재 제품 개발에는 Claude Code를 사용하고, 창작자는 인증된 MCP를 통해 Studio 작업을 요청할 수 있습니다. 제품의 집필·캐릭터챗 엔진을 Claude API로 전환하는 일은 다음 개발 계획입니다.

| 계획 | 준비하는 입력과 처리 | 확인할 점 |
| --- | --- | --- |
| Claude API 대화·집필 통합 | 인물 성격, 세계관, 선택한 회차의 맥락을 대화와 연재 집필에 전달 | 인물의 말투와 설정 유지, 선택 범위를 벗어난 사실 생성 |
| 원고의 구조화 추출 | 캐릭터·관계·사건·세계관 정보를 원고 근거와 함께 정리 | 추출한 정보의 근거, 누락·오류와 회차 범위 |
| 이전 대화 요약 평가 | 이름·약속·중요한 사건을 요약해 다음 대화에 전달 | 오래된 대화의 연결, 요약 누락·잘못된 기억 |
| prompt caching과 MCP 확장 | 이전 원고의 캐시 활용 실험, 기존 인증 MCP 도구 확대 | 맥락 재사용 시 지연과 토큰 비용, 연결 흐름 |

대화 요약은 현재의 기록 저장·최근 메시지 참조와 구분되는 개발 계획입니다. 무제한 영구 기억을 약속하지 않습니다.

### 평가와 개선 계획

고정된 허구 인물·작품·대화 시나리오에서 같은 조건으로 결과를 비교할 계획입니다. 예를 들어 인물 소개, 작품의 특정 회차 질문, 이전에 알려준 이름·약속의 재확인, 새 사건 이후의 후속 대화를 포함합니다. 실제 이용자의 개인 대화를 고정 평가 자료로 가정하지 않습니다.

| 평가 항목 | 앞으로 확인할 기준 |
| --- | --- |
| 캐릭터 일관성 | 성격·말투·세계관과 응답 사이의 충돌 여부 |
| 대화 연속성 | 이전 이름·약속·사건의 유지와 요약의 누락·오류 |
| 사용자 평가 대화 품질 | 체험자가 평가하는 대화의 자연스러움과 상황 적합성 |
| 응답 지연 | 메시지를 보낸 뒤 답변을 받기까지 기다리는 시간 |
| 토큰 비용 | 요청별 입력·출력과 캐시 사용에 따른 토큰 비용 |

현재 흐름과 후보 구현을 같은 시나리오로 비교하고, 사용자 체험 평가를 더해 발견한 문제를 수정한 뒤 다시 확인하려 합니다. 측정 결과와 비교 수치는 아직 없으며, 외로움 감소나 의료 효과를 검증하는 지표로 제시하지 않습니다.

### 지원 요청과 크레딧 사용 목적

Claude API 크레딧과 기술지원은 GPT에서 Claude API로 캐릭터 대화·연재 집필을 통합하고 문제를 해결하는 데 활용하고자 합니다. 구조화 추출, 대화 요약, 이전 원고의 prompt caching과 기존 인증 MCP 확장을 고정된 허구 시나리오에서 평가하는 데 사용하려 합니다. 결과를 토대로 대화의 일관성·품질·지연·비용을 점진적으로 개선할 계획입니다. 실제 수혜 여부·사용량·개선 성과를 이미 확보했다고 주장하지 않습니다.

## English narrative

### Problem and mission

People experiencing loneliness in Korea may find it difficult to find a low-pressure conversational experience where they can share everyday feelings and stories. Snowlink Team aims to offer small moments of connection through conversations with original characters. This is our purpose, not a demonstrated social or clinical outcome.

### Live product experience

Creators write stories and define characters for novels or webtoons. Readers select an original character, choose the available story context and start a conversation. Studio requires an account login. Readers can return to saved chats in the same account. The live writing and dialogue engine uses GPT (`gpt-6-luna`). Character dialogue uses a snapshot of the character and selected story context plus recent messages within a bounded window. It does not automatically change the manuscript or story graph.

We develop with Claude Code and provide authenticated MCP tools. Those existing uses are distinct from the planned Claude API integration. The product supports character definitions and dialogue, not automated production of complete webtoon episodes or a licensed catalogue of famous characters.

### Planned Claude integration

We plan to integrate Claude API character dialogue and serialized writing grounded in character traits, the fictional world and selected story context. Structured extraction would prepare character, relationship, event and world details from manuscripts. We plan to evaluate summaries of prior conversations to carry forward key details while checking omissions and false memories. This extends the current bounded recent-message context; it is not a promise of unlimited permanent memory. Prompt caching for prior manuscripts and extensions to our authenticated MCP tools are also planned.

### Evaluation and requested support

We plan to compare implementations on fixed fictional characters, stories and dialogue scenarios, then incorporate user-rated dialogue quality. The evaluation will cover character consistency, conversation continuity, perceived naturalness and contextual relevance, response latency and token cost. Findings will guide revisions and repeat evaluation. These are proposed measurements, not reported results.

We seek Claude API credits and technical guidance for integration, troubleshooting and those evaluations, including structured extraction, conversation summaries, manuscript prompt caching and MCP extensions. We have not established an effect on loneliness or mental health, and we do not claim that Claude outperforms other models without evaluation.

## Application field drafts — each at most 500 characters

The counts include spaces and punctuation, exclude these labels and the final newline. These are follow-up drafts, not a record of a new submission.

Product (481 characters):
Snowlink Team Studio aims to offer everyday connection to people experiencing loneliness in Korea through conversations with original novel and webtoon characters. Our live GPT-based product uses character traits, story context and saved chats. We plan to integrate Claude API dialogue, extract character and world details from manuscripts, and summarize prior conversations to preserve continuity. Claude Code and authenticated MCP tools already support development and workflows.

Support (443 characters):
We seek Claude API credits and technical guidance to integrate story-grounded character dialogue and serialized writing. We plan to evaluate character consistency, conversation continuity, user-rated dialogue quality, latency and token cost on fixed fictional scenarios, then use findings to improve the experience. We will test conversation summaries, prompt caching and structured extraction, and extend our existing authenticated MCP tools.

## 근거 / Source records

- `server/personaChat.mjs`: 인물 역할 대화, 선택 회차·스토리 그래프 맥락, 최근 메시지 범위, 저장·복원.
- `server/studioActions.mjs`, `server/studioTools.mjs`: 인증된 작업실과 MCP 도구 연결.
- `apps/company/lib/config.js`, `apps/studio/app/_lib/guide.js`: 공개 문제·경험·현재 활용·향후 계획·평가·지원 문구.
- `docs/character-chat-release.md`: 기존 기능 커밋, 실제 모델 응답과 브라우저/테스트 검증 이력.
- 사회적 목적·Claude 전환 계획·지원 요청: 이번 사용자의 확정 지시. 평가 결과나 실제 지원 혜택에 대한 외부 증거로 취급하지 않는다.

## 작업 범위와 제출 상태

사용자 전달 기준으로 2026-10-08 23:03 KST 신청 1회가 접수됐고, 마지막 2026-10-09 01:06:55 KST 메일 확인에는 새 결정이 없었다. 이번 문서 작성에서 메일을 다시 확인하거나 신청을 재제출하지 않았다. 후속 신청과 PDF/자동화는 부모 담당자가 관리한다.

이번 작업은 공개 설명과 지원 자료를 완성하는 변경이다. Claude API 결제·모델 통합·권한 확대를 시작하지 않는다. Google OAuth 콘솔 Save의 실행 시점 사용자 확인 보류, DNS·메일·도메인 설정, 다른 작업자의 변경은 유지한다.
