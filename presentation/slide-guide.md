# FIND ME / LUCAS 발표 장표 가이드

기준 문서: `presentation/storyline-draft.md`

## 장표 작성 원칙

- 장표 안 글자는 최소화한다. 한 장표에는 큰 문장 1개, 짧은 키워드 3개, 숫자 1-3개 정도만 둔다.
- 상세 설명은 발표자 노트로 뺀다.
- "프론트엔드 구현", "백엔드 구현"처럼 계층별로 나누지 않는다. 유저가 겪는 기능과 그 기능을 가능하게 한 구현 방향으로 설명한다.
- 숫자는 출처가 확인된 것만 사용한다. GA4, Clarity, 관리자 대시보드, ELK 수치는 발표 전 실제 export로 확정한다.
- CloudWatch/Prometheus 수치는 "외부 트래픽과 인프라 관측의 근거"로만 쓴다. 유저 수나 챕터 완료율로 해석하지 않는다.

## 사용 가능한 데이터 요약

| 데이터 | 현재 상태 | 쓸 수 있는 장표 | 주의 |
| --- | --- | --- | --- |
| 릴리즈 diff | `storyline-draft.md`에 정리됨 | 16 | SQL 제외 기준 |
| AWS CloudWatch TSV | `presentation/aws-tsv-analysis.md`에 정리됨 | 14, 15 | ALB/EC2 지표. 유저 행동 아님 |
| Grafana CSV | `presentation/grafana-csv-analysis.md`에 정리됨 | 15 | worker1 일부 시리즈만 export됨 |
| Mattermost report flow | `docs/mm_hint/mattermost_report_flow.md` | 10, 11, 12 | 설계/흐름 근거. 실제 리포트 수치 필요 |
| GA4 | `presentation/monitoring_data/front_monitor/ga4_report.csv` 확보 | 11, 12, 18 | 요약 지표는 사용 가능. 이벤트/퍼널 상세는 추가 필요 |
| Clarity | `presentation/monitoring_data/front_monitor/clarity_dashboard.csv` 확보 | 11, 12, 17, 18 | 대시보드 요약은 사용 가능. heatmap/recording 이미지는 추가 권장 |
| 관리자 대시보드/ELK | `presentation/monitoring_data/elk/kibana.md`, `for_presentations.csv` 확보 | 11, 12, 17, 18 | Kibana 전체 집계는 대표 수치, CSV는 실패 명령 세부 분석 |

---

## Slide 01. Cover

장표 문구:
- FIND ME / LUCAS
- 실제 유저로 검증한 운영형 브라우저 게임

시각 자료:
- 서비스 첫 화면 또는 플레이 화면 전체 스크린샷
- 가능하면 가상 OS/터미널/브라우저가 한 번에 보이는 장면

데이터:
- 없음

발표자 노트:
- 이 프로젝트는 게임을 만들고 싶어서 시작한 것이 아니다.
- 실제 유저가 들어오는 서비스를 만들고 운영하면서 기술을 검증하려고 했다.
- 그 유저를 모으고 유지하기 위한 형태로 챕터형 브라우저 게임을 선택했다.

---

## Slide 02. 우리가 원했던 것

장표 문구:
- 기술을 실제 유저로 검증하고 싶었다

시각 자료:
- "서비스 운영 경험" 흐름도
- 화면 -> 서버 -> 데이터 -> 배포 -> 모니터링 -> 피드백

데이터:
- 없음

발표자 노트:
- 단순 구현물이 아니라 배포 후 트래픽, 로그, 피드백, 장애 대응이 생기는 프로젝트가 필요했다.
- 그래서 한 번 보고 끝나는 포트폴리오 페이지보다, 유저가 다시 들어올 이유가 있는 서비스가 필요했다.

---

## Slide 03. 왜 유저가 필요했나

장표 문구:
- 로그도, 모니터링도, 피드백도 유저가 있어야 의미가 있다

시각 자료:
- 비교 다이어그램
- 일반 기능 시연: 1회성
- 챕터형 게임: 재방문, 행동 로그, 피드백

데이터:
- 아직 실제 유저 수는 넣지 않는다.
- 발표 전 GA4/관리자 대시보드에서 총 유저, 세션, 재방문 수치를 확정한다.

