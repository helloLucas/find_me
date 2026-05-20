# FIND ME / LUCAS 발표 장표 가이드

기준 문서: `presentation/storyline-draft.md`

## 장표 작성 원칙

- 장표 안 글자는 최소화한다. 큰 문장 1개, 키워드 3-4개, 숫자 1-3개 정도만 둔다.
- 설명은 발표자 노트로 뺀다.
- "프론트엔드 구현", "백엔드 구현"처럼 계층별로 나누지 않는다. 유저가 겪는 기능과 그 기능을 가능하게 한 구현 방향으로 설명한다.
- CloudWatch, Grafana, Kibana, GA4, Clarity 수치는 서로 의미가 다르다. 유저 수, HTTP 요청 수, raw log 수, 게임 이벤트 수를 섞지 않는다.

## 전체 흐름

1. 기술 목표가 먼저였다.
2. 기술 목표를 검증하려면 실제 유저가 필요했다.
3. 유저를 모으고 붙잡기 위한 수단으로 게임을 선택했다.
4. 유저가 실제로 플레이하자 진행 무결성, 로그 수집, 힌트, 피드백 자동화, 운영 인프라가 필요해졌다.
5. 마지막에는 실제 지표와 개선 사례로 닫는다.

---

## Slide 01. Cover

장표 문구:
- FIND ME / LUCAS
- 실제 유저로 검증한 운영형 브라우저 서비스

시각 자료:
- 서비스 첫 화면 또는 가상 OS 플레이 화면

발표자 노트:
- 게임 자체가 목적이 아니었다.
- 실제 유저가 들어오는 서비스를 만들고 운영하는 경험이 먼저였다.
- 게임은 유저의 관심을 모으고 유지하기 위한 제품 형태였다.

---

## Slide 02. 우리가 하고 싶었던 것

장표 문구:
- 실제 유저가 있는 기술 프로젝트

한 문장:
- 실제 유저가 들어오는 서비스를 운영하면서, 유저 피드백을 반영하고 트래픽에 따라 대응하는 서버를 경험하고 싶었다.

시각 자료:
- 화면 -> 서버 -> 데이터 -> 배포 -> 모니터링 -> 피드백 루프

발표자 노트:
- 단순 구현물이 아니라 배포 이후에도 판단과 개선이 필요한 프로젝트가 목표였다.
- 로그, 지표, 피드백, 버그 리포트가 개발 방향을 다시 바꾸는 운영 경험을 만들고 싶었다.

---

## Slide 03. 문제: 기술 실험에는 유저가 필요했다

장표 문구:
- 유저 없이는 검증도 없다

한 문장:
- 로그 모니터링, 인프라 운영, 트래픽 대응을 경험하려면 실제 유저가 필요했고, 유저가 돌아올 이유가 필요했다.

시각 자료:
- 일반 기능 시연: 1회성
- 챕터형 게임: 재방문, 행동 로그, 피드백

발표자 노트:
- 혼자 누르는 테스트로는 운영 데이터가 충분히 쌓이지 않는다.
- 챕터형 게임은 공개 일정과 보상으로 재방문 이유를 만들었다.

---

## Slide 04. 유저를 끌어들이는 형태

장표 문구:
- 기술 데모가 아니라 사건에 들어온 느낌

한 문장:
- 유저가 기술 데모를 보는 것이 아니라, 사건에 들어와 조작하고 있다고 느끼게 만들었다.

시각 자료:
- 가상 OS 화면 캡처
- 브라우저, 터미널, 메신저, 문서 뷰어 라벨

근거:
- `frontend/src/features/Browser/index.tsx`
- `frontend/src/widgets/Desktop`
- `frontend/src/features/command-input`

발표자 노트:
- 유저는 설명을 읽는 사람이 아니라 명령을 입력하고 단서를 조합하는 사람이 된다.
- UI 상태 변화는 스토리 연출이면서 서버에 남는 유저 행동 입력이다.

---

## Slide 05. 반복 방문 장치

