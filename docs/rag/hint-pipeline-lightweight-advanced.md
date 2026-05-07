# 34. Hint 파이프라인 경량화 + 고도화 최종 통합 문서 (코드 기준 전수)

작성일: 2026-05-07  
상태: 코드 기준 최종 통합 정리

## 1) 문서 목적
이 문서는 최근 진행된 힌트 파이프라인 변경사항을 “현재 코드에 실제 반영된 상태” 기준으로 한 번에 정리한다.
정리 대상은 다음 2축이다.
- 경량화: payload/스키마/후보 전달량/모델 비용 제어
- 고도화: repeat 임베딩 기반 스트레스 레벨링, trap 억제, expected_input 치환 고도화, UI 간섭 효과, 운영 파라미터화

본 문서는 과거 논의안이 아니라 현재 브랜치 코드 동작을 기준으로 한다.

## 2) 전수조사 범위
- AI 오케스트레이터
  - `ai/hint-orchestrator/app/main.py`
  - `ai/hint-orchestrator/app/prompt_builder.py`
  - `ai/hint-orchestrator/app/vector_search.py`
  - `ai/hint-orchestrator/app/hint_state.py`
  - `ai/hint-orchestrator/app/retrieval_formatter.py`
  - `ai/hint-orchestrator/app/schemas.py`
  - `ai/hint-orchestrator/app/gms_client.py`
  - `ai/hint-orchestrator/app/config.py`
  - `ai/hint-orchestrator/app/prompts/lucas_developer_prompt.txt`
- Backend
  - `backend/src/main/java/com/lucas/hint/service/HintRetrievalServiceImpl.java`
  - `backend/src/main/java/com/lucas/hint/service/HintRetrieveOrchestratorClient.java`
  - `backend/src/main/java/com/lucas/hint/service/HintLlmOrchestratorClient.java`
  - `backend/src/main/java/com/lucas/hint/service/HintOrchestrationServiceImpl.java`
  - `backend/src/main/java/com/lucas/hint/dto/response/HintLiveRetrieveResponseDto.java`
  - `backend/src/main/java/com/lucas/hint/dto/response/HintLiveResponseDto.java`
  - `backend/src/main/java/com/lucas/story/service/redis/StorySessionRedisService.java`
  - `backend/src/main/java/com/lucas/story/service/logging/StoryActionLogService.java`
  - `backend/src/main/resources/application.yml`
- Frontend
  - `frontend/src/shared/config/env.ts`
  - `frontend/src/shared/api/axiosInstance.ts`
  - `frontend/src/shared/api/hintApi.ts`
  - `frontend/src/features/Auth/useInitGuest.ts`
  - `frontend/src/features/Lucas/Lucas.tsx`
  - `frontend/src/features/Lucas/Lucas.css`
  - `frontend/vite.config.ts`

## 3) 엔드투엔드 파이프라인 (현재 동작)
### 3.1 프론트 요청
`Lucas.tsx`에서 `hintApi.getLiveHint({ userMessage })` 호출.

### 3.2 백엔드 retrieve 입력 조립
`HintRetrievalServiceImpl`에서 아래 값을 만든다.
- 세션: `resolveSessionId(requestedSessionId 없으면 sess_user_{userId})`
- 현재 스코프: `chapterCode`, `fromNodeCode`
- `recent_events` Redis 조회 후 `recent_actions`로 변환
  - action_type, input_value_norm, result, from_node_id
- fail_count: 세션 fail_count Redis에서 조회
- current_input/action_type: 최근 이벤트 최신값
- expected_action_type: 현재 노드 전이 중 “첫 non-fail 전이”의 action_type

### 3.3 오케스트레이터 retrieve
`/v1/hints/retrieve`에서
- router 분류(`hint_question|lore_question|other`) 수행
- `other/lore`는 `BLOCKED_NON_HINT`로 즉시 종료
  - 이 경우 repeat/stress/evidence 탐색 없이 low-confidence 응답
- hint_question이면
  1) query_text 렌더
  2) query 임베딩 생성
  3) repeat 비교용 텍스트 별도 구성 후 임베딩 비교
  4) vector 검색 및 evidence 선택
  5) repeat/fail 가중합으로 stress_score 및 retrieval hint_level 계산

### 3.4 오케스트레이터 generate
`/v1/hints/generate`에서
- retrieve에서 받은 fail/repeat 기반으로 hint_level 재계산
- compact payload 구성 후 LLM 호출
- LIGHT면 `GMS_LIGHT_LLM_MODEL`, MEDIUM/STRONG면 `GMS_LLM_MODEL`

### 3.5 백엔드 최종 응답
`HintOrchestrationServiceImpl`에서
- routeDecision이 `BLOCKED_NON_HINT`면 고정 메시지 풀에서 랜덤 1개
- 일반 경로면 LLM 결과 sanitize 후 반환
- 프론트는 hint_text 표시, 특정 조건에서 interference FX 실행