발표자 노트:
- 인프라 운영, 트래픽 대응, 로그 분석을 하려면 실제로 들어오는 사람이 있어야 했다.
- 매주 새로운 챕터를 여는 구조는 공개 일정 자체가 유입과 재방문 이유가 되도록 만든 장치였다.

---

## Slide 04. 제품 형태: 웹을 게임처럼 보이게 하기

장표 문구:
- 기술 데모가 아니라 사건에 들어온 느낌

시각 자료:
- 가상 OS 화면 캡처
- 브라우저, 터미널, 메신저, 문서 뷰어 영역을 3-4개 라벨로 표시

데이터:
- 없음

코드/근거:
- `frontend/src/features/Browser/index.tsx`
- `frontend/src/widgets/Desktop`
- `frontend/src/features/command-input`

발표자 노트:
- 유저는 설명을 읽는 사람이 아니라, 명령을 입력하고 문서를 찾고 탭을 이동하는 사람이 된다.
- UI 상태 변화는 스토리 연출이면서 동시에 유저 행동을 수집하는 입력 지점이 된다.

---

## Slide 05. 유저가 계속 움직이는 핵심 루프

장표 문구:
- 단서 -> 행동 -> 판정 -> 보상/실패 -> 다음 행동

시각 자료:
- 원형 루프 다이어그램
- 단서 확인, 행동 입력, 서버 판정, 화면 변화, 힌트/로그

데이터:
- 없음

발표자 노트:
- 유저가 현재 챕터와 노드에 진입하면 화면이 상황을 보여준다.
- 유저 행동은 서버 판정을 거쳐 다음 노드, fragment, 문서, 미니게임, 엔딩 조건으로 이어진다.
- 실패도 버리지 않고 힌트, 운영 리포트, 병목 분석의 데이터가 된다.

---

## Slide 06. 반복 방문 장치: 매주 열리는 챕터

장표 문구:
- 유저가 다시 올 이유를 만들었다

시각 자료:
- CH1 -> CH2 -> CH3 -> CH4 타임라인
- 각 챕터 옆에 미니게임 이름 또는 대표 화면 1장

데이터:
- 발표 전 GA4에서 날짜별 사용자/세션 그래프를 넣으면 좋다.
- 챕터 공개일과 트래픽 피크를 함께 놓을 수 있으면 가장 설득력이 좋다.

현재 사용 가능한 보조 데이터:
- ALB 요청 상위일
  - 2026-05-04: 13,241 requests, peak 3,467/hour
  - 2026-05-12: 11,714 requests, peak 2,641/hour
  - 2026-05-16: 10,126 requests, peak 1,307/hour

git 근거:
- `StarforceTab.tsx`: 스타포스 추가 -> 아케이드 모드 -> 미니게임 해시 -> BGM 수정
- `CyberPacketDashTab.tsx`: 미니게임 추가 -> BGM/전체화면/포커스/성능/중복 clear 수정
- `lucas-route`, `lucas-survival`: 챕터4 미니게임, 히든 전이, 엔딩 조건 연결

발표자 노트:
- 미니게임은 장식이 아니라 유저 리텐션을 위한 콘텐츠였다.
- 매주 열리는 챕터는 유저 관심을 유지했고, 실제 트래픽과 피드백이 쌓이는 구조를 만들었다.
- ALB 요청 수는 유저 수가 아니라 외부 요청량이므로 "트래픽이 있었다"는 근거로만 말한다.

---

## Slide 07. 화면 런타임: 복잡한 응답을 자연스러운 화면으로

장표 문구:
- 서버 응답이 복잡해져도 유저 화면은 흔들리지 않게

시각 자료:
- 서버 output bundle -> adapter -> 브라우저/메신저/터미널/미니게임 화면 상태 변환 흐름

데이터:
- 없음

코드/근거:
- React 19, Vite, Zustand, React Router
- output bundle adapter
- 브라우저/메신저/터미널/미니게임 탭 구조

발표자 노트:
- 스토리 데이터가 커질수록 서버 응답을 그대로 화면에 묶으면 변경에 취약해진다.
- 그래서 유저가 보는 화면 상태와 서버 원시 응답 사이에 변환 계층을 둔 것이 핵심이다.
- 이 장표에서는 기술 이름보다 "유저 화면이 끊기지 않게 하기 위한 구조"로 설명한다.

---

## Slide 08. 유저 진행은 서버가 책임진다

