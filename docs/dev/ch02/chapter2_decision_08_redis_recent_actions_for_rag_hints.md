# Chapter 2 결정 문서 08: Redis 기반 최근 행동 로그 및 RAG 힌트 컨텍스트 관리 정책

## 1. 결정 요약

Chapter 2의 행동 로그 저장 목적은 장기 분석이 아니라, **현재 사용자의 최근 행동과 현재 노드 위치를 바탕으로 RAG 기반 힌트를 제공하는 것**이다.

따라서 MVP 기준으로 `story_action_logs` RDB 테이블은 추가하지 않는다.

최근 행동 로그와 힌트 생성용 실시간 맥락은 Redis에서 전담 관리한다.

```text
RDB story_action_logs
→ MVP에서 추가하지 않음

Redis recent actions
→ 최근 행동 로그 관리

Redis current context
→ 현재 노드, cwd, scanPercent, 최근 실패 결과 관리

RAG 저장소
→ lucas_knowledge / pgvector 기반 정답·힌트 지식 관리
```

최종 정책은 다음과 같다.

```text
- 모든 터미널 입력을 RDB에 저장하지 않는다.
- 최근 행동 로그는 Redis bounded queue/list/stream으로 관리한다.
- Redis 로그는 일정 개수만 유지한다.
- 힌트 요청 시 Redis의 최근 행동 + 현재 노드 위치 + RAG 지식을 조합한다.
- RDB는 게임 진행의 영속 원본 상태만 담당한다.
- 장기 분석 요구가 생기면 그때 RDB action log 또는 별도 로그 파이프라인을 검토한다.
```

---

## 2. 결정 배경

초기 논의에서는 `story_action_logs` 테이블을 RDB에 추가하고 의미 있는 이벤트를 저장하는 방안을 검토했다.

하지만 현재 목표는 다음과 같다.

```text
- 유저의 장기 행동 분석이 목적이 아님
- 운영 통계 집계가 1차 목적이 아님
- 현재 유저가 지금 어디서 막혔는지 파악하는 것이 목적
- 최근 입력과 현재 노드 위치를 기반으로 루카스가 적절한 힌트를 제공하는 것이 목적
```

따라서 매 터미널 입력 또는 의미 있는 이벤트를 RDB에 영속 저장하는 방식은 현재 목표 대비 과하다.

Chapter 2에서는 사용자가 `pwd`, `ls`, `cd`, `cat`, 오타, 순서 오류 등을 자주 입력할 수 있다.

이 입력들을 RDB에 계속 INSERT하면 다음 문제가 생길 수 있다.

```text
- 터미널 입력 빈도에 비해 저장 가치가 낮은 row가 많아짐
- RDB가 힌트용 실시간 로그 저장소처럼 사용됨
- 장기 분석 목적이 없는데 영속 로그가 누적됨
- 향후 보관/삭제 정책이 불필요하게 필요해짐
```

따라서 실시간 힌트 목적에는 Redis가 더 적합하다.

---

## 3. 역할 분리

## 3-1. Redis의 역할

Redis는 힌트 제공에 필요한 실시간 맥락을 담당한다.

```text
- 현재 사용자의 최근 행동 로그
- 최근 실패 패턴
- 현재 nodeCode
- 현재 cwd
- 현재 scanPercent
- 현재 snapshotVersion
- active tab lock
- 힌트 생성용 임시 context
```

Redis 데이터는 영구 보존을 전제로 하지 않는다.

```text
Redis = 실시간 맥락 / 최근 상태 / 제한된 로그
```

---

## 3-2. RDB의 역할

RDB는 게임 진행의 영속 원본 상태를 담당한다.

```text
- users
- chapters
- user_chapter_progress
- user_story_progress
- latest_node_id
- latest_checkpoint_node_id
- latest_snapshot_json
- save_slots
- story_nodes
- story_transitions
- lucas_knowledge
```

즉, 사용자가 재접속하거나 저장된 진행 상태를 복구할 때 기준이 되는 데이터는 RDB에 둔다.

```text
RDB = 영속 상태 / 복구 기준 / 스토리 원본 / RAG 지식 저장소
```

---

## 3-3. RAG 저장소의 역할

힌트 생성을 위한 정답·설명·세계관 지식은 `lucas_knowledge`에 저장한다.