## 4) 경량화 반영 사항
### 4.1 Retrieve 상한
- backend 상한
  - searchTopK max 5
  - evidenceLimit max 2
  - recentActionLimit max 3

### 4.2 Generate payload compact
상위 payload:
- policy
- runtime
- user_message
- query_context_excerpt
- evidences
- es_signal(null 아님일 때만)

runtime에는 session_id/user_id를 넣지 않는다.
query_text 전체 대신 excerpt만 넣는다.

### 4.3 Evidence compact
LLM 전달 evidence는 최소 필드만 유지:
- action_type
- similarity
- priority_rank
- content
- metadata.expected_input
- metadata.priority_rank

### 4.4 응답 스키마 단순화
- orchestrator `HintGenerateResponse`: `hint_text`, `hint_level`, `model`
- 과거 `why_this_hint`는 현재 스키마에서 제거됨

## 5) 고도화 반영 사항
### 5.1 fail+repeat 기반 스트레스 레벨
공식:
- `stress = fail_count * HINT_STRESS_FAIL_WEIGHT + repeat_count * HINT_STRESS_REPEAT_WEIGHT`
- threshold
  - MEDIUM: `HINT_LEVEL_MEDIUM_STRESS_THRESHOLD`
  - STRONG: `HINT_LEVEL_STRONG_STRESS_THRESHOLD`
- low_confidence이면 항상 LOW_CONFIDENCE

### 5.2 repeat 비교(임베딩 + Redis)
핵심 파일: `hint_state.py`, `main.py`
- 키 구조
  - `lucas:hint:qembed:{session}:{chapter}:{node}`
  - `lucas:hint:qrepeat:{session}:{chapter}:{node}`
  - `lucas:hint:last-node:{session}:{chapter}`
- 비교 방식
  - 직전 벡터 1개와 현재 벡터 코사인 비교
  - 유사도 >= `HINT_REPEAT_SIMILARITY_THRESHOLD`면 `+1`
  - 미만이면 0으로 리셋
- 노드 전환 정리
  - `last-node`와 현재 node가 다르면 이전 node scope 키 삭제

### 5.3 repeat 입력 텍스트 전처리/스코프
- 기본: user_message 중심
- current_input은 “현재 from_node의 recent_actions에 동일 input이 있을 때만” 합성
- 전처리:
  - lower/trim/공백 정리
  - 반복문자 과다 축약(3회 이상을 2회)
  - 특수문자 제거
  - 감탄사/완곡어 필러 토큰 제거
- 너무 짧은 텍스트(공백 제거 길이 <=3)는 업데이트 스킵
  - 스킵 시 기존 repeat_count 유지 조회

### 5.4 repeat TTL/슬라이딩 TTL
- ENV
  - `HINT_REPEAT_TTL_SECONDS`
  - `HINT_REPEAT_SLIDING_TTL`
- sliding=true
  - 매 업데이트마다 `setex`로 TTL 재설정(연장)
- sliding=false
  - 기존 TTL이 남아있으면 값만 갱신, TTL 없을 때만 expire

### 5.5 trap 억제(1회 경험 후)
`vector_search.py`
- recent_actions에서 현재 from_node scope 내 `result`에 `FAIL_PROTECTED_CORE`가 있으면 trap_hit
- trap_hit 시 trap candidate 제거 시도
  - expected/content에 protected_core 포함
  - branch_type startswith trap
  - to_node_code에 `_FAIL_`
- non-trap 후보가 있으면 그쪽으로 대체

### 5.6 expected_input 치환 고도화
`prompt_builder.py` `_resolve_expected_input_exact`
- rule 기반 유지
  - NORMALIZED_COMMAND
  - VIRTUAL_FS_COMMAND
  - FIND_TMP_COMMAND
  - PARSED_TAR_COMMAND
  - NC_SEND_FILE
  - CHAINED_COMMAND
  - AUTO_SYSTEM
- PARSED_TAR_COMMAND 개선
  - requiredFiles, detectedFiles, protectedFileIncluded, forbiddenFiles 반영
  - protected 포함 케이스면 detectedFiles까지 병합
  - 아니면 forbidden 제외
- 최종 선택 값으로 content의 `expected_input=...` 동기화

## 6) 후보 정렬/선택 상세
### 6.1 DB 검색 정렬
`vector_search.py` SQL:
- 1차 `cosine_distance ASC`
- 2차 `priority_rank ASC`
- 3차 `priority DESC`
- 4차 `id ASC`

즉 rank는 여전히 DB 결과 컷오프에 영향을 준다.

### 6.2 메타 보강
`story_transitions` LEFT JOIN 후
- transition_id/expected_input/action_type/validator_config를 metadata에 주입
- 현재는 “누락 시만 보강”이 아니라 transition 값이 있으면 덮어씀

### 6.3 select 단계 정렬/중복제거
select 단계 정렬키:
- cosine_distance ASC
- priority DESC
- id ASC

dedupe key:
- `(action_type, expected_input(or content), transition_id)`