장표 문구:
- 어디까지 왔는지는 서버가 판단한다

시각 자료:
- User Progress -> latestNode -> allowed transitions -> nextNode

데이터:
- 없음

코드/근거:
- `StoryServiceImpl.processTransition`
- `StoryTransition`
- Redis recent action/progress

발표자 노트:
- 유저가 재접속하거나 잘못된 요청을 보내도 현재 위치는 서버가 판단한다.
- `story_nodes`와 `story_transitions`는 단순 스토리 데이터가 아니라 유저 진행 상태 머신이다.
- 현재 노드에서 허용된 다음 노드만 이동하게 만들어 진행을 통제했다.

---

## Slide 09. 진행 무결성: 스토리 스킵과 악용 방지

장표 문구:
- URL을 바꿔도 진행은 건너뛸 수 없다

시각 자료:
- 잘못된 접근 차단 다이어그램
- 임의 URL/nodeId -> server latestNode check -> Transition not allowed

데이터:
- 없음

코드/근거:
- `StoryTransition`: `fromNode -> toNode`, `actionType`, `expectedInput`, `validatorType`, `validatorConfig`
- `StoryServiceImpl.processTransition`: 유저의 `latestNode`에서 출발하는 transition만 조회
- 관련 이력:
  - `feat: 미니게임에 해시 추가`
  - `feat: 챕터 해시 백엔드 추가`
  - `feat: 미니게임 백엔드 업데이트 세션 관리 추가`
  - `feature/be-prevent-minigame-url-injection`

발표자 노트:
- `story_node.sql`과 `transition.sql`은 페이지 목록이 아니라 허용된 진행 그래프다.
- 특정 노드에서 가능한 다음 노드와 액션 조건을 제한했다.
- 매칭 transition이 없으면 fallback을 시도하고, 처리할 수 없으면 `Transition not allowed`로 막는다.
- 이 구조로 무분별한 스토리 스킵, 잘못된 접근, 버그 악용을 줄였다.

---

## Slide 10. 막힌 유저를 놓치지 않는 힌트

장표 문구:
- 정답 제공이 아니라 이탈 방지

시각 자료:
- 실패 횟수 -> 힌트 강도 LIGHT/MEDIUM/STRONG
- 현재 노드 + 질문 + RAG -> 힌트

데이터:
- 실제 힌트 요청 수는 발표 전 관리자 대시보드/ELK/GA4에서 확정한다.
- Mattermost 리포트가 있으면 "실패 5회 이상 + 성공률 50% 미만" 병목 경고 예시를 넣는다.

코드/문서 근거:
- `POST /api/v1/hints/live`
- AI orchestrator: query embedding, PGVector retrieval, LLM hint generation
- `docs/mm_hint/mattermost_hint_flow.md`
- `docs/mm_hint/mattermost_report_flow.md`

발표자 노트:
- AI 힌트는 정답을 바로 알려주는 기능이 아니라 막힌 유저가 다시 시도하게 만드는 장치다.
- LLM 실패 시에도 서버 템플릿 fallback으로 빈 응답을 피한다.
- 운영 측면에서는 병목 노드를 찾아 힌트 보강 대상으로 삼을 수 있다.

---

## Slide 11. 유저가 막히는 곳을 보는 법

장표 문구:
- 실패는 제품 개선 데이터가 된다

시각 자료:
- 병목 노드 테이블 또는 퍼널
- 예: 노드명, 도달 유저, 성공률, 실패 명령어, 힌트 요청

필요 데이터:
- ELK export
  - raw logs: 167,608
  - structured game events: 9,476
  - user_id 기준 users: 159
  - action session keys: 159
  - success/fail/error: 6,698 / 2,675 / 103
  - command action: 7,182, 전체의 75.8%
  - command success/fail/error: 4,492 / 2,675 / 15
  - 주요 병목:
    - `CH2_GC_SCAN_ALERT`: 991 actions, 397 fail/error, fail/error rate 40.1%
    - `CH2_LAPLACE_MISSION_READY`: 816 actions, 295 fail/error, fail/error rate 36.2%
    - `CH4_GATE_TRACE_VIEWED`: 307 actions, 188 fail/error, fail/error rate 61.2%
    - `CH2_FILE_LIST`: 390 actions, 187 fail/error, fail/error rate 47.9%
    - `CH1_TERMINAL_SSH_READY`: 216 actions, 163 fail/error, fail/error rate 75.5%
  - 반복 실패 유형: 오타, 파일 실행 위치 혼동, 경로 이동 혼동, SSH 접속 형식 혼동

