# ELK story action log analysis

Source:

- `presentation/monitoring_data/elk/for_presentations.csv`

## Scope note

이 문서는 Kibana Discover에서 export한 `for_presentations.csv` 부분 데이터를 재집계한 결과다. 최종 발표의 대표 ELK 수치는 더 넓은 범위의 Kibana 집계인 `presentation/monitoring_data/elk/kibana.md`와 `presentation/monitoring_data/elk/kibana-analysis.md`를 기준으로 사용한다.

- 대표 수치: `kibana.md` 기준 raw logs 167,608건, structured game events 9,476건, users 159명
- 세부 명령/노드 샘플: 이 문서의 CSV 기준 5,729건 분석 사용

## Verdict

이 파일은 발표에서 "실제로 유저가 플레이했고, 어느 지점에서 막혔는지"를 설명하는 데 가장 직접적으로 쓸 수 있는 데이터다.

GA4/Clarity가 방문, 세션, 화면 행동을 보여준다면, 이 ELK export는 백엔드가 판정한 스토리 행동 로그를 보여준다. 따라서 ALB 요청 수와 비교할 대상은 GA4 유저 수가 아니라, 이 파일의 `unique user_id`, `session_id`, `result`, `from_node_id`, `input_value_norm`이다.

## Caveats

- export 범위는 `2026-05-11 23:43:32` -> `2026-05-18 16:09:51`이다.
- AWS ALB export 범위(`2026-04-29 09:00` -> `2026-05-18 12:00`)보다 짧다.
- GA4 export 범위(`2026-05-04` -> `2026-05-18`)보다 시작이 늦다.
- 이 파일은 `StoryActionLogger` 기반 액션 로그다. 페이지뷰, 정적 파일 요청, 단순 방문자는 포함하지 않는다.
- `session_id` 값이 `sess_user_{id}` 형태라서 일반적인 웹 세션과 1:1로 같다고 보면 안 된다. 발표에서는 "ELK action session key" 또는 "action session" 정도로 표현하는 편이 안전하다.
- `hint_requested`는 모든 행이 `false`다. 이 export만 보면 힌트 요청이 발생하지 않았거나, 힌트 요청 경로가 이 액션 로그 필드에 반영되지 않았다고 해석해야 한다.
- 1,500 rows는 `user_id`가 비어 있지만 `session_id`는 존재한다. 대표 유저 수는 `known user_id 88`, 행동 session key는 `91`로 함께 말하는 편이 안전하다.

## Available fields

핵심 분석에 쓸 수 있는 필드:

- `@timestamp`
- `chapter_id`
- `from_node_id`
- `to_node_id`
- `action_type`
- `input_value_norm`
- `result`
- `fail_count_after_action`
- `hint_requested`
- `session_id`
- `user_id`

## Overview

| Metric | Value |
| --- | ---: |
| Total action log rows | 5,729 |
| Known unique users | 88 |
| Unique action session keys | 91 |
| Rows with missing `user_id` | 1,500 |
| Unique chapters | 4 |
| Unique from nodes | 84 |
| Unique normalized inputs | 1,937 |

## Result distribution

| Result | Count | Share |
| --- | ---: | ---: |
| SUCCESS | 3,871 | 67.57% |
| FAIL | 1,783 | 31.12% |
| ERROR | 75 | 1.31% |

Presentation use:

- "ELK 액션 로그 기준 총 5,729건의 플레이 행동이 기록됐고, 이 중 성공 판정은 67.57%, 실패 판정은 31.12%였다."
- "실패가 1,783건 기록됐기 때문에, 유저가 실제로 퍼즐을 시도하고 막힌 지점이 있었다는 근거로 쓸 수 있다."

## Action type distribution

| Action type | Count | Share | Success rate |
| --- | ---: | ---: | ---: |
| command | 4,828 | 84.27% | 62.78% |
| click | 611 | 10.67% | 90.18% |
| inspect | 148 | 2.58% | 99.32% |
| system | 142 | 2.48% | 100.00% |

Interpretation:

- 유저 행동의 대부분은 터미널 command였다.
- click/inspect는 대부분 성공했지만, command는 실패율이 높았다.
- 발표에서는 "유저가 단순 클릭보다 명령 입력형 퍼즐에서 더 많이 막혔다"는 근거로 쓸 수 있다.

