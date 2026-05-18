# Kibana report analysis

Source:

- `presentation/monitoring_data/elk/kibana.md`

## Verdict

`kibana.md`는 기존 `for_presentations.csv`보다 발표용 상위 지표로 더 적합하다.

- `kibana.md`: `game-logs-*` 전체 Kibana 집계 보고서, 구조화 이벤트 9,476건
- `for_presentations.csv`: Kibana Discover에서 export한 부분 CSV, 구조화 이벤트 5,729건

따라서 최종 발표의 대표 ELK 숫자는 `kibana.md` 기준을 쓰고, 세부 명령/노드 샘플은 `for_presentations.csv` 분석을 보조 근거로 쓰는 게 좋다.

## Important correction

문서 제목의 `EKS/Kubernetes` 표현은 주의해야 한다. 이 프로젝트가 EKS가 아니라 EC2 기반 self-managed Kubernetes라면 발표에서는 `Kubernetes 로그 데이터 분석` 또는 `EC2 기반 Kubernetes 로그 데이터 분석`으로 말해야 한다.

또한 `session_id`가 실제 브라우저 세션과 1:1로 같은지 단정하면 안 된다. 보고서에서 `user_id`와 `session_id`가 모두 159로 같게 나오므로, 발표에서는 `action session key` 또는 `플레이 세션 키` 정도로 표현하는 것이 안전하다.

## Scope

| Item | Value |
| --- | ---: |
| Raw logs in `game-logs-*` | 167,608 |
| Structured game events | 9,476 |
| Other infra/app logs | 158,132 |
| Structured event share | 5.7% |
| Structured event range | 2026-04-30 05:19:29 -> 2026-05-18 08:09:16 UTC |
| Users by `user_id` | 159 |
| Session keys by `session_id` | 159 |

Namespace split:

| Namespace | Events | Share |
| --- | ---: | ---: |
| prod | 8,889 | 93.8% |
| dev | 587 | 6.2% |

Presentation wording:

> Kubernetes 컨테이너 로그 167,608건을 Elasticsearch에 적재했고, 그중 `result` 필드가 있는 구조화 게임 이벤트 9,476건을 분리해 플레이 행동 분석에 사용했다.

## Result distribution

| Result | Count | Share |
| --- | ---: | ---: |
| SUCCESS | 6,698 | 70.7% |
| FAIL | 2,675 | 28.2% |
| ERROR | 103 | 1.1% |

Interpretation:

- 성공 이벤트가 70.7%로 가장 많아 기본 진행은 정상적으로 이뤄졌다.
- 실패 이벤트가 28.2%로 충분히 많아 유저 병목 분석 근거로 쓸 수 있다.
- ERROR는 1.1%로 낮지만, click 전이/UNKNOWN 라우팅 계열로 별도 개선 근거가 된다.

## Chapter distribution

| Chapter | Events | Users | SUCCESS | FAIL | ERROR | Success rate | Fail rate | Avg fail count | Max fail count |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| week01 | 2,390 | 151 | 2,144 | 169 | 77 | 89.7% | 7.1% | 0.74 | 18 |
| week02 | 3,452 | 54 | 2,120 | 1,319 | 13 | 61.4% | 38.2% | 1.16 | 29 |
| week03 | 1,992 | 22 | 1,489 | 492 | 11 | 74.7% | 24.7% | 0.66 | 27 |
| week04 | 1,642 | 7 | 945 | 695 | 2 | 57.6% | 42.3% | 2.25 | 34 |

Interpretation:

- week01은 진입 구간으로 많은 유저가 들어왔고 성공률도 높다.
- week02에서 사용자 수가 151명에서 54명으로 줄고 실패율이 38.2%까지 오른다. 초반 이탈/난이도 상승 지점으로 말할 수 있다.
- week03은 성공률이 74.7%로 회복된다. week02를 넘은 유저는 조작 방식에 어느 정도 적응한 것으로 해석할 수 있다.
- week04는 유저 수가 7명으로 적지만 실패율 42.3%, 최대 실패 누적 34로 가장 강한 막힘이 관측된다.

Recommended slide message:

> 사용자 수는 뒤 챕터로 갈수록 줄어들고, 실패 강도는 week04에서 가장 높게 나타났다. 개선 우선순위는 week02의 진입 병목과 week04의 고난도 반복 실패 구간이다.

## Action type distribution

| Action type | Count | Share | SUCCESS | FAIL | ERROR | Interpretation |
| --- | ---: | ---: | ---: | ---: | ---: | --- |
| command | 7,182 | 75.8% | 4,492 | 2,675 | 15 | 실패 대부분이 명령 입력에서 발생 |
| click | 1,516 | 16.0% | 1,431 | 0 | 85 | 클릭 실패보다 UNKNOWN/전이 오류 성격 |
| system | 398 | 4.2% | 398 | 0 | 0 | 자동 전이는 안정적 |
| inspect | 380 | 4.0% | 377 | 0 | 3 | 검사 흐름은 대체로 안정적 |

Interpretation:

- 전체 이벤트의 75.8%가 `command`다.
- FAIL 2,675건은 모두 command 계열이다.
- 따라서 UX 개선은 버튼보다 터미널 명령 입력 피드백에 집중해야 한다.

## Main bottleneck nodes

