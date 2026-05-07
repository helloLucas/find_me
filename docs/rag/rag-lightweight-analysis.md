# 29. RAG 경량화 전/후 심층 분석 (적용본 전수조사)

작성일: 2026-05-06  
상태: 코드 기준 전수조사 완료 (최신 반영)

## 1) 문서 목적
최근 힌트 파이프라인 경량화 작업에서 **실제로 코드에 반영된 내용만** 기록한다.

제외 원칙:
- 구현하지 않은 아이디어/정책 제외
- 과거 논의만 있고 코드에 없는 내용 제외

## 2) 전수조사 대상 파일
- `ai/hint-orchestrator/app/prompt_builder.py`
- `ai/hint-orchestrator/app/vector_search.py`
- `ai/hint-orchestrator/app/main.py`
- `ai/hint-orchestrator/app/config.py`
- `ai/hint-orchestrator/app/schemas.py`
- `ai/hint-orchestrator/app/gms_client.py`
- `ai/hint-orchestrator/app/prompts/lucas_developer_prompt.txt`
- `backend/src/main/java/com/lucas/hint/service/HintRetrievalServiceImpl.java`
- `backend/src/main/java/com/lucas/hint/service/HintOrchestrationServiceImpl.java`
- `backend/src/main/java/com/lucas/hint/service/HintLlmOrchestratorClient.java`
- `backend/src/main/java/com/lucas/hint/dto/response/HintLiveResponseDto.java`
- `frontend/src/shared/api/hintApi.ts`

## 3) 단계별 적용 내역 (채팅 요청 -> 힌트 응답)

### 3.1 Retrieval 입력 상한 축소
적용 완료.
- `searchTopK` 최대 5
- `evidenceLimit` 최대 2
- `recentActionLimit` 최대 3

근거:
- backend `HintRetrievalServiceImpl`
- orchestrator `main.py` (`search_top_k`, `evidence_limit` 재상한)

### 3.2 최근 이력 전달 방식
적용 완료.
- 최근 이벤트 원천: Redis recent events
- retrieve 요청에는 `recent_actions` 전달
- generate 프롬프트에는 `recent_commands`로 command 타입 최대 3줄만 전달

### 3.3 Vector 검색 정렬/후보 처리
적용 완료.
- `story_transitions` LEFT JOIN 메타 보강
  - `transition_expected_input`
  - `transition_action_type`
  - `transition_validator_config`
- metadata backfill
  - `expected_input`, `action_type`, `validator_config`, `transition_id`
- `priority_rank` soft penalty
  - rank1 +0.000 / rank2 +0.015 / rank3 +0.030 / 기타 +0.050
- dedupe
  - key: `(action_type, expected_input)`
  - `expected_input` 비어있으면 `content` 사용

### 3.4 Generate payload 경량화
적용 완료.

최종 상위 payload:
- `policy`
- `runtime`
- `user_message`
- `query_context_excerpt`
- `evidences`
- `es_signal` (null 아닐 때만)

축소점:
- runtime에서 `session_id`, `user_id` 제거
- `query_text` 전체 제거, excerpt만 전달
- `es_signal: null` 필드 생략

### 3.5 Evidence compact 구조
적용 완료.

LLM 전달 evidence:
- `action_type`
- `similarity`
- `priority_rank`
- `content`
- `metadata.expected_input`
- `metadata.priority_rank`

제거된 직접 전달 필드:
- `knowledge_id`
- `transition_id`
- `metadata.chapter_code`
- `metadata.from_node_code`
- `metadata.candidate_count`
- `metadata.validator_config`

## 4) expected_input 변환 로직 (실적용 기준)

### 4.1 입력 소스
`_resolve_expected_input_value` 입력:
- `metadata.expected_input`
- `metadata.validator_config`
- `hint_level`
- `action_type`

