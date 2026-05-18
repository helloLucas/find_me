# FIND ME / LUCAS presentation storyline draft

## 조사 기준

- SQL 파일은 읽지 않았다. 스토리 원문을 길게 끌고 오지 않고, 코드/문서/git 이력 중심으로 정리했다.
- 스토리 진행 무결성은 SQL 원문이 아니라 `StoryTransition` 엔티티, `StoryServiceImpl.processTransition`, transition repository 코드 기준으로 정리했다.
- 현재 작업트리의 추적 파일 기준 `git diff`는 비어 있다. 지금 보이는 차이는 `presentation/`, `b102_midterm.pdf` 같은 untracked 파일이다.
- 릴리즈 태그 간 변화량은 SQL 제외 기준으로 확인했다.
  - `v1.0.0..v1.1.0`: 214 files, +27,109 / -1,130
  - `v1.1.0..v2.0.0`: 13 files, +165 / -63
  - `v2.0.0..v3.0.0`: 262 files, +22,567 / -1,525
  - `v3.0.0..v3.1.0`: 89 files, +10,638 / -1,078
  - `v3.1.0..HEAD`: 182 files, +4,558 / -1,319

## 발표의 중심 문장

우리는 처음부터 게임 자체를 목표로 둔 것이 아니라, 실제 유저가 들어오는 서비스를 만들고 운영하면서 화면, 서버, 데이터, 배포, 모니터링, 피드백 개선을 끝까지 경험하고 싶었다. 그 기술 목표를 검증하려면 유저의 관심이 필요했고, 그 관심을 모으고 유지하기 위한 제품 형태로 매주 새로운 챕터가 열리는 브라우저형 게임을 선택했다.

## 권장 발표 순서

### 1. Cover: FIND ME / LUCAS

한 문장: "브라우저 안에 만든 조사형 OS, 그리고 실제 유저로 검증한 운영형 서비스"

보여줄 것:
- 어두운 터미널 톤의 첫 화면
- 실제 서비스 화면 또는 플레이 화면 한 장
- 기능 목록보다 "사용자가 사건에 들어간다"는 인상

### 2. 우리가 하고 싶었던 것: 실제 유저가 있는 기술 프로젝트

한 문장: "게임을 만들고 싶었던 것이 아니라, 실제 유저가 들어오는 서비스를 운영하면서 기술을 검증하고 싶었다."

핵심:
- 화면, 서버, DB, 배포, 모니터링, 장애 대응이 한 흐름으로 이어지는 서비스를 만들고 싶었다.
- 단순 구현물이 아니라, 배포 후 실제 트래픽과 유저 행동이 쌓이는 프로젝트가 필요했다.
- 로그, 지표, 피드백, 버그 리포트가 개발 방향을 다시 바꾸는 운영 경험을 목표로 했다.
- 그래서 유저가 한 번 보고 떠나는 페이지가 아니라, 반복해서 들어오고 행동을 남길 이유가 필요했다.

### 3. 문제: 기술 실험에는 유저가 필요했다

한 문장: "로그 모니터링, 인프라 운영, 트래픽 대응을 경험하려면 실제 유저가 필요했고, 유저가 돌아올 이유가 필요했다."

비교:
- 일반 기능 시연: 한 번 보고 끝나기 쉽고, 트래픽과 피드백이 충분히 쌓이지 않는다.
- 단순 포트폴리오 페이지: 운영 지표, 장애 대응, 유저 리텐션을 검증하기 어렵다.
- 매주 열리는 챕터형 게임: 공개 일정이 관심을 만들고, 플레이가 반복 행동과 피드백을 만든다.
- 게임은 목적이 아니라, 유저를 모으고 붙잡아 기술 목표를 검증하기 위한 수단이었다.

### 4. 유저를 끌어들이는 형태: 웹을 게임처럼 보이게 하기

한 문장: "유저가 기술 데모를 보는 것이 아니라, 사건에 들어와 조작하고 있다고 느끼게 만들었다."

구현 방향:
- 평범한 페이지 목록 대신 브라우저, 터미널, 메신저, 문서 뷰어가 있는 가상 OS를 첫 경험으로 제공했다.
- 유저는 설명을 읽는 사람이 아니라 명령을 입력하고, 문서를 찾고, 탭을 이동하고, 단서를 조합하는 사람이 된다.
- UI 상태 변화는 스토리 연출이면서 동시에 유저 행동을 서버에 남기는 입력 지점이다.