Mattermost 계산 기준:
- 총 참여 유저: 기간 내 unique `session_id`
- 총 액션 발생: 기간 내 로그 문서 수
- 평균 플레이 시간: 세션별 `max_ts - min_ts` 평균
- 성공률: `success / (success + fail)`
- 이탈률: `(노드 도달 유저 - 노드 성공 유저) / 노드 도달 유저`
- 자동 경고: 실패 5회 이상 + 성공률 50% 미만

발표자 노트:
- 유저가 막히는 지점을 감으로 찾지 않고, 실패 이벤트와 힌트 요청으로 보려고 했다.
- ELK 기준으로 실제 실패 노드와 실패 명령어를 확인할 수 있다.
- 대표 ELK 수치는 Kibana 전체 집계 기준이며, CSV export는 세부 명령 패턴을 확인하는 보조 자료다.
- Kibana 구조화 이벤트 범위는 2026-04-30 05:19:29 -> 2026-05-18 08:09:16 UTC다.

---

## Slide 12. 피드백 처리 루프

장표 문구:
- 버그 제보 -> 로그 확인 -> 수정 -> 재배포

시각 자료:
- 인게임 버그 리포트 화면
- 또는 feedback loop 다이어그램

필요 데이터:
- 버그 리포트 수
- 처리한 피드백 사례 3개
- 수정 커밋 3개

현재 넣을 수 있는 커밋 사례:
- 터미널 오답 로그가 사라지는 UX 수정
- 챕터3 사라진 메모 힌트 복원
- 미니게임 포커스/새로고침/중복 clear 수정
- 챕터4 awkward dialogue, 누락 노드, 전이 검증 강화
- 잘못된 접근은 `Transition not allowed`, FAIL 노드, retry 응답, recent-action 기록으로 남겨 힌트/운영 분석에 활용

발표자 노트:
- 유저가 남긴 피드백이 실제 수정으로 이어졌다는 점을 보여준다.
- 수치보다 "어떤 불편이 있었고, 어떤 커밋으로 고쳤는지"가 중요하다.

---

## Slide 13. 인프라가 커진 방향

장표 문구:
- 배포에서 운영 관측으로

시각 자료:
- 인프라 타임라인
- 단일 서버 -> Jenkins/Docker -> K8s/Ingress -> HPA/Probe -> ELK -> Prometheus/Grafana/Loki -> Mattermost

데이터:
- 없음

문서/근거:
- `docs/infra/cicd_pipeline_info.md`
- `docs/infra/k8s/k8s-scaleout-report.ko.md`
- `docs/infra/elk_implementation_status.md`
- `docs/infra/monitoring_setup_guide.md`
- `docs/infra/kubernetes_hybrid_monitoring_setup_guide.md`

발표자 노트:
- 처음에는 배포 자동화가 목표였다.
- 유저가 들어오면서 "서비스가 살아 있는지", "어디서 실패하는지", "트래픽을 버티는지"를 보는 구조가 필요해졌다.
- Jenkins가 CI/CD를 담당했고, Argo CD는 실제 사용한 것이 아니라 도입 시 얻을 수 있는 미래 개선점으로만 언급해야 한다.

---

## Slide 14. 외부 트래픽 근거: ALB

장표 문구:
- 150,503 requests
- ALB 5xx 0.0797%
- 평균 응답 약 74ms

시각 자료:
- 일별 ALB RequestCount 막대 그래프
- 5xx 발생일을 작은 빨간 점 또는 보조 막대로 표시

데이터:
- 기간: 2026-04-29 09:00 -> 2026-05-18 12:00 KST
- 총 ALB requests: 150,503
- peak request hour: 3,467/hour at 2026-05-04 14:00 KST
- request-weighted ALB target response average: 0.0739s
- ALB-generated 5xx: 120
- ALB-generated 5xx rate: 0.0797%

상위 요청일:
- 2026-05-04: 13,241 requests, peak 3,467/hour
- 2026-05-12: 11,714 requests, peak 2,641/hour
- 2026-05-16: 10,126 requests, peak 1,307/hour
- 2026-05-15: 9,580 requests, peak 1,030/hour
- 2026-04-30: 8,177 requests, peak 779/hour

