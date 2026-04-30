# RAG Embedding Seeding and Runtime Guide

## 1. 목적

이 문서는 다음 두 가지를 분리해서 정리한다.

1. 시딩 단계: 무엇을 임베딩해서 PG(`lucas_knowledge.embedding`)에 저장하는가
2. 런타임 단계: 힌트 요청 시 PG + Redis + ES를 어떻게 합쳐서 검색/생성하는가

핵심 결론:

- 미리 임베딩해 두는 대상은 **PG의 정적 지식 문서**다.
- Redis/ES는 **실시간 문맥 신호**이며, 힌트 요청 시 쿼리 텍스트에 합쳐서 임베딩한다.

## 2. 저장소별 역할

- PostgreSQL: 정답 규칙/전이 규칙/지식 원문(정적)
- Redis: 현재 세션 상태/최근 행동/현재 fail count(동적)
- Elasticsearch: 전체 유저 행동 패턴 통계(동적 집계)

## 3. 시딩에서 임베딩하는 대상

시딩 대상은 `lucas_knowledge`의 문서 행이다.

- `metadata.source = story_transitions`
- `metadata.knowledge_kind = next_node_answer`

즉, `story_transitions`에서 전이 정답을 뽑아 `lucas_knowledge`에 넣고, 그 `content`를 임베딩해 `embedding` 컬럼에 저장한다.

### 왜 이렇게 하는가

- 벡터 인덱스는 정적 지식 문서에 대해 미리 만들어야 빠르다.
- Redis/ES는 요청마다 값이 바뀌므로 시딩 대상이 아니라 쿼리 문맥으로 사용한다.

## 4. 쿼리 임베딩(런타임) 대상

유저가 힌트를 요청하면 아래를 한 텍스트로 합친다.

- Redis: 현재 노드, 최근 액션, fail count
- PG: 현재 노드의 기대 action/input 힌트
- ES: 노드 평균 실패횟수, top wrong input, 반복 오답 패턴 등

이 텍스트를 `/v1/hint/embed-query`로 임베딩한 뒤, PG의 문서 임베딩과 코사인 유사도 검색한다.

## 5. “문서와 질문 데이터 구조가 달라도 비교 가능한가?”

가능하다.  
같은 임베딩 모델 공간에 매핑하면, 형태가 달라도 의미적으로 가까운 벡터끼리 유사도가 높다.

- 문서 벡터: 정답 규칙 문장
- 질의 벡터: 현재 실패 문맥( Redis + PG + ES 요약)

둘을 같은 모델로 임베딩하면 코사인 유사도 비교가 성립한다.

## 6. 실행 순서(시딩)

1. 임베딩 서비스 실행
2. `seed_lucas_knowledge_from_transitions.sql` 실행(자동 가능)
3. 전이 정답 행 로드
4. 문서 임베딩 생성
5. `lucas_knowledge.embedding` 업데이트
6. 검증 쿼리로 null/건수 확인

## 7. 실제 실행 명령

```bash
cd ai/embedding-service
cp .env.example .env
# .env에서 GMS_KEY 입력
docker compose up --build -d
```

```bash
cd ai/embedding-service
python -m venv .venv
.venv\Scripts\activate
pip install -r requirements.txt
python scripts/seed_transition_embeddings.py
```

옵션:

- `--dry-run`: DB 업데이트 없이 점검
- `--skip-transition-sql`: SQL 재적재 생략
- `--output-dimensionality N`: 모델 출력 차원 요청

## 8. 차원(dimension) 주의

`lucas_knowledge.embedding`은 `vector(N)` 컬럼이다.  
모델 출력 차원과 N이 다르면 저장이 실패한다.

스크립트는 이 불일치를 감지하고 실패 처리한다.

필요 시 컬럼 조정:

```sql
ALTER TABLE lucas_knowledge
ALTER COLUMN embedding TYPE vector(실제차원);
```

## 9. 런타임 검색/생성 파이프라인

1. 힌트 요청 수신
2. Redis 문맥 조회
3. PG 규칙/지식 조회
4. ES 패턴 집계 조회
5. 통합 쿼리 텍스트 생성
6. 쿼리 임베딩 생성
7. PG 벡터 검색(챕터/노드 메타 필터 필수)
8. top-k 근거 문서 + Redis/ES 신호를 LLM 프롬프트로 전달
9. 힌트 생성(난이도/직접도 조절)

## 10. 메타 필터 권장

벡터 검색 전에 아래를 필터로 좁힌다.

- `chapter` 또는 `metadata.chapter_code`
- `puzzle_id` 또는 `metadata.from_node_code`
- 필요 시 `metadata.action_type`

필터 없이 전역 검색하면 다른 챕터 정답이 섞여 품질이 급락한다.

## 11. 멀티 엔딩(복수 정답 전이) 처리

한 노드에서 여러 정상 경로가 있으면, 전이별로 행을 여러 개 저장한다.

- 장점: 각 경로를 개별 근거로 회수 가능
- 메타: `candidate_count`, `is_multi_path`, `priority_rank`를 함께 저장해 후처리 가능

## 12. 최소 검증 체크리스트

- 임베딩 서비스 `/health` 정상
- `seed_transition_embeddings.py --dry-run` 정상
- `lucas_knowledge` 전이 정답 row count 확인
- `embedding is not null` row count 확인
- 샘플 노드 1개로 벡터 검색 top-k 수동 검증