근거:
- `frontend/src/features/Browser/index.tsx`: 브라우저 탭, 미니게임 탭, 히스토리/문서/검색 흐름
- `frontend/src/widgets/Desktop`: 가상 데스크톱과 윈도우 기반 플레이
- `frontend/src/features/command-input`: 터미널 명령 입력과 피드백

### 5. 유저가 계속 움직이는 핵심 루프

한 문장: "단서 확인 -> 행동 입력 -> 서버 판정 -> 화면 변화 -> 보상/실패 피드백 -> 다음 행동이 반복된다."

흐름:
1. 유저가 현재 챕터/노드에 진입한다.
2. 브라우저, 메신저, 문서, 사운드, 컷신이 현재 상황을 보여준다.
3. 유저가 명령, 클릭, 조사 행동을 수행한다.
4. 서버는 유저의 저장된 진행 상태를 기준으로 행동이 가능한지 판정한다.
5. 허용된 행동이면 다음 노드, fragment, 문서, 미니게임, 엔딩 조건으로 이어진다.
6. 잘못된 행동이면 오답 피드백, FAIL 노드, retry, 힌트 요청 가능 상태로 돌아간다.
7. 모든 행동은 이후 힌트, 운영 리포트, 병목 분석에 활용될 수 있는 데이터가 된다.

### 6. 반복 방문 장치: 매주 열리는 챕터와 미니게임

한 문장: "챕터와 미니게임은 유저를 붙잡기 위한 콘텐츠이자, 실제 트래픽과 피드백을 만들기 위한 장치였다."

진화:
- CH1: PACMAN: NEO로 첫 보상 경험을 만들고, 유저가 조작 가능한 서비스라는 인상을 줬다.
- CH2: CORE TIMING으로 타이밍 판정과 fragment 보상을 연결했다.
- CH3: CYBER PACKET DASH로 캔버스 기반 조작, 전체화면, 포커스, 장시간 플레이 성능 이슈를 다뤘다.
- CH4: LUCAS ROUTE로 히든 전이와 엔딩 조건을 연결해 유저 선택의 결과를 만들었다.
- ARCADE/PRACTICE: LUCAS SURVIVAL로 본편 밖에서도 반복 플레이할 이유를 만들었다.

git 근거:
- `StarforceTab.tsx`: `feat: 스타포스 추가` -> `feat: 아케이드 모드 추가` -> `feat: 미니게임에 해시 추가` -> BGM 수정
- `CyberPacketDashTab.tsx`: 미니게임 추가 -> BGM/전체화면/포커스/장시간 성능/중복 clear 수정
- `lucas-route`, `lucas-survival`: 챕터4 미니게임 추가 -> 난이도/아이콘 -> 히든 전이 -> BGM/포커스/빌드 수정

### 7. 유저 경험을 흔들지 않는 화면 런타임

한 문장: "서버 응답이 복잡해져도 유저 화면은 자연스럽게 바뀌도록, 게임 화면을 하나의 런타임처럼 구성했다."

구현 방향:
- 윈도우, 태스크바, 브라우저, 메신저, 터미널을 독립된 화면 상태로 관리했다.
- 서버의 output bundle을 UI 상태로 변환하는 adapter를 두어 스토리 데이터 변화가 화면 전체를 흔들지 않게 했다.
- 유저가 탭을 이동하거나 명령을 입력해도 현재 맥락이 끊기지 않도록 상태를 분리했다.
- GA4/Clarity 이벤트와 동의 배너를 통해 유저 행동 추적 기반을 마련했다.

기술 근거:
- React 19, Vite, Zustand, React Router
- output bundle adapter
- 브라우저/메신저/터미널/미니게임 탭 구조

### 8. 유저 진행을 서버가 책임지는 전이 구조

한 문장: "유저가 어디까지 왔는지는 화면이 아니라 서버의 진행 상태와 허용된 전이 그래프가 결정한다."