출처:
- `presentation/monitoring_data/alb_request_count.tsv`
- `presentation/monitoring_data/alb_response_time.tsv`
- `presentation/monitoring_data/alb_5xx.tsv`
- `presentation/aws-tsv-analysis.md`

주의:
- `HTTPCode_ELB_5XX_Count`는 ALB가 생성한 5xx다. target/application 5xx가 아니다.
- ALB requests는 유저 수가 아니다. 이미지, API, 새로고침, 내부 호출 등이 섞인 외부 요청량이다.
- 2026-04-29와 2026-05-18은 부분일이다.

발표자 노트:
- 이 장표는 "로컬에서만 돌린 서비스가 아니라 실제 외부 트래픽을 받았다"는 근거다.
- 유저 행동 분석은 GA4/Clarity/ELK에서 따로 보여줘야 한다.

---

## Slide 15. 운영 관측 근거: EC2/Grafana

장표 문구:
- 평균 CPU는 낮았지만, 스파이크는 있었다

시각 자료:
- master/worker1 CPU 평균과 P95를 비교하는 작은 막대 그래프
- worker1 100% maximum spike를 별도 callout

AWS CloudWatch 데이터:
- master EC2 CPU Average
  - 평균 4.26%
  - P95 5.09%
  - hourly average max 11.61% at 2026-04-29 12:00 KST
- master EC2 CPU Maximum
  - 평균 6.05%
  - P95 11.18%
  - max 53.66% at 2026-04-29 12:00 KST
- worker1 EC2 CPU Average
  - 평균 5.11%
  - P95 6.43%
  - hourly average max 30.11% at 2026-04-29 11:00 KST
- worker1 EC2 CPU Maximum
  - 평균 8.96%
  - P95 26.10%
  - max 100.00% at 2026-05-11 22:00 KST

Grafana/node_exporter sample:
- worker1 `CPU Basic > Busy System`: 평균 1.12%, P95 1.45%, 최대 5.98%
- worker1 `Memory Basic > Total`: 7.60 GiB
- worker1 `Disk Space Used Basic > /boot/efi`: 5.85%
- worker1 `Network Traffic Basic > Rx br-9b425f4d2008`: 평균 487.8 b/s, P95 1.84 kb/s, max 22.1 kb/s

출처:
- `presentation/master_cpu.tsv`
- `presentation/worker1_cpu.tsv`
- `presentation/grafana-csv-analysis.md`

주의:
- Grafana CSV는 각 패널의 일부 series만 export된 것이다.
- 이 데이터만으로 전체 pod CPU, 앱 latency, RDS 상태, 유저 수를 설명하면 안 된다.

발표자 노트:
- 평균 CPU는 낮았지만 spike가 있었고, 이런 순간을 보기 위해 모니터링이 필요했다.
- Grafana는 node-level health를 본 근거이고, CloudWatch는 AWS/ALB 레벨 관측 근거다.

---

## Slide 16. 릴리즈 diff로 본 진화

장표 문구:
- 유저를 붙잡는 기능과 운영 자동화가 늘어났다

시각 자료:
- 릴리즈 구간별 변경량 막대 그래프
- 각 막대 밑에 키워드 2개

데이터:
- `v1.0.0..v1.1.0`: 214 files, +27,109 / -1,130
- `v1.1.0..v2.0.0`: 13 files, +165 / -63
- `v2.0.0..v3.0.0`: 262 files, +22,567 / -1,525
- `v3.0.0..v3.1.0`: 89 files, +10,638 / -1,078
- `v3.1.0..HEAD`: 182 files, +4,558 / -1,319

키워드:
- v1.0 -> v1.1: 기본 런타임, 챕터/힌트/인프라 뼈대
- v1.1 -> v2.0: 안정화
- v2.0 -> v3.0: Lucas Survival, 챕터3/4, 분석, RAG
- v3.0 -> v3.1: 챕터4, 엔딩, 관리자, ELK, 미니게임 연결
- v3.1 -> HEAD: 누락 노드, BGM, URL injection 방지, 전이 무결성, 피드백성 수정

주의:
- SQL 제외 기준이다.