### 6.4 hint_level별 evidence 개수
- LOW_CONFIDENCE/LIGHT: 1개
- MEDIUM: 최대 2개
- STRONG: evidence_limit까지

## 7) router/blocked 경로
- router 모델로 message_type 분류
- hint_question 이외는 `BLOCKED_NON_HINT`
- backend는 blocked 메시지 풀에서 랜덤 반환
- frontend는 `routeDecision===BLOCKED_NON_HINT && lowConfidence`이면 간섭 효과 트리거

## 8) 프론트 고도화
### 8.1 Lucas 간섭 효과 + 킬스위치
- `ENABLE_INTERFERENCE_FX` 상수로 on/off 가능
- 트리거 조건
  - blocked+lowConfidence
  - 특정 시스템 간섭 텍스트 패턴
- 효과 범위
  - Lucas 패널 로컬 효과
  - `body.global-interference-fx` 전체화면 효과

## 9) Redis에 저장되는 핵심 상태 정리
### 9.1 힌트 repeat 관련(오케스트레이터)
- `lucas:hint:qembed:*`
- `lucas:hint:qrepeat:*`
- `lucas:hint:last-node:*`

### 9.2 세션 액션/실패 카운트(백엔드)
- `play:session:{sessionId}:recent_events`
- `play:session:{sessionId}:fail_count`

fail_count TTL은 백엔드 `StoryActionLogService`에서 10분으로 관리.
- fail 시 increment + expire(10분)
- success 시 resetOnSuccess=true면 delete

## 10) ENV 최종 체크포인트
### 10.1 AI 오케스트레이터 주요 ENV
- `HINT_STRESS_FAIL_WEIGHT`
- `HINT_STRESS_REPEAT_WEIGHT`
- `HINT_LEVEL_MEDIUM_STRESS_THRESHOLD`
- `HINT_LEVEL_STRONG_STRESS_THRESHOLD`
- `HINT_REPEAT_SIMILARITY_THRESHOLD`
- `HINT_REPEAT_TTL_SECONDS`
- `HINT_REPEAT_SLIDING_TTL`

### 10.2 Backend 주요 ENV
- `HINT_ORCHESTRATOR_SERVICE_URL`
- `HINT_ORCHESTRATOR_TIMEOUT_MS`
- `HINT_SEARCH_TOP_K`
- `HINT_EVIDENCE_LIMIT`
- `HINT_MIN_SIMILARITY`
- `HINT_RECENT_ACTION_LIMIT`
- `HINT_ES_*`

`application.yml`의 hint 블록은 기본값 없이 ENV 참조 형태로 연결됨.

## 11) 현재 동작상 중요한 해석 포인트
1. repeat TTL은 “모든 힌트 키”가 아니라 오케스트레이터 repeat 키(qembed/qrepeat/last-node)에 적용된다.
2. sliding TTL=true이면 요청이 계속 올 때 만료가 뒤로 밀린다.
3. candidate top1이 기대와 다를 때는 prompt 문제가 아니라, retrieve 단계 정렬/컷오프(SQL order + search_top_k) 영향이 먼저다.
4. trap 억제는 “trap 실패 신호가 recent_actions에 찍힌 이후”부터 동작한다.
5. expected_input key 토큰(`tar_bundle`류) 문제는 validator_config 기반 exact 복원 경로를 통해 해소해야 하며, rule-매핑 정확도가 핵심이다.

## 12) 운영 점검 체크리스트
- [ ] backend `HINT_SEARCH_TOP_K/HINT_EVIDENCE_LIMIT`가 실험 의도와 일치하는지
- [ ] orchestrator `RETRIEVE_DEFAULT_*`와 backend 요청값 충돌 여부
- [ ] `HINT_REPEAT_SIMILARITY_THRESHOLD` 실험값(현재 0.62) 적정성
- [ ] `HINT_REPEAT_TTL_SECONDS`, `HINT_REPEAT_SLIDING_TTL` 정책 합의
- [ ] current_input 스코프 검증(다른 노드 입력 혼입 방지)
- [ ] trap 실패 이벤트가 recent_actions에 실제 기록되는지
- [ ] vector 후보 확인 시 SQL 정렬/priority_rank 영향 동시 확인

## 13) 결론
현재 파이프라인은 “경량화 + 고도화”가 모두 반영된 상태다.
- 경량화는 payload/스키마/모델 분기/입력 축소 중심으로 적용됨
- 고도화는 repeat 임베딩/스트레스 레벨/TTL 제어/trap 억제/치환 고도화까지 반영됨

다만 품질 체감은 최종적으로 아래 3개에 가장 민감하다.
- repeat threshold + 전처리
- vector 정렬/컷오프(search_top_k, priority_rank 영향)
- validator_config 해석 정확도(expected_input 복원 품질)

이 세 축을 실험 시나리오 기반으로 튜닝하면, 힌트 일관성과 단계별 유도 품질이 안정된다.