```text
lucas_knowledge
- chapter
- puzzle_id
- content
- metadata
- embedding
```

힌트 요청 시 현재 유저의 Redis 맥락을 기반으로 관련 지식을 검색한다.

```text
Redis 최근 행동 + 현재 nodeCode
↓
lucas_knowledge 검색
↓
LLM/RAG 힌트 생성
```

---

## 4. 최종 구조

```text
사용자 command 입력
↓
StoryTransitionService / TerminalCommandService 처리
↓
진행 상태 변경이 있으면 RDB user_story_progress 갱신
↓
최근 행동은 Redis recent-actions에 저장
↓
힌트 요청 시 Redis recent-actions + Redis context 조회
↓
lucas_knowledge 검색
↓
루카스 힌트 생성
```

---

## 5. Redis 데이터 설계

## 5-1. 현재 힌트 컨텍스트

현재 유저의 챕터별 실시간 상태 요약을 Redis Hash로 관리한다.

```text
key: story:context:{userId}:{chapterCode}
type: hash
```

예시 key:

```text
story:context:42:week02
```

예시 value:

```json
{
  "nodeCode": "CH2_TMP_SEARCH_RESULT",
  "cwd": "/home/guest",
  "snapshotVersion": "8",
  "scanPercent": "42",
  "lastResult": "FAIL_WRONG_ORDER",
  "updatedAt": "2026-04-28T12:00:00+09:00"
}
```

### 저장 필드

| 필드 | 의미 |
| --- | --- |
| `nodeCode` | 현재 노드 코드 |
| `cwd` | 현재 가상 디렉토리 |
| `snapshotVersion` | 현재 snapshot 버전 |
| `scanPercent` | 현재 GC 스캔율 |
| `lastResult` | 마지막 command 처리 결과 |
| `updatedAt` | 갱신 시각 |

---

## 5-2. 최근 행동 로그

최근 행동 로그는 Redis List 또는 Stream으로 관리한다.

목표는 전체 로그 보관이 아니라, 힌트 생성에 필요한 최근 N개 행동만 유지하는 것이다.

```text
key: story:recent-actions:{userId}:{chapterCode}
type: list 또는 stream
max length: 20~50개
```

예시 key:

```text
story:recent-actions:42:week02
```

### List 방식

```text
LPUSH story:recent-actions:{userId}:{chapterCode} "{...}"
LTRIM story:recent-actions:{userId}:{chapterCode} 0 49
```

### Stream 방식

```text
XADD story:recent-actions:{userId}:{chapterCode} MAXLEN ~ 50 * ...
```

MVP에서는 List 방식이 단순하다.

Stream은 이후 소비자 그룹, 비동기 분석, 별도 파이프라인이 필요해질 때 검토한다.

---

## 6. 최근 행동 로그 저장 예시

## 6-1. 순서 오류

```json
{
  "nodeCode": "CH2_TMP_SEARCH_RESULT",
  "input": "nc -w 3 127.0.0.1 8080 < decoy.tar",
  "result": "FAIL_WRONG_ORDER",
  "cwd": "/home/guest",
  "snapshotVersion": 8,
  "at": "2026-04-28T12:00:00+09:00"
}
```

## 6-2. 정상 스토리 진행

```json
{
  "nodeCode": "CH2_TMP_SEARCH_RESULT",
  "input": "tar -cvf decoy.tar ./sys/temp/Memory_Dump_082.tmp ./cache/User_Behavior_88.tmp ./tmp/System_Temp_File.tmp",
  "result": "SUCCESS_MOVE",
  "toNodeCode": "CH2_DECOY_CREATED",
  "cwd": "/home/guest",
  "snapshotVersion": 9,
  "at": "2026-04-28T12:01:00+09:00"
}
```

## 6-3. 보호 코어 포함 실패

```json
{
  "nodeCode": "CH2_TMP_SEARCH_RESULT",
  "input": "tar -cvf decoy.tar ./sys/temp/Memory_Dump_082.tmp ./cache/User_Behavior_88.tmp ./tmp/System_Temp_File.tmp ./root/hidden/L_fragment_core.tmp",
  "result": "FAIL_PROTECTED_CORE",
  "cwd": "/home/guest",
  "scanPercentBefore": 42,
  "scanPercentAfter": 57,
  "snapshotVersion": 9,
  "at": "2026-04-28T12:02:00+09:00"
}
```