장표 문구:
- 매주 열리는 챕터와 미니게임

한 문장:
- 챕터형 게임은 유저를 붙잡기 위한 콘텐츠이자, 유저의 재접속을 유도하는 전략이었다.

시각 자료:
- CH1 -> CH2 -> CH3 -> CH4 -> ARCADE 타임라인

내용:
- CH1: PACMAN: NEO
- CH2: CORE TIMING
- CH3: CYBER PACKET DASH
- CH4: LUCAS ROUTE
- ARCADE/PRACTICE: LUCAS SURVIVAL

발표자 노트:
- 미니게임은 장식이 아니라 보상, fragment, 히든 전이, 엔딩 조건과 연결된 리텐션 장치였다.

---

## Slide 06. 포트폴리오 영상 + 챕터 4 이전 줄거리

장표 문구:
- 화면은 하나의 런타임처럼 동작했다

한 문장:
- 서버 응답이 복잡해져도 유저 화면은 자연스럽게 바뀌도록, 게임 화면을 하나의 런타임처럼 구성했다.

시각 자료:
- 포트폴리오 영상
- 챕터 4 진입 전 줄거리 3줄

발표자 노트:
- 모든 스토리를 설명하지 않는다.
- 챕터 4 진엔딩 시연을 이해할 만큼의 맥락만 제공한다.
- 브라우저/터미널/메신저/문서/미니게임이 같은 진행 상태를 공유한다.

---

## Slide 07. 실시간 시연

장표 문구:
- 챕터 4 진엔딩

한 문장:
- 유저가 어디까지 왔는지는 화면이 아니라 서버의 진행 상태와 허용된 전이 그래프가 결정한다.

시연 순서:
- 챕터 4 진입
- 브라우저와 메신저 단서 확인
- 터미널 명령 입력
- Lucas Route 또는 관련 전이 확인
- 진엔딩 도달

발표자 노트:
- 시연은 짧게 끝낸다.
- 이후 기능 설명에서 방금 본 흐름이 어떻게 서버 검증, 로그, 힌트, 운영 데이터로 연결되는지 설명한다.

---

## Slide 08. 진행 무결성

장표 문구:
- URL을 바꿔도 진행은 건너뛸 수 없다

한 문장:
- 유저가 URL, 브라우저 상태, 임의 요청으로 스토리를 건너뛰거나 보상을 위조하지 못하게 진행 경로를 서버에서 제한했다.

시각 자료:
- latestNode -> allowed transitions -> validator -> nextNode

근거:
- `StoryTransition`: `fromNode -> toNode`, `actionType`, `expectedInput`, `validatorType`, `validatorConfig`
- `StoryServiceImpl.processTransition`: 유저의 `latestNode`에서 출발하는 transition만 조회
- `Transition not allowed`

발표자 노트:
- `story_node.sql`과 `transition.sql`은 페이지 목록이 아니라 허용된 진행 그래프다.
- 실패한 요청도 recent action으로 남겨 힌트와 운영 분석에 활용했다.

---

## Slide 09. 로그 수집

장표 문구:
- 유저 행동과 인프라 상태를 분리해서 본다

한 문장:
- 유저 행동과 인프라 상태를 같은 말로 섞지 않고, 목적별로 나눠서 관측했다.

시각 자료:
- CloudWatch / Grafana / Loki / ELK / GA4 / Clarity 구분도

구성:
- CloudWatch / ALB: 외부 HTTP 요청, 응답 시간, ALB 5xx
- Prometheus / Grafana: node_exporter 기반 노드 CPU, 메모리, 디스크
- Loki: Kubernetes와 외부 서버 로그 관측 보조
- Filebeat / Logstash / Elasticsearch / Kibana: 컨테이너 로그와 게임 이벤트 분석
- GA4 / Clarity: 브라우저 사용성, 세션, 프론트 이벤트

주의:
- ALB 150,503 requests는 유저 수가 아니라 HTTP 요청 수다.
- ELK raw logs 167,608건은 컨테이너 stdout/stderr 원천 로그 수다.
- 실제 플레이 분석은 구조화 게임 이벤트 9,476건 기준으로 말한다.

