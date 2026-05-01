# Live Hint Orchestration Phase 1 Guide

## 1. 문서 목적

이 문서는 "실시간 힌트 API가 내부에서 어떻게 동작하는지"를 구현/운영 관점에서 완전히 설명한다.

- 대상 API: `POST /api/v1/hints/live`
- 대상 코드축: `backend` + `ai/hint-orchestrator`
- 범위: Retrieval -> LLM 생성 -> 폴백 -> 응답 조립

---

## 2. 현재 아키텍처

### 2.1 백엔드 (`backend`)

주 역할:

1. 유저 현재 상태 기반 retrieval 실행
2. evidence/정책 컨텍스트 준비
3. 오케스트레이터(LLM 호출부)에 생성 요청
4. 성공 시 LLM 결과 반영, 실패 시 템플릿 폴백

핵심 클래스:

- `HintController`
- `HintOrchestrationServiceImpl`
- `HintRetrievalServiceImpl`
- `HintLlmOrchestratorClient`
- `LucasKnowledgeVectorSearchRepository`

### 2.2 힌트 오케스트레이터 (`ai/hint-orchestrator`)

주 역할:

1. developer/user prompt 구성
2. GMS(OpenAI 호환) Chat Completions 호출
3. JSON 응답 파싱 후 backend에 반환

핵심 파일:

- `app/main.py`
- `app/gms_client.py`
- `app/prompt_builder.py`
- `app/prompts/lucas_developer_prompt.txt`

---

## 3. 엔드투엔드 시퀀스

1. 클라이언트 -> `POST /api/v1/hints/live` 호출
2. 백엔드 retrieval 실행
3. query 임베딩 생성 + PGVector 검색
4. evidence + 정책 + 런타임 컨텍스트 조립
5. 백엔드 -> 오케스트레이터 `/v1/hints/generate` 호출
6. 오케스트레이터 -> GMS chat completion 호출
7. JSON 파싱 성공 시 결과 반환
8. 실패 시 백엔드 템플릿 폴백 반환

---

## 4. 응답 필드 해석 기준

- `hint`, `hintLevel`, `whyThisHint`, `nextActionType`, `nextInputPattern`, `usedTransitionIds`
- `retrieval` 블록: 검색 내부 상태 디버깅 용

중요 판정식:

- LLM 폴백 여부 판단:
  - `whyThisHint == llm_orchestrator_unavailable_fallback` 이면 LLM 실패 폴백
- 검색 phase 판단:
  - `selectedPhase` (`strict`, `fallback_action_removed`, `fallback_chapter_only`)

`selectedPhase=fallback_*`는 검색 완화일 뿐, LLM 실패와 무관하다.

---

## 5. 힌트 레벨 정책(현재)

`failCountAfterAction` 기준:

- `0~2`: LIGHT
- `3~5`: MEDIUM
- `6+`: STRONG
- `lowConfidence=true`: LOW_CONFIDENCE 우선

검증 결과:

- fail=0 -> LIGHT
- fail=3 -> MEDIUM
- fail=5 -> MEDIUM
- fail>=6 -> STRONG

---

## 6. 폴백 설계(현재)

### 6.1 LLM 성공

- 오케스트레이터 JSON을 그대로 응답 매핑
- `whyThisHint`는 LLM 생성 설명

### 6.2 LLM 실패

- `HintOrchestrationServiceImpl`의 `composeFallbackHint(...)`로 문장 생성
- `whyThisHint=llm_orchestrator_unavailable_fallback`
- `nextActionType`, `nextInputPattern`, `usedTransitionIds`는 topEvidence에서 추출

---

## 7. 프롬프트 설계(현재)

### 7.1 분리 원칙

- developer: 역할/톤/제약
- user: 런타임 컨텍스트(JSON)

### 7.2 현재 톤 방향

- "강아지 캐릭터 연기"가 아니라 "시니어 개발자 멘토 루카스"
- 짧고 단호한 기술 멘토 톤

### 7.3 출력 강제

- `response_format: {"type":"json_object"}` 사용
- JSON 스키마 강제

---

## 8. 타임아웃 전략(현재 합의)

- 백엔드 오케스트레이터 호출 timeout: 20초
- 오케스트레이터 GMS 호출 timeout: 20초

근거:

- 관측 지연이 12s~15s, 꼬리 지연은 40s+까지 발생 가능
- timeout이 낮으면 정상 요청도 폴백으로 떨어짐

운영 권고:

- 실시간 UX 우선 시 20초 + 폴백 유지
- 안정성 우선 시 30초 이상 고려

---

## 9. 현재 검증 결과 요약

### 9.1 Retrieval 안정성

- 동일 노드에서 반복 호출 시 같은 transition 근거(예: 34)를 안정적으로 선택
- similarity 변동은 있어도 topEvidence는 일관

### 9.2 LLM 성공/실패 구분

- 동일 시나리오에서도 지연 상태에 따라 LLM 성공/폴백 혼재 가능
- `whyThisHint`로 즉시 구분 가능

### 9.3 실패 횟수 효과

- fail count 증가에 따라 hintLevel이 LIGHT->MEDIUM->STRONG으로 정상 승격
- 현재 프롬프트 정책에 따라 직접성도 증가 가능

---

## 10. 남은 개선 포인트

1. "정답과 먼 행동"일 때 재정렬 가중치 추가
- action_type mismatch penalty
- strict phase 우선 보존 강화

2. 직접 정답 노출 정책 재정의
- LIGHT/MEDIUM/STRONG 모두 직접 문자열 금지할지 정책 확정
- 금지 시 후처리 가드(정답 문자열 검출) 추가

3. 사용자 질문(`userQuestion`) 반영
- 프론트 채팅 입력을 retrieval query_text에 반영
- 단, evidence 밖 정보 생성 금지 룰 유지

4. 폴백 사유 코드 세분화
- `llm_timeout`
- `llm_http_error`
- `llm_empty_content`
- `llm_json_parse_fail`

---

## 11. 운영 시 빠른 판별법

응답에서 아래만 보면 상태를 즉시 알 수 있다.

1. `selectedPhase`
- 검색이 strict인지 fallback인지

2. `whyThisHint`
- LLM 성공 설명인지
- `llm_orchestrator_unavailable_fallback`인지

3. `usedTransitionIds` + `topEvidence.transitionId`
- 정답 근거가 일관적인지

---

## 12. 결론

현재 1차 호출부는 "검색 -> 생성 -> 폴백"의 전체 루프가 작동한다.

- 검색 정확도: 안정적
- 생성 품질: 프롬프트/timeout 영향 큼
- 실서비스 관건: 타임아웃 정책 + 폴백 관측성 + 직접 노출 정책 확정

이 문서를 기준으로 다음 단계(프론트 채팅 연결, 질문 반영, 정책 고도화)를 바로 진행할 수 있다.