---

## 7. Redis에 저장할 행동 범위

최근 행동 로그는 힌트 생성용이므로 너무 엄격하게 줄일 필요는 없다.

다만 RDB와 달리 bounded queue로 관리하므로, 일정 개수만 유지된다.

저장 대상:

```text
- command 입력
- click 입력
- inspect 입력
- choice 입력
- system transition 결과
- 실패 결과
- 스토리 진행 결과
```

단, 힌트 가치가 낮은 입력은 간단한 result만 남긴다.

예:

```text
pwd
ls
cd
cat 오타
command not found
```

이런 입력도 최근 행동 맥락에는 도움이 될 수 있으므로 Redis에는 저장한다.

---

## 8. RDB에 저장하지 않는 이유

RDB에 전체 로그를 저장하지 않는 이유는 다음과 같다.

```text
- 현재 목표가 장기 분석이 아니기 때문
- 힌트에는 최근 행동만 필요하기 때문
- Redis bounded queue로 충분하기 때문
- 터미널 입력은 빈도가 높고 잡음이 많기 때문
- 영속 보관할 가치가 낮은 입력이 많기 때문
- RDB action log 테이블이 없어도 현재 힌트 목표를 달성할 수 있기 때문
```

따라서 MVP에서는 `story_action_logs` 테이블을 추가하지 않는다.

---

## 9. RDB에는 무엇을 저장하는가

RDB에는 계속 다음 데이터를 저장한다.

```text
- user_story_progress.latest_chapter_id
- user_story_progress.latest_node_id
- user_story_progress.latest_checkpoint_node_id
- user_story_progress.latest_snapshot_json
- user_chapter_progress.status
- save_slots.snapshot_json
- story_nodes
- story_transitions
- lucas_knowledge
```

특히 `user_story_progress`는 게임 진행의 원본 상태다.

Redis에 nodeCode를 저장하더라도, 그것은 힌트용 빠른 조회 값이다.

```text
Redis nodeCode
= 힌트용 현재 위치 캐시

RDB latest_node_id
= 게임 진행의 영속 원본 상태
```

---

## 10. 힌트 요청 파이프라인

## 10-1. 전체 흐름

```text
1. 유저가 힌트 요청
2. Redis story:context:{userId}:{chapterCode} 조회
3. Redis story:recent-actions:{userId}:{chapterCode} 최근 N개 조회
4. 현재 nodeCode / chapterCode / puzzleId 기준으로 lucas_knowledge 검색
5. 검색된 지식과 최근 행동 패턴을 LLM에 전달
6. 루카스가 현재 상황에 맞는 힌트 생성
```

---

## 10-2. 예시: nc를 너무 빨리 입력하는 유저

최근 행동:

```text
find . -name "*.tmp" → SUCCESS_MOVE
nc -w 3 127.0.0.1 8080 < decoy.tar → FAIL_WRONG_ORDER
nc -w 3 127.0.0.1 8080 < decoy.tar → FAIL_WRONG_ORDER
```

현재 노드:

```text
CH2_TMP_SEARCH_RESULT
```

RAG 검색 대상:

```text
chapter = 2
puzzle_id = decoy_packet
```

루카스 힌트 방향:

```text
“전송할 패킷이 아직 만들어지지 않은 것 같아. 먼저 임시 파일들을 하나로 묶어야 해.”
```

---

## 10-3. 예시: 보호 코어 조각을 계속 넣는 유저

최근 행동:

```text
tar ... L_fragment_core.tmp → FAIL_PROTECTED_CORE
tar ... L_fragment_core.tmp → FAIL_PROTECTED_CORE
```

현재 노드:

```text
CH2_TMP_SEARCH_RESULT
```

힌트 방향:

```text
“root 영역의 조각은 진짜 흔적에 가까워. 지금 필요한 건 진짜 조각이 아니라, 버려도 되는 임시 데이터야.”
```

---

## 11. Redis TTL 정책

최근 행동 로그와 context는 무기한 유지하지 않는다.

추천 TTL:

```text
story:context:{userId}:{chapterCode}
→ 24시간 또는 챕터 진행 세션 기준

story:recent-actions:{userId}:{chapterCode}
→ 24시간 또는 챕터 진행 세션 기준
```

