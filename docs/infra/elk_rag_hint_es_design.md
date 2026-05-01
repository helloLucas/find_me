# Lucas 온디맨드 힌트용 ES 최종 설계

## 1. 현재 결론

지금 단계의 루카스 힌트 시스템은 **바이너리 판정(`SUCCESS / FAIL`) 기준**으로 간다.

즉:

- 백엔드는 유저 행동이 맞았는지 틀렸는지만 판정한다.
- Elasticsearch는 "왜 틀렸는지"를 저장하지 않는다.
- Elasticsearch는 **어디서 많이 막히는지**, **어떤 입력/클릭/관찰이 반복되는지**를 보는 용도로 쓴다.

이 문서는 현재 단계에서 실제로 필요한 개념만 남긴 최종 정리본이다.

## 2. 각 저장소 역할

### Redis

- 현재 세션 상태
- 최근 행동 흐름
- 최근 명령어
- 현재 fail count

### PostgreSQL

- 현재 노드의 정답 규칙
- 스토리 전이 정보
- `lucas_knowledge` 같은 지식 원본

### Elasticsearch

- 유저 행동 raw log 저장
- 행동 패턴 집계
- 온디맨드 힌트용 보조 신호 제공

핵심:

- Redis/PG = 현재 유저 기준 문맥
- ES = 전체 유저 기준 막힘 패턴

## 3. ES를 왜 쓰는가

현재 단계에서 ES는 아래 4가지만 잘하면 된다.

1. **노드별 실패율 확인**
- 어떤 노드가 유난히 어려운지 보기

2. **행동 타입별 top 실패 입력 확인**
- `command`: 많이 틀린 명령어
- `inspect`: 많이 잘못 본 대상
- `click`: 많이 잘못 누른 대상

3. **같은 세션의 반복 오답 확인**
- 한 유저가 같은 입력이나 같은 클릭을 반복하는지 보기

4. **성공 유저와 실패 유저의 행동 차이 확인**
- 성공 유저가 보통 먼저 하는 행동
- 실패 유저가 자주 빠지는 루프

즉 ES는 정답 저장소가 아니라,
**행동 로그 기반 집계 도구**다.

## 4. 현재 단계에서 버린 개념

이번 최종 설계에서는 아래 개념을 기본 전제로 쓰지 않는다.

- `failure_reason`
- `validator_type`
- `dominant_misconception`
- `missing_prerequisite_pattern`
- 복잡한 원인 해석용 enum 체계

이유:

- 현재 백엔드는 `맞음 / 틀림`만 판정한다.
- 따라서 지금은 원인 분석보다 **행동 패턴 분석**이 우선이다.

나중에 validator가 richer해지면 다시 확장할 수 있다.

## 5. 전체 흐름

### 5.1 액션 처리

```text
프론트 action 요청
-> 백엔드 success / fail 판정
-> Redis / PostgreSQL 갱신
-> 구조화 JSON 로그를 stdout으로 출력
-> Filebeat -> Logstash -> Elasticsearch(game-logs-*) 적재
```

### 5.2 힌트 요청

```text
유저 힌트 요청
-> Redis에서 현재 상태 / 최근 행동 조회
-> PostgreSQL에서 정답 규칙 / 지식 조회
-> Elasticsearch에서 행동 패턴 조회
-> 백엔드가 결과를 짧은 signal로 정리
-> LLM에 전달
-> 최종 힌트 생성
```

## 6. ES에 저장할 것

현재 단계에서는 **raw action log**만 확실하게 저장하면 된다.

행동 1건당 JSON 문서 1개:

```json
{
  "timestamp": "2026-04-28T10:03:12Z",
  "session_id": "sess_001",
  "user_id": 7721,
  "chapter_id": "CH1",
  "from_node_id": "CH1_TERMINAL_SSH_READY",
  "to_node_id": "CH1_FAIL",
  "action_type": "command",
  "input_value": "ssh 172.22.4.19",
  "input_value_norm": "ssh 172.22.4.19",
  "result": "FAIL",
  "fail_count_after_action": 3,
  "hint_requested": false,
  "state_version": 18
}
```

## 7. 필드 설계 핵심

### `keyword`

- 값 전체를 하나로 저장
- exact match, filter, group by, top N 집계용

예:

- `session_id`
- `action_type`
- `result`
- `from_node_id`
- `input_value.keyword`
- `input_value_norm`

### `text`

- 검색 가능하게 단어 단위로 인덱싱
- lexical search / BM25 / RAG 보조 검색용

예:

- `input_value`

### 현재 단계 권장

- `input_value`: `text + keyword`
- `input_value_norm`: `keyword`

즉:

- 집계는 `input_value.keyword` 또는 `input_value_norm`
- 검색은 `input_value`

## 8. 현재 단계의 ES 활용 예시

### 8.1 노드별 top wrong input

- `from_node_id = CH1_TERMINAL_SSH_READY`
- `action_type = command`
- `result = FAIL`

이 조건으로 `input_value_norm` top N 집계

### 8.2 같은 세션 반복 오답

- `session_id = sess_001`
- `from_node_id = CH1_TERMINAL_SSH_READY`
- `result = FAIL`

이 조건으로 반복된 입력 top N 집계

### 8.3 click / inspect 반복 루프

- `action_type = click` 또는 `inspect`
- 실패 문서만 필터
- `input_value_norm` top N 집계

### 8.4 노드 난이도

- 노드별 실패 문서 수
- 세션당 평균 실패 횟수
- 힌트 요청률

이걸 기반으로 "이 노드가 원래 어려운 편인가"를 본다.

## 9. 현재 단계에서 summary 인덱스는 선택

지금 당장은 `game-logs-*` raw log만으로도 시작 가능하다.

하지만 나중에 성능이나 RAG 품질 때문에 필요해지면:

- `hint-signals-*`

같은 summary 인덱스를 추가할 수 있다.

현재 결론:

- **지금은 raw log 중심**
- summary index는 **후순위**

## 10. 백엔드에서 해야 할 일

핵심은 하나다.

**정답 판정 사이클 끝에 구조화 로그 1건을 남기는 것**

즉 백엔드는:

1. action 요청 받기
2. success / fail 판정
3. Redis / PG 갱신
4. 아래 필드로 JSON 로그 출력

- `timestamp`
- `session_id`
- `user_id`
- `chapter_id`
- `from_node_id`
- `to_node_id`
- `action_type`
- `input_value`
- `input_value_norm`
- `result`
- `fail_count_after_action`
- `hint_requested`
- `state_version`

## 11. Elasticsearch 템플릿

현재 단계에서 필요한 ES 템플릿은 `game-logs-*`용 1개면 충분하다.

파일:

- [es-game-logs-template.json](/home/ubuntu/lucas-elk/es-game-logs-template.json)

이 템플릿은 다음을 고정한다.

- `game-logs-*` 인덱스 패턴
- `number_of_shards = 1`
- `number_of_replicas = 0`
- 주요 필드 타입
- `input_value`의 `text + keyword` 구조
- `fail_count_after_action`의 `integer` 타입

## 12. 적용 순서

1. 백엔드에서 구조화 JSON 로그 출력 추가
2. ES에 `game-logs-*` 템플릿 적용
3. Filebeat / Logstash 경유로 로그 적재
4. Kibana / ES query로 집계 확인

## 13. 최종 한 줄

**지금 단계의 루카스 ES 설계는 "실패 원인 추론"이 아니라, `SUCCESS / FAIL` 기반 행동 로그를 쌓고 그 위에서 반복 오답, top 실패 입력, 노드 난이도를 집계하는 구조다.**