구현 방향:
- 유저별 진행 상태와 최근 행동을 저장해, 재접속하거나 잘못된 요청을 보내도 현재 위치를 서버가 판단한다.
- `story_nodes`와 `story_transitions`를 상태 머신처럼 사용해 현재 노드에서 허용된 다음 노드만 이동하게 했다.
- `from_node_id`, `to_node_id`, `action_type`, `expected_input`, `validator_type`, `validator_config`, `priority`로 전이 조건을 데이터화했다.
- 터미널, VFS, fragment, 미니게임 clear 상태를 진행 판정과 연결했다.

git/code 근거:
- `StoryServiceImpl.java`: 챕터별 VFS 런타임 공통화, 챕터3 서버 룰, 챕터4 mount/root/ending, 챕터 해시, 터미널 흐름 검증 강화
- Redis 기반 진행 상태 및 recent action

### 9. 유저 악용을 막는 진행 무결성

한 문장: "유저가 URL, 브라우저 상태, 임의 요청으로 스토리를 건너뛰거나 보상을 위조하지 못하게 진행 경로를 서버에서 제한했다."

근거:
- `StoryTransition`은 `fromNode -> toNode` 관계와 action/input/validator 조건을 가진다.
- `StoryServiceImpl.processTransition`은 유저 진행 기록의 `latestNode`에서 출발하는 transition만 조회한다.
- 매칭 transition이 없으면 터미널 fallback을 시도하고, 그래도 처리할 수 없으면 `Transition not allowed`로 막는다.
- 클라이언트가 요청에 nodeId를 보내더라도 서버의 진행 상태가 기준이므로, 특정 노드 URL이나 임의 요청만으로 다음 노드에 접근하는 흐름을 만들지 않는다.
- 미니게임 시작 세션과 fragment 획득을 서버 API로 묶고, 본편 전이는 미니게임 clear와 별도로 다시 검증한다.

말할 포인트:
- `story_node.sql`과 `transition.sql`에 담긴 데이터는 "페이지 목록"이 아니라 "허용된 진행 그래프"다.
- 특정 노드에서 가능한 다음 노드와 액션 조건을 제한해 무분별한 스토리 스킵, 잘못된 접근, 버그 악용을 막으려 했다.
- 실패 전이는 FAIL 노드나 retry 응답으로 처리해 유저에게 피드백을 주되, 정상 진행 상태와 분리했다.
- 포커스/새로고침/중복 clear처럼 유저가 실제로 겪을 수 있는 문제도 후반에 수정했다.

관련 이력:
- `feat: 미니게임에 해시 추가`
- `feat: 챕터 해시 백엔드 추가`
- `feat: 미니게임 백엔드 업데이트 세션 관리 추가`
- `feature/be-prevent-minigame-url-injection`

### 10. 막힌 유저를 놓치지 않는 힌트

한 문장: "AI 힌트는 정답을 뿌리는 기능이 아니라, 막힌 유저가 이탈하기 전에 다시 움직이게 하는 장치였다."

구현 방향:
- 현재 노드, 실패 횟수, 유저 질문을 바탕으로 실시간 힌트를 생성한다.
- 힌트 강도는 실패 횟수에 따라 LIGHT/MEDIUM/STRONG으로 조절한다.
- LLM이 실패해도 서버 템플릿 fallback으로 유저에게 빈 응답을 주지 않는다.
- Mattermost 힌트 worker가 Elasticsearch 로그에서 병목 노드를 찾고, 루카스 페르소나의 간접 힌트를 생성한다.

근거:
- `POST /api/v1/hints/live`
- AI orchestrator: query embedding, PGVector retrieval, LLM hint generation
- Mattermost 힌트 flow 문서

### 11. 유저 행동을 제품 개선 데이터로 바꾸기

한 문장: "유저의 실패, 이탈, 힌트 요청, 버그 제보가 다음 개발 우선순위를 정하는 데이터가 되게 했다."

볼 지표:
- 총 참여 유저
- 총 액션 수
- 평균 플레이 시간
- 성공률
- 이탈률
- 주요 병목 노드
- 실패 명령어
- 힌트 요청 수
- 버그 리포트 수

근거:
- Admin dashboard response: totalUsers, activeUsers24h, chapter completion, avgHoursToChapterComplete
- ES analytics response: totalEvents, success/fail/error, hintRequested, uniqueUsers, uniqueSessions, bottlenecks, failCommands
- Mattermost report flow: 1일/7일 비교, 실패 5회 이상 + 성공률 50% 미만 자동 경고
- GA4/Clarity: 챕터 선택, 명령 제출, 버그 리포트 제출, 화면 노출 이벤트