사용자가 재접속하면 RDB의 `user_story_progress`를 기준으로 Redis context를 재구성할 수 있다.

정책:

```text
- Redis 데이터가 있으면 힌트 생성에 사용
- Redis 데이터가 없으면 RDB latest_snapshot_json 기준으로 최소 context 재구성
- 최근 행동 로그가 없으면 현재 nodeCode 기반 일반 힌트 제공
```

---

## 12. Redis 장애 또는 유실 시 정책

Redis는 힌트 맥락 저장소이므로, Redis 데이터가 유실되어도 게임 진행 자체가 깨지면 안 된다.

```text
Redis 유실
→ 최근 행동 기반 힌트 품질은 낮아질 수 있음
→ 게임 진행은 RDB user_story_progress 기준으로 복구 가능
```

Fallback:

```text
1. Redis context 조회 실패
2. RDB user_story_progress 조회
3. latest_node_id / latest_snapshot_json 기준으로 현재 상태 복구
4. 최근 행동 없이 기본 힌트 생성
```

---

## 13. RDB action log 재검토 조건

MVP에서는 RDB action log를 추가하지 않는다.

다만 다음 요구가 생기면 다시 검토한다.

```text
- 유저 전체의 장기 퍼즐 병목 분석이 필요해짐
- 관리자 페이지에서 실패 통계를 봐야 함
- 특정 기간의 사용자 행동을 감사해야 함
- 힌트 개선을 위해 장기 학습 데이터가 필요해짐
- Redis TTL 이후에도 행동 이력을 보존해야 함
- 운영 지표나 리포트가 필요해짐
```

그때 선택지는 다음과 같다.

```text
1. story_action_logs RDB 테이블 추가
2. Redis Stream → 비동기 batch insert
3. Logstash / Elasticsearch 기반 행동 로그 파이프라인
4. 별도 analytics 이벤트 테이블
```

---

## 14. 구현 정책

## 14-1. Command 처리 시

```text
1. command 처리
2. result 확정
3. RDB 진행 상태 갱신이 필요하면 user_story_progress 갱신
4. Redis story:context 갱신
5. Redis story:recent-actions에 action push
6. queue length 제한
7. 응답 반환
```

## 14-2. 힌트 요청 시

```text
1. Redis context 조회
2. Redis recent-actions 조회
3. 부족하면 RDB latest_snapshot_json으로 보완
4. lucas_knowledge 검색
5. LLM 프롬프트 구성
6. 힌트 반환
```

---

## 15. result 코드

Redis recent-actions에는 다음 result 코드를 저장한다.

```text
SUCCESS_MOVE
SUCCESS_STAY
FAIL_NO_SUCH_FILE
FAIL_NOT_A_DIRECTORY
FAIL_PERMISSION_DENIED
FAIL_OUTSIDE_ROOT
FAIL_COMMAND_NOT_FOUND
FAIL_WRONG_ORDER
FAIL_PROTECTED_CORE
FAIL_DANGEROUS_COMMAND
FAIL_INACTIVE_TAB
FAIL_STALE_STATE
GAME_OVER
```

---

## 16. 확정 사항

```text
- MVP에서는 RDB story_action_logs 테이블을 추가하지 않는다.
- 행동 로그는 Redis recent-actions에서 관리한다.
- Redis recent-actions는 일정 개수만 유지한다.
- 최근 행동 로그는 힌트 생성용 실시간 맥락으로 사용한다.
- 현재 nodeCode, cwd, scanPercent 등 현재 context도 Redis에 저장한다.
- Redis context는 RDB 원본 상태의 캐시/힌트용 맥락일 뿐이다.
- 게임 진행의 영속 원본은 RDB user_story_progress가 담당한다.
- lucas_knowledge는 RAG 정답/힌트 지식 저장소로 유지한다.
- 힌트 요청 시 Redis 최근 행동 + Redis 현재 context + lucas_knowledge 검색 결과를 조합한다.
- Redis 데이터가 유실되면 RDB latest_snapshot_json 기준으로 최소 context를 재구성한다.
- 장기 분석 요구가 생기면 story_action_logs 또는 별도 로그 파이프라인을 재검토한다.
