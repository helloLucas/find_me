# Front monitoring data review

Source files:

- `ga4_report.csv`
- `clarity_dashboard.csv`

## Verdict

현재 파일은 발표의 "결과/유저 반응" 장표에 쓸 수 있는 대시보드 요약 데이터다. 다만 일별 유저 추이, 이벤트별 카운트, 챕터별 퍼널, 노드별 병목을 깊게 분석하기에는 부족하다.

요약하면:

- GA4: 전체 유저 규모, 조회수, 이벤트 수, 이탈률, 유입 출처, 지역을 말하는 데 사용 가능
- Clarity: 세션, 고유 사용자, 상위 페이지, 스마트 이벤트, dead click, JS 오류, 성능 지표를 말하는 데 사용 가능
- 추가 필요: GA4 일별 트래픽, GA4 이벤트 상세, GA4 페이지 path 상세, GA4 funnel, ELK/관리자 대시보드 병목 데이터

## Date ranges

| Source | Range | Note |
| --- | --- | --- |
| GA4 | 2026-05-04 -> 2026-05-18 | GA4 report export 기준 |
| Clarity | 2026-05-01 00:00 -> 2026-05-18 23:59 | Clarity dashboard export 기준 |
| AWS TSV | 2026-04-29 09:00 -> 2026-05-18 12:00 KST | ALB/EC2 CloudWatch export 기준 |

비교 차트를 만들려면 GA4, Clarity, AWS의 날짜 범위를 맞추는 것이 좋다. 그대로 쓸 경우 장표나 발표자 노트에 날짜 범위가 다르다고 적어야 한다.

## GA4 summary

Source: `ga4_report.csv`

| Metric | Value |
| --- | ---: |
| Active users | 75 |
| New users | 79 |
| Average engagement time per active user | 1548.23s, about 25m 48s |
| Event count | 17,951 |
| Page title/screen class | Find Me |
| Views | 2,815 |
| Bounce rate | 11.37% |

Acquisition:

| Dimension | Value |
| --- | ---: |
| First user source/medium: `(direct) / (none)` | 75 active users |
| Session source/medium: `(direct) / (none)` | 134 sessions |
| Session source/medium: `accounts.google.com / referral` | 49 sessions |
| Session source/medium: `project.ssafy.com / referral` | 29 sessions |

City:

| City | Active users |
| --- | ---: |
| Seoul | 42 |
| Daejeon | 29 |
| Gumi-si | 4 |
| Gwangju | 2 |
| Busan | 1 |
| Hanam-si | 1 |

Presentation use:

- "GA4 기준 2026-05-04부터 2026-05-18까지 active users 75, views 2,815, events 17,951이 기록됐다."
- "평균 참여 시간은 active user당 약 25분 48초로, 단순 랜딩 페이지보다 긴 체류형 경험이었다고 말할 수 있다."
- "주요 유입은 direct, Google OAuth referral, project.ssafy.com referral로 확인된다."

Caveats:

- `new users`가 `active users`보다 크게 보인다. GA4 정의/집계 방식 차이로 보일 수 있으므로 발표에서는 `active users 75`를 대표 유저 수로 쓰는 편이 안전하다.
- `N일, new, returning` 섹션은 날짜별 트래픽이 아니라 N-day/cohort 형태로 보인다. 챕터 공개일과 일별 유입을 비교하기에는 적합하지 않다.
- 이벤트별 이름과 카운트가 없다. `chapter_start`, `story_action`, `hint_requested`, `bug_report_submitted` 같은 행동별 수치를 보려면 Engagement -> Events export가 추가로 필요하다.
- 페이지 path가 아니라 page title/screen class가 `Find Me` 한 줄로만 들어 있다. `/lobby`, `/play/week01` 같은 화면별 GA4 분석에는 부족하다.

## Clarity summary

Source: `clarity_dashboard.csv`