주의:
- 실제 발표 수치는 운영 DB, GA4, Clarity, ELK, Mattermost 리포트에서 확정해야 한다. SQL 백업을 근거로 숫자를 단정하지 않는다.

### 12. 유저가 몰려와도 볼 수 있는 운영 인프라

한 문장: "배포가 끝이 아니라, 유저가 들어온 뒤 서비스가 어떻게 버티고 어디서 문제가 생기는지 볼 수 있게 만드는 것이 목표였다."

진화:
1. 로컬/단일 서버 실행
2. Jenkins CI/CD와 Docker 이미지 배포
3. Kubernetes dev/prod 네임스페이스와 Ingress
4. replica, RollingUpdate, HPA, PDB, readiness/liveness probe
5. ELK로 유저 행동과 애플리케이션 로그 수집
6. Prometheus/Grafana/Loki로 노드와 서비스 상태 관측
7. Mattermost 운영 리포트와 힌트 자동화

git/docs 근거:
- `feature/infra-cicd`, `hotfix/infra-cicd`
- `docs/infra/cicd_pipeline_info.md`
- `docs/infra/k8s/k8s-scaleout-report.ko.md`
- `docs/infra/elk_implementation_status.md`
- `docs/infra/monitoring_setup_guide.md`

Grafana CSV 근거:
- `presentation/dashboard-1779069926489.json`은 CloudWatch가 아니라 Prometheus/node_exporter 기반 `Node Exporter Full` 대시보드다.
- export된 CSV는 `worker1` 노드의 단일 시리즈 샘플이다.
- `CPU Basic > Busy System`: 평균 1.12%, P95 1.45%, 최대 5.98%.
- `Memory Basic > Total`: 7.60 GiB로 일정.
- `Disk Space Used Basic > /boot/efi`: 5.85%로 일정.
- 이 데이터는 노드 레벨 관측 체계의 근거로 쓰되, 애플리케이션 요청량/유저 수/AWS 관리형 서비스 상태를 설명하는 자료로 쓰면 안 된다.

AWS CloudWatch TSV 근거:
- `alb_request_count.tsv`: 2026-04-29 09:00 -> 2026-05-18 12:00 동안 총 150,503 requests.
- `alb_response_time.tsv`: request-weighted target response average 약 0.0739s.
- `alb_5xx.tsv`: ALB-generated 5xx 총 120건, 요청 대비 약 0.0797%.
- `master_cpu.tsv`: EC2 CPU 평균 4.26%, P95 5.09%, 최대 hourly average 11.61%.
- `worker1_cpu.tsv`: EC2 CPU 평균 5.11%, P95 6.43%, 최대 hourly average 30.11%. 단, hourly maximum 기준 2026-05-11 22:00에 100% spike가 있었다.
- 이 수치는 "외부 트래픽이 있었고 ALB/EC2 레벨 관측을 했다"는 근거다. 사용자 수, 챕터 완료율, 앱 내부 오류율은 별도 로그/관리자 대시보드/ELK로 설명해야 한다.

### 13. 릴리즈 diff로 본 진화

한 문장: "코드 변화량도 유저를 붙잡는 기능, 운영 자동화, 챕터4 완성으로 무게중심이 이동한 것을 보여준다."

구성:
- v1.0 -> v1.1: 기본 런타임, 챕터/힌트/인프라 뼈대가 크게 증가
- v1.1 -> v2.0: 작은 안정화 구간
- v2.0 -> v3.0: Lucas Survival 에셋, 챕터3/4, 분석, RAG가 크게 증가
- v3.0 -> v3.1: 챕터4, 엔딩, 관리자, ELK, 미니게임 연결 강화
- v3.1 -> HEAD: 챕터4 흐름 검증, 누락 노드, BGM, URL injection 방지, 전이 무결성 보강, 피드백성 수정

슬라이드 시각화:
- 막대 그래프 5개
- 아래에 각 구간의 핵심 키워드 2-3개만 표시

### 14. 유저가 실제로 쓰면 드러나는 어려움

한 문장: "어려움은 만들 때보다 유저가 직접 들어와 플레이하고, 막히고, 새로고침하고, 우회하려고 할 때 더 많이 드러났다."