## Chapter distribution

| Chapter | Events | Known users | Action sessions | Success | Fail | Error | Success rate | Fail rate |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| week01 | 951 | 77 | 77 | 794 | 99 | 58 | 83.49% | 10.41% |
| week02 | 1,283 | 19 | 20 | 750 | 528 | 5 | 58.46% | 41.15% |
| week03 | 1,874 | 17 | 22 | 1,385 | 478 | 11 | 73.91% | 25.51% |
| week04 | 1,621 | 4 | 7 | 942 | 678 | 1 | 58.11% | 41.83% |

Interpretation:

- week01은 진입 유저가 가장 많고 성공률도 높다.
- week02와 week04는 실패율이 41%대로 높아, 퍼즐 난이도나 안내 보강이 필요한 구간으로 볼 수 있다.
- week04는 샘플 유저가 적다. "난이도 높음"을 강하게 단정하기보다, "소수의 집중 플레이에서 실패가 많이 누적된 구간"으로 말하는 편이 안전하다.

## Daily timeline

| Date | Events | Known users | Action sessions | Success | Fail | Error |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| 2026-05-11 | 52 | 2 | 2 | 41 | 11 | 0 |
| 2026-05-12 | 1,741 | 40 | 40 | 1,267 | 408 | 66 |
| 2026-05-13 | 74 | 14 | 14 | 65 | 5 | 4 |
| 2026-05-14 | 281 | 16 | 16 | 207 | 74 | 0 |
| 2026-05-15 | 1,611 | 20 | 20 | 1,066 | 543 | 2 |
| 2026-05-16 | 1,038 | 1 known user | 7 | 647 | 390 | 1 |
| 2026-05-17 | 416 | 3 | 3 | 217 | 197 | 2 |
| 2026-05-18 | 516 | 7 | 7 | 361 | 155 | 0 |

Presentation use:

- `2026-05-12`와 `2026-05-15`에 플레이 액션이 크게 몰렸다.
- `2026-05-16`은 known user는 1명으로 잡히지만 action session key는 7개다. user_id 누락 행이 섞여 있으므로, 유저 수 해석은 조심해야 한다.

## Chapter reach and completion from action logs

이 표는 export 기간 안에서 해당 챕터 액션 로그가 있는 유저/세션을 분모로 한 값이다. 전체 서비스의 공식 완료율이 아니다.

| Chapter | Reached users | Completed users | User completion rate | Reached sessions | Completed sessions | Session completion rate |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| week01 | 77 | 18 | 23.4% | 77 | 18 | 23.4% |
| week02 | 19 | 4 | 21.1% | 20 | 4 | 20.0% |
| week03 | 17 | 7 | 41.2% | 22 | 7 | 31.8% |
| week04 | 4 | 3 | 75.0% | 7 | 4 | 57.1% |

Completion node criteria used:

- week01: `CH1_COMPLETE`
- week02: `CH2_COMPLETE`
- week03: `CH3_COMPLETE`
- week04: `CH4_ROLLBACK_ENDING`, `CH4_BAD_ENDING`, `CH4_MINIGAME_COMPLETED`

Interpretation:

- week01/week02는 진입 대비 완료율이 낮아 초반 퍼널 분석에 쓸 수 있다.
- week03은 앞 챕터보다 완료율이 높게 잡힌다.
- week04는 표본이 작아서 결과를 일반화하면 안 된다. 다만 엔딩까지 도달한 집중 플레이 사례가 있었다고 말할 수 있다.

## Top bottleneck nodes by fail count

| Node | Chapter | Total | Fail | Error | Fail rate | Known users | Sessions |
| --- | --- | ---: | ---: | ---: | ---: | ---: | ---: |
| CH2_GC_SCAN_ALERT | week02 | 517 | 225 | 1 | 43.5% | 16 | 17 |
| CH4_GATE_TRACE_VIEWED | week04 | 307 | 188 | 0 | 61.2% | 4 | 7 |
| CH4_LAPLACE_ABORTED_DIR_DETAIL | week04 | 333 | 131 | 0 | 39.3% | 1 | 3 |
| CH2_FILE_LIST | week02 | 216 | 123 | 0 | 56.9% | 19 | 20 |
| CH1_TERMINAL_SSH_READY | week01 | 117 | 95 | 0 | 81.2% | 20 | 20 |
| CH3_CORE_GROUP_INVALID | week03 | 161 | 69 | 2 | 42.9% | 5 | 7 |
| CH3_FRAGMENT_03_FOUND | week03 | 87 | 62 | 0 | 71.3% | 7 | 10 |
| CH4_LAPLACE_ABORTED | week04 | 97 | 54 | 0 | 55.7% | 3 | 4 |
| CH3_SOCIAL_ISOLATION_READY | week03 | 197 | 50 | 2 | 25.4% | 9 | 13 |
| CH2_LAPLACE_MISSION_READY | week02 | 147 | 50 | 1 | 34.0% | 8 | 9 |