---

## Slide 10. 막힌 유저를 놓치지 않는 힌트

장표 문구:
- 정답 제공이 아니라 이탈 방지

한 문장:
- AI 힌트는 정답을 뿌리는 기능이 아니라, 막힌 유저가 이탈하기 전에 다시 움직이게 하는 장치였다.

시각 자료:
- 현재 노드 + 실패 횟수 + 유저 질문 -> RAG -> 힌트

근거:
- `POST /api/v1/hints/live`
- PGVector retrieval
- LLM hint generation
- fallback template

발표자 노트:
- 후반에는 응답 필드를 줄이고 `hint_text`, `hint_level` 중심으로 경량화했다.
- 핵심은 맞혀주는 AI가 아니라 유저가 다시 시도하게 만드는 운영 장치다.

---

## Slide 11. 피드백 자동화

장표 문구:
- 로그 분석 -> 힌트 생성 -> Mattermost 공유

한 문장:
- 유저의 실패, 이탈, 힌트 요청, 버그 제보가 다음 개발 우선순위를 정하는 데이터가 되게 했다.

시각 자료:
- ELK -> hint-worker -> Gemini/RAG -> Mattermost -> fix

발표자 노트:
- 실시간 RAG 힌트는 한 유저가 지금 막힌 문제를 돕는 장치다.
- Mattermost 힌트/리포트는 운영자가 전체 병목을 보고 콘텐츠를 개선하기 위한 장치다.

---

## Slide 12. 운영 인프라

장표 문구:
- 배포에서 운영 관측으로

한 문장:
- 배포가 끝이 아니라, 유저가 들어온 뒤 서비스가 어떻게 버티고 어디서 문제가 생기는지 볼 수 있게 만드는 것이 목표였다.

시각 자료:
- Jenkins -> K8s -> HPA/Probe -> Observability

구성:
- Jenkins CI/CD
- ALB / Ingress / Service
- EC2 기반 self-managed Kubernetes
- HPA / readiness probe / liveness probe / PDB
- Prometheus / Grafana / Loki / ELK / Mattermost

주의:
- Argo CD는 실제 사용한 것이 아니라 도입 시 개선점으로만 언급한다.
- HPA는 노드를 늘리는 기능이 아니라 Deployment replica를 조정하는 기능이다.

---

## Slide 13. 시스템 아키텍처

장표 문구:
- 유저 경험에서 운영 데이터까지 한 흐름

한 문장:
- 유저 경험에서 운영 데이터까지 한 흐름으로 연결했다.

시각 자료:
- Browser Runtime -> Routing -> Spring Boot Runtime -> Data Layer -> Ops Layer

내용:
- Browser Runtime: 가상 OS, 터미널, 메신저, 브라우저, 미니게임
- Routing: ALB Ingress, Nginx/NodePort, Kubernetes Service
- Spring Boot Runtime: 스토리 전이, 터미널 판정, 진행 상태, 미니게임 검증
- Data Layer: PostgreSQL, Redis, PGVector
- Ops Layer: ELK, Grafana, GA4, Clarity, Mattermost report

---

## Slide 14. 유저 리포트를 통한 개선

장표 문구:
- 보고 끝낸 것이 아니라 수정으로 연결했다

한 문장:
- 유저가 실제로 쓰면서 드러난 불편을 로그, 리포트, 커밋 수정으로 연결했다.

개선 사례:
- 챕터가 어려워지면서 챕터 2에서 실패율이 올라간 것을 확인했다. 이후 CLI 입력 줄에 `Tab` 자동완성 기능을 도입해 사용자의 명령어 입력 부담을 줄였고, 챕터 2 실패율 38.2%에서 챕터 3 실패율 24.7%로 낮아졌다. 이는 13.5%p 감소, 상대 기준 약 35.3% 감소다.
- 몰입을 위해 도입한 기사 글리치 연출이 일부 환경에서 버퍼링을 유발해 오히려 사용자 경험을 해치는 문제가 있었다. 이를 렌더링과 상태 갱신 부담을 줄이는 방향으로 최적화했다.
- 무분별한 영어 사용이 페이지에 대한 사용자의 이해를 떨어뜨렸다. i18n을 도입하고 주요 문구를 한글로 변환해 사용자 경험을 개선했으며, 이후 다국적 접근에 대한 확장성도 확보했다.