| Rank | Node | Chapter | Fail/Error | Total | Rate | Interpretation |
| ---: | --- | --- | ---: | ---: | ---: | --- |
| 1 | CH2_GC_SCAN_ALERT | week02 | 397 | 991 | 40.1% | 스캔 이후 다음 행동 혼동 |
| 2 | CH2_LAPLACE_MISSION_READY | week02 | 295 | 816 | 36.2% | 미션 시작 후 실행/경로 탐색 혼선 |
| 3 | CH4_GATE_TRACE_VIEWED | week04 | 188 | 307 | 61.2% | trace 확인 후 SSH/파일 경로 추론에서 막힘 |
| 4 | CH2_FILE_LIST | week02 | 187 | 390 | 47.9% | 파일 목록 이후 열람/이동/실행 구분 혼동 |
| 5 | CH1_TERMINAL_SSH_READY | week01 | 163 | 216 | 75.5% | SSH 접속 타깃/형식 혼란 |
| 6 | CH4_LAPLACE_ABORTED_DIR_DETAIL | week04 | 149 | 354 | 42.1% | mount/경로/patch 파일 처리 반복 실패 |

Self-loop evidence:

| Node | Self-loop events | Total | Interpretation |
| --- | ---: | ---: | --- |
| CH2_GC_SCAN_ALERT | 931 | 991 | 같은 지점에서 반복 시도 |
| CH2_LAPLACE_MISSION_READY | 770 | 816 | 미션 진입 후 반복 실패 |
| CH4_LAPLACE_ABORTED_DIR_DETAIL | 349 | 354 | 거의 모든 이벤트가 같은 상태에 머묾 |
| CH4_GATE_TRACE_VIEWED | 276 | 307 | 다음 단계 전환 실패 |

Presentation wording:

> 로그를 통해 “어렵다”를 감으로 판단하지 않고, 실제로 사용자가 같은 노드에 머무르며 반복 입력한 위치를 숫자로 확인했다.

## Fail count severity

| Fail count after action | Events | Share |
| --- | ---: | ---: |
| 0 | 6,529 | 68.9% |
| 1-2 | 1,660 | 17.5% |
| 3-4 | 595 | 6.3% |
| 5-9 | 491 | 5.2% |
| 10+ | 201 | 2.1% |

`fail_count_after_action >= 10` distribution:

| Chapter | Events | Share |
| --- | ---: | ---: |
| week04 | 105 | 52.2% |
| week02 | 43 | 21.4% |
| week01 | 35 | 17.4% |
| week03 | 18 | 9.0% |

Interpretation:

- 전체 이벤트의 약 31.1%는 한 번 이상 실패한 이후의 행동이다.
- 10회 이상 실패 누적 이벤트가 201건 있다.
- 심한 막힘은 week04에 집중되고, 많은 유저가 처음으로 막히는 구간은 week02다.

## Error analysis

| Node | ERROR count | Observation |
| --- | ---: | --- |
| CH1_FRIEND_CHAT_OPEN | 35 | 친구 메시지 링크 전이에서 UNKNOWN 발생 |
| CH1_NEWS_PORTAL | 34 | 뉴스 포털 클릭 전이에서 UNKNOWN 발생 |
| CH2_TRACE_CLEANED | 11 | trace 정리 이후 입력 처리 문제 |
| CH3_EXTERNAL_SEVER_CONFIRM | 6 | 확인 명령 입력 파싱 문제 |
| CH1_DARK_ARTICLE_OPEN | 5 | 기사 열람 흐름 중 UNKNOWN 발생 |

Interpretation:

- click 이벤트의 ERROR는 유저 실수라기보다 상태 전이/라우팅 문제에 가깝다.
- 발표에서는 "실패는 난이도 개선 데이터, ERROR는 운영 버그 추적 데이터"로 나눠 말하는 것이 좋다.

## Comparison with previous CSV analysis

| Source | Range | Events | Users | Use |
| --- | --- | ---: | ---: | --- |
| `kibana.md` | 2026-04-30 -> 2026-05-18 UTC | 9,476 | 159 | 최종 발표 대표 수치 |
| `for_presentations.csv` | 2026-05-11 -> 2026-05-18 local display time | 5,729 | 88 known users | 세부 CSV 재집계, 실패 명령 패턴 확인 |

기존 `elk-analysis.md`의 5,729건 수치는 틀린 값이 아니라 CSV export 범위가 좁아서 나온 부분 집계다. 최종 발표에서는 `kibana.md`의 9,476건을 대표값으로 쓰는 편이 낫다.

## Slide guide updates

Final result slide should use:

- Raw logs: 167,608
- Structured game events: 9,476
- ELK users: 159
- SUCCESS / FAIL / ERROR: 6,698 / 2,675 / 103
- Command share: 75.8%
- Top bottlenecks: `CH2_GC_SCAN_ALERT`, `CH2_LAPLACE_MISSION_READY`, `CH4_GATE_TRACE_VIEWED`, `CH2_FILE_LIST`

Avoid:

- "16만 건의 사용자 행동"이라고 말하기
- ALB requests와 ELK users를 나눠 동의율처럼 말하기
- `session_id 159개`를 Clarity browser session과 같은 의미로 비교하기
- EKS를 사용하지 않았다면 "EKS 로그"라고 말하기