### 4.2 validator_config 파싱
`_as_dict` 동작:
- dict면 그대로 사용
- 문자열 JSON이면 1차 `json.loads`
- 1차 결과가 문자열 JSON이면 2차 `json.loads`
- 실패 시 `{}` 반환

### 4.3 exact 변환(rule 기반)
현재 코드 기준 **rule 기반 변환 유지**.

`_resolve_expected_input_exact` rule:
- `NORMALIZED_COMMAND`
- `VIRTUAL_FS_COMMAND`
- `FIND_TMP_COMMAND`
- `PARSED_TAR_COMMAND`
- `NC_SEND_FILE`
- `CHAINED_COMMAND`
- `AUTO_SYSTEM`

### 4.4 hint_level별 노출 강도
`_adapt_expected_input_by_hint_level`:
- `STRONG`: exact 우선
- `MEDIUM`: 패턴형 일반화
- `LIGHT/LOW_CONFIDENCE`: 라벨/추상화

### 4.5 content 동기화
`_rewrite_content_expected_input`:
- `content` 내 `expected_input=...`를 최종 값으로 교체
- metadata/content 불일치 감소

## 5) 응답 스키마 단순화 (최신 반영)

### 5.1 제거 완료 항목
이번 반영에서 아래 필드는 **파이프라인 전체에서 삭제 완료**:
- `why_this_hint`
- `next_action_check`
- `used_transition_ids`

삭제 반영 위치:
- orchestrator `schemas.py`
- orchestrator `main.py` (파싱/derive/fallback)
- backend `HintLlmOrchestratorClient`
- backend `HintOrchestrationServiceImpl`
- backend `HintLiveResponseDto`
- frontend `hintApi.ts`

### 5.2 generate 출력 계약
현재 generate 출력 강제 키:
- `hint_text`
- `hint_level`

## 6) 모델 분기/호출 설정

### 6.1 LIGHT 전용 모델 분기
적용 완료.
- LIGHT: `GMS_LIGHT_LLM_MODEL`
- MEDIUM/STRONG: `GMS_LLM_MODEL`

### 6.2 GPT-5 계열 옵션
적용 완료.
- GPT-5 계열: `reasoning_effort`
- 비 GPT-5: `temperature`

## 7) 최종 전달 payload (현재 코드 기준)

```json
{
  "policy": {
    "hint_level": "LIGHT|MEDIUM|STRONG|LOW_CONFIDENCE",
    "instruction_tone": "...",
    "phase": "strict|fallback_action_removed|fallback_chapter_only",
    "low_confidence": false
  },
  "runtime": {
    "chapter_code": "week02",
    "from_node_code": "CH2_LAPLACE_MISSION_READY",
    "action_type": "command",
    "fail_count_after_action": 0
  },
  "user_message": "...",
  "query_context_excerpt": "current_input: ...\nexpected_action_type: ...\nrecent_commands:\n1) ...\n2) ...\n3) ...",
  "evidences": [
    {
      "action_type": "command",
      "similarity": 0.80,
      "priority_rank": 1,
      "content": "chapter_code=...; expected_input=...",
      "metadata": {
        "expected_input": "...",
        "priority_rank": 1
      }
    }
  ]
}
```

주의:
- `es_signal`은 null이면 필드 자체 생략

## 8) 성능/품질 관측 정리

### 8.1 경량화로 줄어든 것
- 입력 필드 수
- evidence 메타 크기
- recent history 길이
- 응답 스키마 복잡도

### 8.2 지연이 늘 수 있는 이유
- completion 길이 증가
- reasoning token 증가
- 모델 큐잉/부하 편차

즉 입력 토큰 감소와 latency 감소는 1:1로 고정되지 않음.

## 9) 최신 결론
- 적용본 기준 문서로 정리 완료
- 불필요 응답 필드(`why_this_hint`, `next_action_check`, `used_transition_ids`) 삭제 반영 완료
- rule 기반 expected_input 복원 로직은 유지