발표자 노트:
- 코드 변화량은 "무엇을 많이 만들었는가"를 보여주는 보조 지표다.
- 후반으로 갈수록 단순 기능 추가보다 유저 진행 검증, 운영 관측, 피드백 수정의 비중이 커졌다고 말한다.

---

## Slide 17. 유저가 실제로 쓰면 드러나는 어려움

장표 문구:
- 만들 때보다, 유저가 쓸 때 문제가 보였다

시각 자료:
- 문제 -> 영향 -> 처리 표

표 내용:
| 문제 | 유저 영향 | 처리 방향 |
| --- | --- | --- |
| 임의 URL/nodeId 접근 | 스토리 스킵/잘못된 노드 접근 | server latestNode + transition 검증 |
| 미니게임 포커스/새로고침 | clear 누락 또는 중복 clear | 세션/clear 처리 보강 |
| 터미널 오답 UX | 몰입 저하 | 오답 피드백/로그 처리 수정 |
| 챕터3 메모 힌트 누락 | 진행 막힘 | 힌트 복원 |
| LLM 지연/실패 | 막힌 유저 이탈 | fallback 힌트 |
| K8s/ELK 권한/PVC | 운영 관측 불안정 | 권한/스토리지 정리 |

발표자 노트:
- 이 장표는 기술 어려움 나열이 아니라 "유저 경험에 어떤 문제가 생겼고 어떻게 줄였는가"로 말한다.

---

## Slide 18. 결과: 얼마나 모였고, 무엇을 배웠나

장표 문구:
- 유저가 들어왔고, 막히는 지점이 보였고, 수정으로 이어졌다

시각 자료:
- KPI 4개 카드 + 병목 Top 3 + 처리 사례 3개

필요 데이터:
- GA4
  - active users: 75
  - new users: 79
  - views: 2,815
  - event count: 17,951
  - bounce rate: 11.37%
  - average engagement time per active user: 약 25분 48초
  - 추가 필요: sessions, engaged sessions, engagement rate, event breakdown, funnel
- Clarity
  - sessions: 134
  - bot sessions: 5
  - unique users: 61
  - sessions with new users: 78
  - sessions with returning users: 56
  - pages per session: 4.76
  - quick clicks: 7 sessions, 5.22%
  - dead clicks: 69 sessions, 51.49%
  - JavaScript errors: 3
  - performance score: 88.36
  - LCP: 0.524s
  - INP: 216ms
  - CLS: 0.007
  - 추가 필요: 주요 heatmap screenshot, recording issue screenshot
- 관리자 대시보드/ELK
  - raw logs: 167,608
  - structured game events: 9,476
  - user_id 기준 users: 159
  - action session keys: 159
  - success rate: 70.7%
  - fail rate: 28.2%
  - error rate: 1.1%
  - week01: 2,390 events, 151 users, success 89.7%, fail 7.1%
  - week02: 3,452 events, 54 users, success 61.4%, fail 38.2%
  - week03: 1,992 events, 22 users, success 74.7%, fail 24.7%
  - week04: 1,642 events, 7 users, success 57.6%, fail 42.3%, max fail count 34
  - 가장 많이 막힌 노드: `CH2_GC_SCAN_ALERT`, `CH2_LAPLACE_MISSION_READY`, `CH4_GATE_TRACE_VIEWED`, `CH2_FILE_LIST`
  - 반복 실패 유형: 오타, 파일 실행 위치 혼동, 경로 이동 혼동, SSH 접속 형식 혼동

현재 이미 넣을 수 있는 운영 근거:
- ALB requests: 150,503
- ALB 5xx rate: 0.0797%
- request-weighted response average: 0.0739s
- master CPU average: 4.26%
- worker1 CPU average: 5.11%
- GA4 active users: 75
- GA4 views: 2,815
- GA4 events: 17,951
- Clarity sessions: 134
- Clarity unique users: 61
- ELK raw logs: 167,608
- ELK structured game events: 9,476
- ELK users: 159
- ELK action session keys: 159

