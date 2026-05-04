# RAG Vector Search Query Contract (v2)

## 1. 목적

- 공통 런타임 엔진(챕터1~4)에서 동일하게 쓰는 검색 규칙 고정
- `lucas_knowledge.embedding(vector(1536))` 코사인 검색 표준화
- 힌트 시스템에서 가장 중요한 **현재 노드 정합성**을 similarity보다 우선 보장

---

## 2. 파라미터 계약

- `queryVector`: `embed-query` 결과 벡터 문자열 (`"[...]"`)
- `chapterCode`: 예 `week01`
- `fromNodeCode`: 예 `CH1_TERMINAL_SSH_READY`
- `actionType`: 예 `command` (없으면 `NULL`)
- `searchTopK`: 검색 후보 수 (기본 `10`)
- `evidenceLimit`: LLM 전달 근거 수 (기본 `3`)
- `minSimilarity`: 기본 `0.70`

> 핵심: `searchTopK`와 `evidenceLimit`는 분리한다.

---

## 3. 검색 Phase 정의

- `strict`
  - `chapter_code + from_node_code + action_type`
- `fallback_action_removed`
  - `chapter_code + from_node_code` (`action_type` 제거)
- `fallback_chapter_only`
  - `chapter_code`만 유지

---

## 4. 1차(Strict) 검색 SQL

```sql
WITH q AS (
  SELECT CAST(:queryVector AS vector) AS v
),
scored AS (
  SELECT
    lk.id,
    lk.chapter,
    lk.puzzle_id,
    lk.content,
    lk.metadata,
    (lk.embedding <=> q.v) AS cosine_distance,
    (1 - (lk.embedding <=> q.v)) AS similarity,
    COALESCE((lk.metadata->>'priority')::int, 0) AS priority,
    COALESCE((lk.metadata->>'priority_rank')::int, 9999) AS priority_rank,
    COALESCE((lk.metadata->>'candidate_count')::int, 1) AS candidate_count
  FROM lucas_knowledge lk
  CROSS JOIN q
  WHERE lk.embedding IS NOT NULL
    AND lk.metadata->>'source' = 'story_transitions'
    AND lk.metadata->>'knowledge_kind' = 'next_node_answer'
    AND lk.metadata->>'chapter_code' = :chapterCode
    AND lk.metadata->>'from_node_code' = :fromNodeCode
    AND (
      :actionType IS NULL
      OR :actionType = ''
      OR lk.metadata->>'action_type' = :actionType
    )
)
SELECT *
FROM scored
ORDER BY
  cosine_distance ASC,
  priority_rank ASC,
  priority DESC,
  id ASC
LIMIT :searchTopK;
```

---

## 5. Fallback 실행 규칙

1. `strict` 결과의 최고 similarity가 `minSimilarity` 이상이면 `strict`만 사용
2. 아니면 `fallback_action_removed` 실행
3. 그래도 최고 similarity가 부족하면 `fallback_chapter_only` 실행

중요 규칙:

- 여러 phase 결과를 섞지 않는다
- **조건을 만족한 가장 좁은 phase 결과만 사용**

---

## 6. 최종 후보 선정 규칙 (Phase 내부)

선택된 단일 phase 내부에서:

1. `similarity >= minSimilarity` 후보 우선
2. `priority_rank ASC`
3. `cosine_distance ASC`
4. `priority DESC`
5. `id ASC`

그리고 `evidenceLimit`개만 LLM으로 전달

---

## 7. chapter_only 저신뢰 정책 (필수)

`fallback_chapter_only`는 노드 오염 가능성이 있으므로:

- 정답 명령어/정답 노드 직접 단정 금지
- 탐색 유도형 힌트만 허용
- 내부 `hint_level=low_confidence` 처리

---

## 8. 메타데이터 키 확정

최소 필수 키:

```json
{
  "source": "story_transitions",
  "knowledge_kind": "next_node_answer",
  "chapter_code": "week01",
  "from_node_code": "CH1_TERMINAL_SSH_READY",
  "action_type": "command",
  "priority": 10,
  "priority_rank": 1,
  "candidate_count": 3,
  "to_node_code": "CH1_CORE_CONNECTED",
  "transition_id": 123
}
```

---

## 9. 인덱스 권장안

벡터 인덱스(현재 `ivfflat` 유지 가능, 운영량 증가 시 `hnsw` 검토):

```sql
CREATE INDEX IF NOT EXISTS idx_lucas_knowledge_embedding_cosine
ON lucas_knowledge
USING ivfflat (embedding vector_cosine_ops)
WITH (lists = 100);
```

필터용 expression index 권장:

```sql
CREATE INDEX IF NOT EXISTS idx_lucas_knowledge_transition_filter
ON lucas_knowledge (
  (metadata->>'source'),
  (metadata->>'knowledge_kind'),
  (metadata->>'chapter_code'),
  (metadata->>'from_node_code'),
  (metadata->>'action_type')
);
```

---

## 10. 스프링 구현 체크리스트

1. `queryVector` 형식/차원(1536) 사전 검증
2. NaN/Infinity/빈 벡터 차단
3. Native Query 또는 `JdbcTemplate` 사용 (`<=>` 필요)
4. `actionType == ""`는 `NULL`로 동일 취급
5. phase를 enum으로 명시 관리
6. 테스트/실서비스 모두 동일 오케스트레이터 메서드 사용
7. 결과가 저신뢰이면 LLM 출력 강도 제한

---

## 11. 운영 기본값 (초기)

- `searchTopK = 10`
- `evidenceLimit = 3`
- `minSimilarity = 0.70`

> 고정값으로 확정하지 말고 운영 로그로 조정한다.

---

## 12. 관측 로그(필수)

- `session_id`
- `chapter_code`
- `from_node_code`
- `action_type`
- `phase`
- `knowledge_id`
- `transition_id`
- `similarity`
- `cosine_distance`
- `priority_rank`
- `priority`
- `candidate_count`
- `selected`
- `hint_level`
- `post_hint_success` (힌트 후 성공 여부)