Presentation use:

- "가장 큰 병목은 week02의 `CH2_GC_SCAN_ALERT`로, 517 action 중 225 fail이 발생했다."
- "week01의 SSH 준비 구간은 fail rate가 81.2%로 높아 초반 진입 장벽으로 볼 수 있다."
- "week04는 표본 유저 수는 적지만 특정 노드에서 반복 실패가 강하게 누적됐다."

## High fail-rate nodes

Total count 20 이상인 노드만 대상으로 봤다.

| Node | Total | Fail | Fail rate | Known users | Sessions |
| --- | ---: | ---: | ---: | ---: | ---: |
| CH4_LAPLACE_CONFIRM_FAIL_3 | 50 | 47 | 94.0% | 1 | 1 |
| CH1_TERMINAL_SSH_READY | 117 | 95 | 81.2% | 20 | 20 |
| CH3_FRAGMENT_03_FOUND | 87 | 62 | 71.3% | 7 | 10 |
| CH4_GATE_TRACE_VIEWED | 307 | 188 | 61.2% | 4 | 7 |
| CH2_FILE_LIST | 216 | 123 | 56.9% | 19 | 20 |
| CH4_LAPLACE_ABORTED | 97 | 54 | 55.7% | 3 | 4 |
| CH3_CORE_GROUP_ENCRYPTED | 58 | 26 | 44.8% | 7 | 11 |
| CH2_DECOY_SENT | 70 | 31 | 44.3% | 5 | 7 |
| CH2_SERVER_HOME | 104 | 46 | 44.2% | 19 | 20 |
| CH3_HOME_RECHECK | 59 | 26 | 44.1% | 11 | 15 |

Interpretation:

- `CH4_LAPLACE_CONFIRM_FAIL_3`은 실패율은 매우 높지만 표본이 1 user/1 session이라 발표에서 대표 병목으로 쓰기엔 약하다.
- `CH1_TERMINAL_SSH_READY`, `CH2_FILE_LIST`, `CH2_GC_SCAN_ALERT`는 유저/세션 수가 넓게 분포해 발표용 병목 근거로 더 좋다.

## Error nodes

| Node | Chapter | Total | Error | Error rate |
| --- | --- | ---: | ---: | ---: |
| CH1_NEWS_PORTAL | week01 | 94 | 30 | 31.9% |
| CH1_FRIEND_CHAT_OPEN | week01 | 118 | 24 | 20.3% |
| CH3_EXTERNAL_SEVER_CONFIRM | week03 | 37 | 6 | 16.2% |
| CH1_DARK_ARTICLE_OPEN | week01 | 63 | 3 | 4.8% |
| CH2_TRACE_CLEANED | week02 | 9 | 3 | 33.3% |

Presentation use:

- ERROR는 총 75건으로 전체의 1.31%다.
- 오류는 week01 UI/전이 구간에 상대적으로 많이 보인다.
- Clarity의 fullscreen JavaScript error 3건과 함께 "실제 사용 중 드러난 오류를 운영 데이터로 확인했다"는 흐름에 넣을 수 있다.

## Repeated failed command patterns

원문 명령어는 퍼즐 답과 플레이 내용을 노출할 수 있으므로 장표에는 그대로 많이 넣지 않는 편이 좋다. 발표에서는 "반복 오타", "파일 실행 위치 혼동", "경로 이동 혼동", "SSH 접속 형식 혼동" 같은 유형으로 묶는 것을 권장한다.