주의:
- 이 장표에서 ALB requests를 "유저 수"처럼 쓰면 안 된다.
- 유저 수는 GA4/관리자 대시보드의 unique user/session 기준으로 확정한다.
- GA4와 Clarity의 날짜 범위가 다르다. GA4는 2026-05-04 -> 2026-05-18, Clarity는 2026-05-01 -> 2026-05-18이다.
- Clarity 스마트 이벤트는 event count가 아니라 해당 이벤트가 발생한 session count로 읽는다.
- ELK 대표 수치는 `kibana.md` 기준 2026-04-30 05:19:29 -> 2026-05-18 08:09:16 UTC 범위다.
- `for_presentations.csv`의 5,729건은 더 좁은 부분 export이므로 대표 수치로 쓰지 않는다.
- ELK `session_id`는 일반적인 브라우저 세션과 완전히 같지 않을 수 있다. 발표에서는 action session key라고 표현한다.

발표자 노트:
- 결과 장표는 발표의 결론이므로 숫자가 확정된 뒤 마지막에 채운다.
- "많이 모였다"보다 "유저가 들어오자 어떤 운영 데이터가 생겼고 무엇을 고쳤는가"가 핵심이다.

---

## Slide 19. Demo

장표 문구:
- CH4 true ending demo

시각 자료:
- 데모 시작 화면
- 데모 동선 3단계만 표시

데모 순서:
1. 챕터4 진입
2. 핵심 단서/전이 1개
3. 진엔딩 또는 엔딩 직전 장면

발표자 노트:
- 전체 플레이를 보여주지 않는다.
- 앞 장표에서 말한 핵심 루프와 진행 무결성이 실제로 어떻게 보이는지만 짧게 보여준다.

---

## Slide 20. Closing

장표 문구:
- 게임은 목적이 아니라 유저를 얻기 위한 형태였다

시각 자료:
- 한 줄 흐름
- 기술 목표 -> 유저 필요 -> 챕터형 게임 -> 운영 데이터 -> 개선 루프

데이터:
- 결과 장표에서 사용한 핵심 숫자 1개만 재사용 가능
- 예: 150,503 requests 또는 총 active users

발표자 노트:
- 기술 목표를 검증하려면 실제 유저가 필요했다.
- 유저를 모으고 다시 오게 만들기 위해 챕터형 게임을 선택했다.
- 유저가 실제로 플레이하자 진행 검증, 데이터 수집, 힌트, 피드백 처리, 운영 리포트가 필요해졌다.
- 결과적으로 브라우저형 게임 경험을 통해 운영 가능한 서비스 구조를 만들었다.

---

# GA4 / Clarity 데이터를 주는 방법

## 권장 저장 위치

아래 폴더를 만들고 export 파일을 넣어주면 된다.

```text
presentation/analytics_data/
  ga4_daily_traffic.csv
  ga4_events.csv
  ga4_pages.csv
  ga4_funnel.csv
  clarity_overview.csv
  clarity_insights.csv
  clarity_heatmap_lobby.png
  clarity_heatmap_play_ch4.png
```

CSV/TSV/JSON 모두 처리 가능하지만, 차트와 집계를 만들려면 CSV가 가장 편하다. 스크린샷은 수치 계산보다는 장표 시각 자료로 쓰기 좋다.

## 날짜 범위

가능하면 AWS export와 같은 범위로 맞춘다.

- 권장: 2026-04-29 -> 2026-05-18
- GA4/Clarity가 중간에 도입됐다면 실제 수집 시작일 이후 범위만 export한다.
- GA4는 날짜 단위 export가 기본이므로 2026-04-29와 2026-05-18이 부분일 수 있음을 발표자 노트에 적는다.

## GA4 export 1: 일별 트래픽

용도:
- Slide 06, 18
- 챕터 공개 이후 유입 변화, 전체 유저/세션 결과

GA4 화면:
- Reports -> Acquisition -> Traffic acquisition 또는 User acquisition
- 날짜 범위 설정
- Export -> CSV

필요 컬럼:

```csv
date,active_users,new_users,sessions,engaged_sessions,engagement_rate,average_engagement_time,event_count
2026-05-04,0,0,0,0,0,0,0
```

GA4 UI 컬럼명이 다르면 그대로 export해도 된다. 내가 컬럼명을 보고 맞춰서 정리할 수 있다.

## GA4 export 2: 이벤트별 집계

용도:
- Slide 10, 11, 12, 18
- 힌트 요청, 챕터 시작/완료, 명령 제출, 버그 리포트 같은 행동 지표

GA4 화면:
- Reports -> Engagement -> Events
- 날짜 범위 설정
- Export -> CSV

필요 컬럼:

