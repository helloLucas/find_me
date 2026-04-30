# Single AI Server RAG Runtime Architecture Guide

## 1. 현재 상태 요약

현재 런타임 힌트 경로는 **임베딩 서버를 호출하지 않습니다.**

- 백엔드 -> `ai/hint-orchestrator` 단일 AI 서버 호출
- 오케스트레이터가 직접
  1) query 임베딩 생성
  2) PGVector 검색
  3) LLM 힌트 생성

즉 운영 런타임 기준으로 AI 서버는 1개입니다.

---

## 2. 컴포넌트 역할

### PostgreSQL (pgvector)

- 테이블: `lucas_knowledge`
- 컬럼: `embedding vector(1536)`
- 역할: 정답 근거 벡터 저장/검색

### AI 서버 (`ai/hint-orchestrator`)

- `POST /v1/hints/retrieve`
  - query text 생성
  - 임베딩 호출
  - PGVector 검색
- `POST /v1/hints/generate`
  - evidence 기반 힌트 생성

### 백엔드 (`backend`)

- 사용자 런타임 컨텍스트(Progress/Redis) 수집
- 오케스트레이터 retrieve/generate 호출
- LLM 실패 시 폴백 힌트 템플릿 반환

### 임베딩 서버 (`ai/embedding-service`)

- 현재 런타임 호출 경로에서 제외
- 시딩/유지보수 용도로만 사용 가능

---

## 3. 런타임 요청 흐름

1. 클라이언트 -> `POST /api/v1/hints/live`
2. 백엔드가 현재 상태 수집
3. 백엔드 -> 오케스트레이터 `/v1/hints/retrieve`
4. 오케스트레이터가 임베딩 + PGVector 검색 수행
5. 백엔드 -> 오케스트레이터 `/v1/hints/generate`
6. 오케스트레이터 LLM 결과 반환
7. 실패 시 백엔드 폴백 템플릿 응답

---

## 4. 헷갈리기 쉬운 포인트

- `selectedPhase=fallback_action_removed`는 **검색 조건 완화** 의미
- `whyThisHint=llm_orchestrator_unavailable_fallback`는 **LLM 실패 폴백** 의미

둘은 완전히 다른 신호입니다.

---

## 5. 환경변수 (현재 중요값)

백엔드:

- `HINT_ORCHESTRATOR_SERVICE_URL`
- `HINT_ORCHESTRATOR_TIMEOUT_MS`
- `HINT_SEARCH_TOP_K`
- `HINT_EVIDENCE_LIMIT`
- `HINT_MIN_SIMILARITY`
- `HINT_RECENT_ACTION_LIMIT`

오케스트레이터:

- `GMS_KEY`
- `GMS_LLM_MODEL`
- `GMS_TIMEOUT_SECONDS`
- `GMS_MAX_OUTPUT_TOKENS`
- `GMS_EMBEDDING_MODEL`
- `PG_*`

---

## 6. 결론

- 운영 런타임은 **단일 AI 서버(오케스트레이터) 구조**로 정리됨
- 백엔드는 임베딩 서버를 직접 호출하지 않음
- 임베딩 서버는 런타임 필수 의존이 아님