| Metric | Value |
| --- | ---: |
| Total sessions | 134 |
| Bot sessions | 5 |
| Unique users | 61 |
| Sessions with new users | 78 |
| Sessions with returning users | 56 |
| Pages per session | 4.76 |
| Average scroll depth | 99.85 |

Insights:

| Insight | Sessions | Rate |
| --- | ---: | ---: |
| Quick clicks | 7 | 5.22% |
| Dead clicks | 69 | 51.49% |
| Excessive scrolling | 0 | 0% |
| Quick backs | 0 | 0% |

Top pages:

| Page | Sessions |
| --- | ---: |
| `/` | 91 |
| `/lobby` | 78 |
| `/play/week01` | 39 |
| `/setup-nickname` | 21 |
| `/minigames` | 18 |
| `/play/week02` | 17 |
| `/play/week03` | 17 |
| `/minigames/packet-dash` | 13 |
| `/play/ab59a490266a` | 9 |
| `/minigames/pacman` | 7 |
| `/minigames/starforce` | 7 |
| `/play/f61248eca6fc` | 6 |

Smart events:

| Event | Sessions | Rate |
| --- | ---: | ---: |
| home_landing_visible_5s | 65 | 48.51% |
| story_node_entered | 61 | 45.52% |
| desktop_visible_10s | 61 | 45.52% |
| play_screen_visible_10s | 60 | 44.78% |
| chapter_card_clicked | 60 | 44.78% |
| chapter_selected | 56 | 41.79% |
| auth_provider_selected | 55 | 41.04% |
| auth_popup_opened | 55 | 41.04% |
| login | 54 | 40.30% |
| terminal_command_submitted | 41 | 30.60% |
| terminal_command_accepted | 34 | 25.37% |
| terminal_command_rejected | 14 | 10.45% |
| terminal_command_blocked | 1 | 0.75% |
| bug_report_submitted | 1 | 0.75% |

JavaScript error:

- Total JavaScript errors: 3
- Error shown: `document.documentelement.requestfullscreen is not a function...`

Performance:

| Metric | Value |
| --- | ---: |
| Performance score | 88.36 |
| LCP | 0.524s |
| INP | 216ms |
| CLS | 0.007 |

Presentation use:

- "Clarity 기준 134 sessions, 61 unique users가 기록됐고, 세션당 페이지 수는 4.76이었다."
- "상위 페이지는 `/`, `/lobby`, `/play/week01` 순서로, 실제 플레이 화면까지 유저가 이동했다."
- "terminal_command_submitted가 41 sessions에서 발생했고, accepted 34 sessions, rejected 14 sessions가 기록됐다."
- "dead clicks가 69 sessions, 51.49%로 높게 잡혀 UX 개선 근거로 쓸 수 있다."
- "fullscreen 관련 JavaScript 오류 3건은 실제 사용자 환경에서 드러난 문제 사례로 쓸 수 있다."

Caveats:

- Clarity의 스마트 이벤트 값은 event count가 아니라 "해당 이벤트가 발생한 세션 수"로 읽어야 한다.
- GA4와 Clarity의 user/session 수는 수집 방식, 차단, bot 필터, 날짜 범위가 달라 직접 1:1 비교하면 안 된다.
- dead click 51.49%는 강한 UX 개선 근거가 될 수 있지만, 어떤 화면/요소에서 발생했는지 heatmap 또는 recording screenshot이 있으면 훨씬 설득력이 좋아진다.

## Additional exports still recommended

For the final result slide:

- GA4 daily traffic: `date, active_users, new_users, sessions, engaged_sessions, engagement_rate, average_engagement_time, event_count`
- GA4 events: `event_name, event_count, total_users`
- GA4 pages: `page_path, views, active_users, average_engagement_time`
- GA4 funnel: `step, step_name, users, completion_rate, abandonments, abandonment_rate`
- Clarity heatmap screenshots for `/lobby`, `/play/week01`, `/play/week04` or the true-ending path
- ELK/admin dashboard bottleneck export: node, reached_users, success_count, fail_count, success_rate, hint_count, top_fail_commands