| Pattern example | Fail count | Known users | Sessions | Main nodes |
| --- | ---: | ---: | ---: | --- |
| Korean/English keyboard typo pattern, e.g. `ㅣㄴ` | 24 | 12 | 14 | week02/week03 several nodes |
| Fragment script execution timing/path confusion | 16 | 7 | 10 | CH3_FRAGMENT_02_DUMPED, CH3_RELAY_EMPTY_RESPONSE |
| Similar fragment script confusion | 14 | 8 | 10 | CH3_FRAGMENT_02_DUMPED, CH2_GC_SCAN_ALERT |
| `world_map.map` as command instead of file inspection | 13 | 7 | 7 | CH2_FILE_LIST |
| `help` command attempts | 13 | 4 | 6 | CH4_CORE_BLOCKED, CH1_TERMINAL_SSH_READY |
| `cd root` / `cd root/` path confusion | 21 combined | 7+ | 7+ | CH2_GC_SCAN_ALERT, CH2_LAPLACE_MISSION_READY |
| websocket/host string used directly as command | 8 | 7 | 7 | CH1_TERMINAL_SSH_READY |
| host:port string used directly as command | 6 | 6 | 6 | CH1_TERMINAL_SSH_READY |

Presentation use:

- "실패 명령어를 보면 단순 난이도 문제만이 아니라, 유저가 어떤 조작을 기대했는지 보인다."
- "예를 들어 파일명을 명령처럼 입력하거나, SSH 주소를 그대로 입력하는 식의 실패가 반복됐다."
- "그래서 힌트/피드백은 정답 제공이 아니라 조작 방향을 좁혀주는 방식이어야 했다."

## Comparison with GA4 / Clarity / ALB

| Source | Best used for | Current value |
| --- | --- | --- |
| ALB CloudWatch | 외부 HTTP 요청량 | 150,503 requests |
| GA4 | 분석 동의/추적된 사용자 규모 | 75 active users, 17,951 events |
| Clarity | 세션 녹화/UX 행동 | 134 sessions, 61 unique users |
| ELK action logs | 실제 백엔드 판정 기준 플레이 행동 | 5,729 actions, 88 known users, 91 action session keys |

Important:

- ALB 요청 수 150,503을 GA4 active users 75나 ELK known users 88과 직접 나눠서 "동의율"로 해석하면 안 된다.
- ALB는 HTTP 요청 수이고, ELK는 스토리 행동 수다.
- "실제 플레이 규모"를 말할 때는 ELK `known users 88`, `action session keys 91`, `actions 5,729`를 쓰는 것이 더 적절하다.
- "브라우저 행동/UX"는 Clarity, "분석 도구에 잡힌 방문 규모"는 GA4, "서비스가 외부 요청을 받은 규모"는 ALB로 역할을 나눠 말해야 한다.

## Slide recommendations

### Result slide

Use:

- GA4 active users: 75
- Clarity sessions: 134
- ELK known users: 88
- ELK action logs: 5,729
- ALB requests: 150,503

Suggested wording:

> 외부 요청은 ALB 기준 150,503건이었고, 실제 플레이 행동은 ELK 기준 5,729건 기록됐다. GA4와 Clarity에는 각각 75 active users, 134 sessions가 잡혔으며, 백엔드 행동 로그에서는 88명의 known user가 확인됐다.

### Bottleneck slide

Use:

- `CH2_GC_SCAN_ALERT`: 517 actions, 225 fails, 43.5% fail rate
- `CH1_TERMINAL_SSH_READY`: 117 actions, 95 fails, 81.2% fail rate, 20 users
- `CH2_FILE_LIST`: 216 actions, 123 fails, 56.9% fail rate, 19 users
- `CH4_GATE_TRACE_VIEWED`: 307 actions, 188 fails, 61.2% fail rate, 4 users

Suggested wording:

> 유저가 막힌 지점은 감으로 판단하지 않았다. ELK에서 노드별 실패율과 실패 명령을 집계해 어떤 퍼즐이 진입 장벽이었는지 확인했다.

### Feedback slide

Use:

- command action이 84.27%
- command success rate가 62.78%
- 반복 실패 유형: 오타, 파일 실행 위치 혼동, 경로 이동 혼동, SSH 접속 형식 혼동

Suggested wording:

> 유저 실패의 대부분은 터미널 명령 입력에서 발생했다. 이 데이터는 힌트가 정답을 말하는 기능이 아니라, 다음에 시도할 조작 방향을 좁혀주는 기능이어야 한다는 근거가 됐다.