근거:
- `feature/be-update-tab-functionality-on-terminal`
- `fix: 기사 노드 이동 조건 및 렌더링 성능 개선`
- `style: friend -> 친구로 변경`
- `fix: 최소화된 창(터미널, 개발자 도구)이 클릭 이벤트를 가로채는 버그 수정`
- `frontend/src/app/store/windowStore.ts`

---

## Slide 15. 성적: CloudWatch / Grafana

장표 문구:
- 트래픽은 있었고, 지속 CPU 병목은 아니었다

시각 자료:
- KPI 카드 6개

사용할 수치:
- ALB requests: 150,503
- Peak hour: 3,467 requests/hour, 시간평균 약 0.96 RPS
- ALB-generated 5xx: 120, 0.0797%
- Request-weighted target response average: 약 74ms
- master EC2 CPU average: 4.26%
- worker1 EC2 CPU average: 5.11%

주의:
- ALB requests는 유저 수가 아니다.
- Grafana CSV는 worker1 일부 series export이므로 전체 앱 성능으로 과장하지 않는다.

---

## Slide 16. 성적: Kibana

장표 문구:
- 원천 로그와 게임 이벤트를 분리했다

시각 자료:
- KPI 카드 6개 + 병목 노드 Top 3

사용할 수치:
- ELK raw logs: 167,608
- ELK structured game events: 9,476
- ELK users: 159
- SUCCESS / FAIL / ERROR: 6,698 / 2,675 / 103
- command action: 7,182, 전체의 75.8%
- 주요 병목: `CH2_GC_SCAN_ALERT`, `CH2_LAPLACE_MISSION_READY`, `CH4_GATE_TRACE_VIEWED`

주의:
- raw logs는 유저 행동 수가 아니다.
- 실제 플레이 분석은 구조화 게임 이벤트 기준으로 말한다.

---

## Slide 17. 성적: GA4 / Clarity

장표 문구:
- 브라우저에서 실제 사용 흔적을 확인했다

시각 자료:
- GA4/Clarity KPI 카드

사용할 수치:
- GA4 active users: 75
- GA4 new users: 79
- GA4 views: 2,815
- GA4 event count: 17,951
- GA4 average engagement time per active user: 약 25분 48초
- GA4 bounce rate: 11.37%
- Clarity sessions: 134
- Clarity unique users: 61
- Clarity pages/session: 4.76
- Clarity dead clicks: 69 sessions, 51.49%
- Clarity quick clicks: 7 sessions, 5.22%
- Clarity bug_report_submitted: 1

주의:
- GA4/Clarity는 동의와 스크립트 로딩의 영향을 받는 프론트 분석 데이터다.
- ALB 15만 요청과 직접 비교해 수집 허용 비율로 해석하면 안 된다.

---

## Slide 18. 마무리

장표 문구:
- 게임으로 유저를 모으고, 운영 데이터로 서비스를 검증했다

한 문장:
- FIND ME는 게임을 목적으로 만든 프로젝트가 아니라, 유저가 있는 서비스를 만들고 운영하기 위해 게임이라는 형태를 선택한 프로젝트다.

닫는 메시지:
- 기술 목표를 검증하려면 실제 유저가 필요했다.
- 유저를 모으고 다시 오게 만들기 위해 챕터형 게임을 선택했다.
- 유저가 실제로 플레이하자 진행 검증, 데이터 수집, 힌트, 피드백 처리, 운영 리포트가 필요해졌다.
- 결과적으로 브라우저형 게임 경험을 통해 운영 가능한 서비스 구조를 만들었다.
