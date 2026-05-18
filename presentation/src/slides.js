export const slides = [
  {
    section: "BOOT",
    title: "FIND ME",
    accentTitle: "LUCAS",
    subtitle: "Browser game x Live ops",
    command: "npm run dev -- --host 0.0.0.0",
    layout: "cover",
    tags: ["GAME", "RUNTIME", "OPS", "DATA"],
    notes: `첫 장에서는 설명을 줄이고 톤만 잡는다.

말할 내용:
우리가 만든 것은 단순 웹사이트가 아니라 브라우저 안에서 사용자가 직접 조사하고 실패하고 다시 시도하는 게임형 경험이었다.
이 프로젝트의 핵심은 "관심을 만들기 위한 게임"과 "그 게임을 운영하기 위한 인프라/로그/피드백 루프"다.`,
  },
  {
    section: "GOAL",
    title: "목표",
    subtitle: "우리가 진짜 해보고 싶었던 것",
    command: "grep -n 'monitoring infra traffic' goal.md",
    layout: "signal",
    signal: "운영 경험",
    chips: ["LOG", "INFRA", "TRAFFIC"],
    notes: `기술적으로 하고 싶었던 경험은 로그 모니터링, 인프라 관리, 트래픽 대응이었다.

그런데 이런 경험은 사용자가 실제로 들어오지 않으면 할 수 없다.
그래서 "사람들이 들어와서 계속 만지고 싶어 하는 서비스"가 필요했고, 그 수단으로 게임을 선택했다.

이 장에서는 "게임을 만들고 싶었다"가 아니라 "운영해볼 수 있는 서비스를 만들기 위해 게임이 필요했다"는 순서로 말한다.`,
  },
  {
    section: "WHY_GAME",
    title: "수단",
    subtitle: "관심을 만들기 위한 선택",
    command: "diff service game",
    layout: "signal",
    signal: "게임",
    chips: ["ATTENTION", "RETRY", "REWARD"],
    notes: `설명형 서비스만 만들면 세계관과 기술 요소를 이해하기 전에 이탈할 가능성이 크다.

게임으로 바꾸면 목표가 생기고, 실패와 재시도가 자연스러워지고, 미니게임과 엔딩이 보상이 된다.
우리에게 게임은 장식이 아니라 유저 관심을 확보하고 운영 데이터를 만들기 위한 장치였다.`,
  },
  {
    section: "SURFACE",
    title: "표면",
    subtitle: "웹페이지 대신 조작 가능한 OS",
    command: "open desktop://browser terminal messenger",
    layout: "signal",
    signal: "Browser OS",
    chips: ["Desktop", "Terminal", "Browser", "Messenger"],
    visual: {
      src: "/repo-assets/docs/mockup/바탕화면 1.png",
      label: "가상 데스크톱",
    },
    notes: `프론트엔드의 첫 인상은 일반 페이지가 아니라 가상 데스크톱이다.

사용자는 브라우저, 터미널, 메신저, 노트패드 같은 앱을 열고 닫으며 단서를 찾는다.
중요한 점은 각 UI가 따로 노는 것이 아니라 같은 스토리 런타임 상태를 공유한다는 것이다.

이 화면을 보여주면서 "브라우저에서 실행되는 OS형 게임 런타임"이라고 설명하면 된다.`,
  },
  {
    section: "LOOP",
    title: "루프",
    subtitle: "플레이가 데이터가 되는 구조",
    command: "trace story-runtime",
    layout: "signal",
    signal: "Action → Judge → State",
    chips: ["Node", "OutputBundle", "Transition", "Log"],
    notes: `핵심 루프는 단서 확인, 행동 입력, 서버 판정, UI 변화, 진행 저장이다.

현재 챕터와 노드를 서버에서 받고, output bundle로 브라우저/메신저/컷신/사운드 상태를 갱신한다.
사용자가 명령어나 클릭 행동을 하면 백엔드가 전이 가능 여부를 판정하고 진행 상태와 로그를 남긴다.

이 구조 덕분에 실패 로그, 힌트 요청, 병목 지점이 운영 데이터가 된다.`,
  },
  {
    section: "GAME",
    title: "확장",
    subtitle: "미니게임은 보상과 전이를 연결했다",
    command: "git log --oneline -- minigames",
    layout: "signal",
    signal: "5 Games",
    chips: ["PACMAN", "CORE", "PACKET", "ROUTE", "SURVIVAL"],
    notes: `미니게임은 단순 부가 콘텐츠가 아니었다.

CH1 PACMAN은 초기 보상형 플레이, CH2 CORE TIMING은 타이밍 판정과 fragment 보상, CH3 CYBER PACKET DASH는 캔버스 조작과 성능 튜닝, CH4 LUCAS ROUTE는 히든 전이와 엔딩 조건, LUCAS SURVIVAL은 본편 밖 반복 콘텐츠다.

git log 기준으로 미니게임은 추가 이후에도 BGM, 포커스, 새로고침, 장시간 성능, 중복 clear 같은 실제 사용 이슈를 계속 수정했다.`,
  },
  {
    section: "INTEGRITY",
    title: "무결성",
    subtitle: "프론트 결과만 믿지 않기",
    command: "git log --grep='url injection'",
    layout: "signal",
    signal: "URL ≠ Clear",
    chips: ["Session", "Hash", "Fragment", "Verify"],
    notes: `사용자가 URL이나 프론트 상태만으로 미니게임 클리어를 위조하지 못하게 서버 검증을 붙였다.

미니게임 시작 시 서버 세션을 발급하고, 클리어 보고와 fragment 획득을 서버 API로 묶었다.
본편 스토리 전이는 미니게임 clear와 별도로 다시 검증한다.

발표에서는 "보안"이라는 말보다 "게임 진행 무결성"이라고 말하는 편이 정확하다.`,
  },
  {
    section: "FRONTEND",
    title: "프론트",
    subtitle: "OS형 런타임",
    command: "rg normalizeStoryOutputBundle frontend/src",
    layout: "signal",
    signal: "UI Runtime",
    chips: ["React", "Zustand", "Adapter", "Analytics"],
    notes: `프론트엔드는 React, Vite, Zustand, React Router 기반이다.

윈도우, 브라우저 탭, 메신저, 터미널을 분리하되 같은 스토리 상태를 공유하게 했다.
OutputBundle adapter를 둔 이유는 백엔드 원시 응답이 커지고 달라져도 UI 렌더링이 직접 흔들리지 않게 하기 위해서다.

GA4/Clarity 동의 배너와 이벤트 추적도 붙여서 행동 분석 기반을 마련했다.`,
  },
  {
    section: "BACKEND",
    title: "백엔드",
    subtitle: "게임 진행의 진실",
    command: "git log --oneline -- backend/src/main/java/com/lucas/story",
    layout: "signal",
    signal: "Server is Truth",
    chips: ["Story", "Terminal", "Redis", "Log"],
    notes: `백엔드는 Spring Boot 3, Java 21 기반이다.

게임 진행의 진실을 서버에 두고, 챕터/스토리/터미널/VFS/전이 규칙을 런타임으로 관리했다.
Redis에는 진행 상태와 recent action을 저장하고, fragment와 미니게임 clear 상태도 서버에서 검증한다.

StoryServiceImpl 이력에는 챕터별 VFS 공통화, 챕터3 서버 룰, 챕터4 mount/root/ending, 챕터 해시, 터미널 흐름 검증 강화가 남아 있다.`,
  },
  {
    section: "RAG",
    title: "실시간 힌트",
    subtitle: "정답 대신 방향",
    command: "POST /api/v1/hints/live",
    layout: "signal",
    signal: "Hint, not Answer",
    chips: ["PGVector", "LLM", "Fallback", "20s"],
    notes: `RAG 실시간 힌트는 유저가 지금 막힌 문제를 완화하는 장치다.

클라이언트가 현재 노드, 실패 횟수, 유저 질문을 보내면 백엔드가 retrieval을 수행하고 evidence와 정책 컨텍스트를 만든다.
PGVector로 관련 전이와 가이드를 검색한 뒤 AI orchestrator가 GMS 호환 chat completion을 호출한다.

LLM이 지연되거나 실패하면 backend template fallback을 반환한다.
selectedPhase는 검색이 strict인지 fallback인지, whyThisHint는 LLM 성공인지 fallback인지 설명한다.
직접 정답을 말하기보다 루카스가 방향만 잡아주는 방식으로 플레이 몰입을 유지했다.`,
  },
  {
    section: "MM",
    title: "운영 힌트",
    subtitle: "병목을 찾아 채널로 보내기",
    command: "python hint-worker/main.py --daily",
    layout: "signal",
    signal: "Bottleneck → Hint",
    chips: ["CronJob", "ES", "Gemini", "Mattermost"],
    notes: `Mattermost 힌트는 개별 유저 요청이 아니라 전체 플레이 로그에서 병목을 찾는 운영 자동화다.

Kubernetes CronJob으로 hint-worker를 실행하고, DB에서 게시 중인 최신 챕터를 확인한다.
Elasticsearch에서 최근 7일 게임 로그를 집계해서 노드별 평균 실패 횟수, 이탈률, 실패 빈도를 계산한다.

점수는 평균 실패 40%, 이탈률 40%, 전체 실패 빈도 20% 기준이다.
최근 7일 내 같은 노드에 힌트가 나갔으면 제외하고, lucas_knowledge에서 가이드를 조회한 뒤 Gemini로 루카스 페르소나의 간접 힌트를 만든다.
결과는 Mattermost 웹훅으로 보내고 hint_history에 기록한다.`,
  },
  {
    section: "REPORT",
    title: "운영 리포트",
    subtitle: "어디서 막혔는지 보기",
    command: "python hint-worker/main.py --report",
    layout: "signal",
    signal: "1d vs 7d",
    chips: ["Users", "Actions", "Success", "Churn"],
    notes: `운영 리포트는 최근 24시간과 7일 데이터를 비교한다.

Elasticsearch aggregation으로 총 참여 유저, 총 액션, 평균 플레이 시간, 성공률, 이탈률을 계산한다.
특정 노드에서 실패 5회 이상이고 성공률 50% 미만이면 "가이드 보강 필요" 경고를 만든다.

여기서 중요한 구분은 RAG 실시간 힌트는 한 유저의 현재 문제를 푸는 장치이고, Mattermost 리포트는 운영자가 전체 병목을 보고 콘텐츠를 개선하는 장치라는 점이다.`,
  },
  {
    section: "INFRA",
    title: "인프라",
    subtitle: "배포에서 관측으로",
    command: "git log --oneline -- docs/infra k8s",
    layout: "signal",
    signal: "Jenkins → K8s → Observability",
    chips: ["Jenkins", "ALB", "Grafana", "ELK"],
    notes: `인프라는 처음에 배포가 목적이었고, 후반에는 운영 판단이 가능한 구조가 목적이 됐다.

현재 발표에서는 Jenkins 중심 CI/CD로 말해야 한다.
Jenkins가 빌드, Docker 이미지 push, K8s manifest 적용까지 담당했다.
ArgoCD는 실제 사용한 것처럼 말하지 말고, 도입한다면 GitOps sync, drift 감지, rollback 추적이 좋아지는 다음 단계로만 말한다.

외부 트래픽은 운영에서 ALB Ingress, 개발에서는 worker 노드의 Nginx와 NodePort로 들어갔다.
Prometheus/Grafana/Loki와 ELK로 지표와 로그를 수집했다.`,
  },
  {
    section: "K8S",
    title: "Kubernetes",
    subtitle: "EC2 self-managed cluster",
    command: "kubectl get nodes --show-labels",
    layout: "signal",
    signal: "Master + Workers",
    chips: ["nodeSelector", "kubelet", "HPA", "Tailscale"],
    notes: `EKS가 아니라 EC2 위에 직접 구성한 self-managed Kubernetes 클러스터다.

Master EC2는 control-plane 역할을 하고, 같은 EC2에 Prometheus/Grafana/ELK 같은 모니터링 스택도 함께 배치했다.
이걸 "마스터가 모니터링을 담당했다"라고 말하면 애매하고, "control-plane EC2에 운영 도구도 함께 배치했다"라고 말하는 게 정확하다.

worker1은 운영 workload 대상, worker-ssafy는 개발 workload 대상이다.
nodeSelector의 env=dev/prod 라벨로 Pod 배치를 분리했다.
kubelet은 각 노드에서 Pod 실행과 상태 보고를 담당한다.
HPA는 Deployment replica를 조정하는 것이지 노드를 늘리는 기능은 아니다.`,
  },
  {
    section: "TRAFFIC",
    title: "운영 지표",
    subtitle: "외부 요청은 실제로 있었다",
    command: "cat presentation/aws-tsv-analysis.md",
    layout: "signal",
    signal: "150,503",
    chips: ["requests", "ALB", "CloudWatch"],
    stats: [
      ["Peak", "3,467/h"],
      ["5xx", "0.08%"],
      ["Avg", "74ms"],
    ],
    notes: `CloudWatch ALB 지표 기준으로 2026-04-29 09:00부터 2026-05-18 12:00까지 총 150,503 requests가 있었다.

피크는 2026-05-04 14:00의 시간당 3,467 requests다.
ALB generated 5xx는 120건, 전체 요청 대비 약 0.0797%다.
요청 가중 평균 TargetResponseTime은 약 0.0739초, 즉 74ms다.

주의할 점:
HTTPCode_ELB_5XX_Count는 ALB가 만든 5xx이지 애플리케이션 내부 5xx 전체가 아니다.
앱 내부 오류율은 ELK나 백엔드 로그로 별도 설명해야 한다.`,
  },
  {
    section: "NODES",
    title: "노드 상태",
    subtitle: "지속 CPU 병목은 아니었다",
    command: "cat presentation/grafana-csv-analysis.md",
    layout: "signal",
    signal: "Low Average",
    chips: ["master 4.26%", "worker1 5.11%", "spike 100%"],
    notes: `EC2 CPU 지표 기준 master 평균은 4.26%, P95는 5.09%다.
worker1 평균은 5.11%, P95는 6.43%다.

지속적인 CPU 병목은 보이지 않았지만, worker1은 2026-05-11 22:00에 hourly maximum 기준 100% spike가 있었다.
이런 이상치를 발견하기 위해 CloudWatch와 Grafana 기반 관측이 필요했다.

Grafana CSV는 node_exporter 기반 단일 시리즈 샘플이므로 전체 애플리케이션 성능 지표로 과장하면 안 된다.`,
  },
  {
    section: "DIFF",
    title: "진화",
    subtitle: "git diff로 본 무게중심 이동",
    command: "git diff --shortstat v2.0.0..v3.0.0 -- ':!*.sql'",
    layout: "signal",
    signal: "v2 → v3",
    stats: [
      ["files", "262"],
      ["insert", "22,567"],
      ["delete", "1,525"],
    ],
    chips: ["Survival", "RAG", "CH4", "ELK"],
    notes: `SQL 파일은 제외하고 tag 간 diff를 봤다.

v1.0.0 -> v1.1.0: 214 files, +27,109 / -1,130
v1.1.0 -> v2.0.0: 13 files, +165 / -63
v2.0.0 -> v3.0.0: 262 files, +22,567 / -1,525
v3.0.0 -> v3.1.0: 89 files, +10,638 / -1,078
v3.1.0 -> HEAD: 182 files, +4,558 / -1,319

특히 v2 -> v3 구간은 Lucas Survival 에셋, 챕터3/4, 분석, RAG가 크게 증가한 구간이다.
이 슬라이드는 "기능이 커졌다"가 아니라 "게임과 운영 기능이 함께 커졌다"는 근거로 쓴다.`,
  },
  {
    section: "PAIN",
    title: "어려움",
    subtitle: "복잡도는 동시에 왔다",
    command: "cat postmortem.md",
    layout: "signal",
    signal: "Game + Ops",
    chips: ["UX", "Sync", "K8s", "ELK", "LLM"],
    notes: `어려움은 게임 구현과 운영 인프라가 동시에 복잡해진 데서 왔다.

스토리 데이터가 커지면서 OutputBundle 구조가 프론트 런타임을 흔들 위험이 있었다.
터미널 오답 피드백은 시스템 에러처럼 보여 몰입을 깨는 문제가 있었다.
미니게임 clear, fragment, story transition 순서가 어긋날 수 있었다.
dev worker는 Tailscale 기반이라 도메인, Nginx, NodePort가 복잡했다.
ELK는 PVC Pending, EBS CSI 권한, Elasticsearch 권한 이슈가 있었다.
LLM은 실시간 힌트에서 꼬리 지연이 UX를 흔들 수 있어서 20초 timeout과 fallback이 필요했다.`,
  },
  {
    section: "FEEDBACK",
    title: "피드백",
    subtitle: "들어온 문제를 수정으로 연결",
    command: "git log --grep=fix",
    layout: "signal",
    signal: "Log → Fix",
    chips: ["Bug report", "Analytics", "MM report", "Git fix"],
    notes: `피드백 처리의 핵심은 "받았다"가 아니라 "어떤 데이터로 보고 어떤 커밋으로 바뀌었는가"다.

게임 안에서 버그 리포트를 받아 관리자 메일로 보냈다.
명령 제출, 거절, 챕터 선택, 화면 노출 이벤트를 GA4/Clarity 후보로 추적했다.
Mattermost 운영 리포트는 성공률, 이탈률, 평균 실패 횟수로 병목 구간을 감지했다.

커밋 사례:
터미널 오답 로그 유지, 챕터3 메모 힌트 복원, 미니게임 포커스/새로고침/중복 clear 수정, 챕터4 어색한 대사/누락 노드/엔딩 전이/루카스 루트 흐름 검증 강화.`,
  },
  {
    section: "DEMO",
    title: "시연",
    subtitle: "기능 나열 대신 엔딩 흐름",
    command: "run demo --chapter=4 --true-ending",
    layout: "signal",
    signal: "CH4 진엔딩",
    chips: ["Desktop", "Terminal", "Route", "Ending"],
    visual: {
      src: "/repo-assets/docs/mockup/플레이화면 5.png",
      label: "챕터 플레이 화면",
    },
    notes: `시연은 길게 하지 않는다.

랜딩에서 진입하고 챕터4를 선택한다.
가상 데스크톱에서 메신저와 브라우저 단서를 확인한다.
터미널 명령 입력과 실패 피드백을 보여준다.
Lucas Route 또는 관련 미니게임 전이를 보여주고, fragment와 서버 검증 흐름을 설명한다.
마지막에는 진엔딩으로 닫고, 이 전체 흐름이 앞에서 말한 플레이 루프와 운영 데이터로 연결된다는 점만 확인시킨다.`,
  },
  {
    section: "FINAL",
    title: "결론",
    subtitle: "게임을 만들고, 운영할 수 있게 만들었다",
    command: "summarize --final",
    layout: "signal",
    signal: "Game + Ops Loop",
    chips: ["관심", "구현", "운영", "개선"],
    notes: `마지막 메시지는 기술 스택 나열이 아니다.

관심을 만들기 위해 게임을 선택했다.
게임이 커지자 서버 검증과 데이터 수집이 필요했다.
데이터가 쌓이자 RAG 힌트, Mattermost 리포트, 피드백 처리가 필요했다.
결과적으로 FIND ME는 게임을 만든 프로젝트이면서 그 게임을 운영하고 개선할 수 있게 만든 프로젝트다.`,
  },
  {
    section: "END",
    title: "SEE YOU NEXT WEEK",
    subtitle: "find_me --chapter 4 --true-ending",
    command: "root@b102:~$ exit",
    layout: "ending",
    tags: ["B102", "SSAFY 14", "FIND ME", "LUCAS"],
    notes: `마지막 장이다.

필요하면 팀원 이름, 서비스 URL, QR을 여기에 추가한다.`,
  },
];
