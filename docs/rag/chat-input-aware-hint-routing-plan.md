# Chat Input Aware Hint Routing Plan

## 1. 목적

`POST /api/v1/hints/live`에 `userMessage`를 반영하고, 라우팅을 **규칙 기반 없이 LLM 분류(nano)** 로 처리한다.

- `hint_question` -> 기존 HINT RAG 경로
- `lore_question | other` -> `BLOCKED_NON_HINT` 차단 연출 응답

주의:
- 지금은 LORE RAG를 구현하지 않는다.
- 어떤 경우에도 힌트 응답에서 정답 문자열을 완전 동일하게 노출하지 않는다.

---

## 2. 결정 사항

1. 라우팅 방식
- 키워드/패턴 규칙 사용 안 함
- `gpt-5-nano` 1회 분류 호출로 `message_type` 결정
- 허용 라벨: `hint_question | lore_question | other`

2. 라우팅 결과
- `hint_question` -> `routeDecision=RAG_HINT`
- `lore_question | other` -> `routeDecision=BLOCKED_NON_HINT`

3. 비힌트 응답
- 세계관/잡담/욕설/무관 질문은 RAG/생성 미수행
- 몰입형 차단 멘트 랜덤 반환

4. 정답 완전 노출 방지
- 프롬프트 정책 강화
- 백엔드 후처리 마스킹으로 2차 강제
- 예: `ssh guest@172.22.4.19` -> `ssh guest@서버ip`

---

## 3. 실행 단계

- [x] Step 1: DTO 확장 (`userMessage`, `messageType`, `routeDecision`)
- [x] Step 2: orchestrator retrieve에 nano 라벨링 추가
- [x] Step 3: `BLOCKED_NON_HINT` 경로 조기 반환
- [x] Step 4: backend orchestration 분기 처리 (`BLOCKED_NON_HINT` 즉시 응답)
- [x] Step 5: 차단 연출 메시지 랜덤 템플릿 적용
- [x] Step 6: RAG 경로 query_text에 userMessage 보조 반영(길이 제한)
- [x] Step 7: LLM 입력/프롬프트에 userMessage 전달
- [x] Step 8: 정답 문자열 마스킹 후처리 적용
- [x] Step 9: 환경변수 확장 (`GMS_ROUTER_MODEL`, `HINT_USER_MESSAGE_MAX_LENGTH` 등)
- [x] Step 10: 빌드 검증 (`python compileall`, `backend compileJava`)
- [ ] Step 11: 런타임 통합 확인 (hint/lore/other 실제 호출 테스트)

---

## 4. 수용 기준(AC)

1. 빈 바디 요청은 기존과 호환된다.
2. `userMessage`가 힌트 질문이면 기존 RAG 경로를 탄다.
3. `userMessage`가 세계관/기타면 `BLOCKED_NON_HINT` 응답을 반환한다.
4. 응답에 `messageType`, `routeDecision`이 포함된다.
5. 힌트 응답에서 정답 문자열이 완전 동일하게 노출되지 않는다.

---

## 5. 다음 단계

- Step 11 완료 후, 분류 오분류 로그를 기반으로 nano 프롬프트 미세조정
- LORE RAG 구현 시 `lore_question` 분기만 `LORE_RETRIEVE -> LORE_GENERATE`로 교체