```csv
event_name,event_count,total_users,event_count_per_user
page_view,0,0,0
chapter_start,0,0,0
story_action,0,0,0
chapter_complete,0,0,0
hint_requested,0,0,0
bug_report_submitted,0,0,0
```

이벤트명이 위와 다르면 실제 이벤트명 그대로 주면 된다.

## GA4 export 3: 페이지/화면

용도:
- Slide 04, 05, 11, 18
- 유저가 많이 본 화면, 이탈 가능성이 큰 화면 파악

GA4 화면:
- Reports -> Engagement -> Pages and screens
- Primary dimension을 `Page path and screen class` 또는 `Page title and screen class`로 설정
- Export -> CSV

필요 컬럼:

```csv
page_path,views,active_users,views_per_user,average_engagement_time,event_count
/,0,0,0,0,0
/lobby,0,0,0,0,0
/play/chapter-4,0,0,0,0,0
```

## GA4 export 4: 퍼널

용도:
- Slide 11, 18
- 유저가 어디서 빠지는지 보여주는 핵심 자료

GA4 화면:
- Explore -> Funnel exploration

권장 step:
1. `session_start` 또는 첫 방문
2. `/lobby` 진입
3. `/play/*` 진입
4. `chapter_start`
5. `story_action`
6. `hint_requested` 또는 주요 병목 행동
7. `chapter_complete`

Export:
- CSV가 가능하면 `ga4_funnel.csv`
- CSV가 어렵다면 퍼널 화면 스크린샷도 가능

권장 컬럼:

```csv
step,step_name,users,completion_rate,abandonments,abandonment_rate
1,session_start,0,100,0,0
2,lobby,0,0,0,0
```

## Clarity export 1: Overview

용도:
- Slide 11, 18
- 유저가 얼마나 머물렀고 어떤 기기/페이지에서 문제가 있었는지 보조 설명

Clarity 화면:
- Dashboard 또는 Overview
- 날짜 범위 설정
- export가 가능하면 CSV, 아니면 스크린샷

필요 컬럼:

```csv
date,sessions,users,pages_per_session,average_active_time,scroll_depth
2026-05-04,0,0,0,0,0
```

Clarity가 날짜별 CSV를 제공하지 않으면 전체 기간 요약 수치만 텍스트로 줘도 된다.

## Clarity export 2: Insights / Friction

용도:
- Slide 11, 12, 17, 18
- dead click, rage click, quick back 같은 UX 문제를 보여줌

필요 컬럼:

```csv
issue_type,count,affected_sessions,top_page
dead_click,0,0,/play/chapter-4
rage_click,0,0,/lobby
quick_back,0,0,/
```

CSV export가 안 되면 Clarity dashboard의 Insights 화면 스크린샷을 주면 된다.

## Clarity export 3: Heatmap / Recording evidence

용도:
- Slide 04, 11, 17
- 유저가 실제로 어디를 클릭하고 어디서 헤맸는지 시각적으로 보여줌

권장 이미지:
- `clarity_heatmap_lobby.png`
- `clarity_heatmap_play_ch4.png`
- `clarity_recording_issue_example.png`

주의:
- 닉네임, 이메일, 토큰, 터미널 원문 입력, 버그 리포트 내용이 보이면 마스킹한 뒤 제공한다.
- 원본 recording 링크를 주는 것보다, 발표에 쓸 수 있는 마스킹된 스크린샷이 더 안전하다.

## 절대 보내지 말아야 할 값

- 닉네임 원문
- 이메일
- access token / refresh token
- user id/client id 전체 원문
- 터미널 raw command 전체
- 버그 리포트 제목/본문/첨부파일명
- Clarity recording에서 개인 식별 가능 화면

유저 단위 추적이 필요하면 원문 대신 해시 처리된 id 또는 aggregate count만 준다.

## 데이터가 들어오면 내가 할 수 있는 작업

- GA4 일별 유저/세션 추이 정리
- 챕터 공개일과 트래픽 피크 비교
- 이벤트별 행동 퍼널 작성
- 챕터별 완료율/이탈률 표 만들기
- 힌트 요청/실패 명령어 기반 병목 Top 3 정리
- Clarity dead click/rage click 기반 UX 문제 사례 정리
- 최종 Slide 18 결과 장표에 들어갈 확정 수치 선정