사례:
- 스토리 데이터 구조가 커지며 화면 상태가 서버 응답 형태에 과하게 흔들릴 위험
- 유저가 임의 URL, nodeId, 잘못된 액션으로 스토리 순서를 건너뛰거나 잘못된 노드에 접근할 위험
- 터미널 UX에서 오답 피드백이 몰입을 깨는 문제
- 미니게임 clear, fragment, story transition 순서 동기화
- 미니게임 장시간 플레이, 포커스 이탈, 새로고침, 중복 clear 문제
- K8s 하이브리드 네트워크와 Ingress/도메인 정리
- ELK PVC, EBS CSI 권한, Elasticsearch 권한 이슈
- LLM 지연/실패가 막힌 유저의 실시간 플레이 UX에 미치는 영향

### 15. 피드백은 어떻게 처리했나

한 문장: "피드백은 버그 리포트, 행동 로그, 운영 리포트, 커밋 수정으로 이어지는 루프를 만들었다."

근거:
- 인게임 버그 리포트: multipart + 첨부파일 + 관리자 메일 발송
- GA4/Clarity: 챕터 선택, 명령 제출, 버그 리포트 제출, 화면 노출 이벤트
- 커밋 예시:
  - 터미널 오답 로그가 사라지는 UX 수정
  - 챕터3 사라진 메모 힌트 복원
  - 미니게임 포커스/새로고침/중복 clear 수정
  - 챕터4 awkward dialogue, 누락 노드, 전이 검증 강화
  - 잘못된 접근은 `Transition not allowed`, FAIL 노드, retry 응답, recent-action 기록으로 남겨 힌트/운영 분석에 활용

### 16. 결과 슬라이드

한 문장: "얼마나 모였고, 어디서 막혔고, 어떤 개선으로 이어졌는지를 숫자와 사례로 닫는다."

채울 숫자:
- 총 방문/참여 유저
- 회원/게스트 비율
- 챕터별 완료율
- 평균 플레이 시간
- 힌트 요청 수
- 버그 리포트 수
- 가장 많이 막힌 노드 3개
- 처리한 피드백 사례 3개

주의:
- 이 슬라이드는 지금 저장소 분석만으로 채우면 안 된다. 관리자 대시보드, GA4, Clarity, ELK, Mattermost 리포트에서 발표 전 수치를 확정한다.

### 17. 데모 순서

한 문장: "발표 흐름과 같은 순서로 짧게 보여준다."

시연: 챕터 4 진엔딩 보여줄거임.

### 18. Closing

한 문장: "FIND ME는 게임을 목적으로 만든 프로젝트가 아니라, 유저가 있는 서비스를 만들고 운영하기 위해 게임이라는 형태를 선택한 프로젝트다."

닫는 메시지:
- 기술 목표를 검증하려면 실제 유저가 필요했다.
- 유저를 모으고 다시 오게 만들기 위해 챕터형 게임을 선택했다.
- 유저가 실제로 플레이하자 진행 검증, 데이터 수집, 힌트, 피드백 처리, 운영 리포트가 필요해졌다.
- 결과적으로 브라우저형 게임 경험을 통해 운영 가능한 서비스 구조를 만들었다.

## 현재 슬라이드에서 바꿔야 할 점

- 기존 초안은 목차가 맞아도 근거가 약하다. 각 섹션에 git/doc/code 근거를 붙여야 한다.
- "프론트엔드 구현", "백엔드 구현"처럼 기술 계층으로 나누지 말고, 유저가 겪는 기능과 그 기능을 가능하게 한 구현 방향으로 나눠야 한다.
- "인프라가 주차마다 발전했다"는 말을 추상적으로 하지 말고 CI/CD -> K8s -> scaleout -> ELK/monitoring -> Mattermost 순서로 보여줘야 한다.
- "유저가 얼마나 모였는가"는 TBD를 남기되, 어떤 시스템에서 숫자를 뽑을지 명확히 적어야 한다.
- 미니게임은 단순 갤러리보다 "관심 유지 -> 보상 -> 무결성 -> 히든 엔딩"의 진화로 보여주는 편이 설득력이 있다.
- 어려움 파트는 기술 이슈 나열이 아니라 사용자 경험에 어떤 영향을 줬고 어떤 수정으로 이어졌는지를 보여줘야 한다.
