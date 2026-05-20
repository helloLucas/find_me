---
theme: default
class: text-center
highlighter: shiki
lineNumbers: false
info: |
  ## FIND ME / LUCAS
  Browser presentation based on Find_Me.pdf and the cyberpunk terminal style in presentation/ppt.
drawings:
  persist: false
transition: fade
title: Find Me
css: unocss
---

<div class="deck cover">
  <div class="sys">[PROJECT_FINDME // LIVE_OPS_PRESENTATION]</div>
  <h1>Find Me</h1>
  <p class="subtitle">B102</p>
  <div class="chips">
    <span>USER</span>
    <span>GAME</span>
    <span>OPS</span>
    <span>DATA</span>
  </div>
  <div class="terminal">$ connect --target=find_me --mode=presentation<span class="cursor"></span></div>
</div>

<!--
PDF 1장: Find Me / B102.
presentation/ppt의 제목 장표처럼 터미널 프롬프트, 시스템 메시지, 사이버펑크 톤을 유지했다.
첫 장에서 강조할 점은 게임 자체보다 실제 유저가 있는 기술 프로젝트라는 방향이다.
-->

---
layout: center
---

<div class="deck">
  <div class="sys">[TABLE_OF_CONTENTS]</div>
  <h2>목차</h2>
  <div class="toc-grid">
    <div><b>01</b><span>프로젝트 목표</span></div>
    <div><b>02</b><span>문제</span></div>
    <div><b>03</b><span>계획</span></div>
    <div><b>04</b><span>시연</span></div>
    <div><b>05</b><span>기능 설명</span></div>
    <div><b>06</b><span>성적</span></div>
  </div>
</div>

<!--
PDF 2장: 목차.
큰 분류만 보여주고 세부 기술명은 뒤에서 푼다.
-->

---
layout: center
---

<div class="deck split">
  <div>
    <div class="sys">[01 / PROJECT_GOAL]</div>
    <h2>기술 프로젝트</h2>
    <p class="lead">실제 유저가 들어오는 서비스를 운영하며 기술을 검증한다.</p>
  </div>
  <div class="keyword-ring">
    <span>인프라 운영</span>
    <span>트래픽 대응</span>
    <span>로그 모니터링</span>
  </div>
</div>

<!--
PDF 3장: 기술 프로젝트 / 인프라 운영 / 트래픽 대응 / 로그 모니터링.
게임을 만들고 싶어서 시작한 것이 아니라, 운영 경험을 만들기 위한 기술 프로젝트였다는 점을 먼저 말한다.
-->

---
layout: center
---

<div class="deck problem">
  <div class="sys">[02 / PROBLEM]</div>
  <h2>문제</h2>
  <p class="big">실제 유저가 없으면<br />프로젝트도 없다</p>
  <div class="caption">로그, 모니터링, 트래픽 대응은 유저 행동이 있어야 의미가 생긴다.</div>
</div>

<!--
PDF 4장: 문제.
로컬 테스트만으로는 운영 지표가 쌓이지 않는다.
그래서 유저가 들어오고 다시 돌아올 이유를 설계해야 했다.
-->

---
layout: center
---

<div class="deck">
  <div class="sys">[03 / PLAN]</div>
  <h2>전략</h2>
  <div class="flow">
    <div>반복적인 유입</div>
    <span>-></span>
    <div>주마다 새로운 배포</div>
  </div>
  <div class="flow accent">
    <div>단발적인 흥미</div>
    <span>-></span>
    <div>챕터형 스토리 게임</div>
  </div>
</div>

<!--
PDF 5장: 전략.
유저의 관심을 모으고 유지하기 위해 매주 새로운 챕터를 여는 구조를 선택했다.
게임은 목적이 아니라 유저를 모으고 붙잡기 위한 수단이다.
-->

---
layout: center
---

<div class="deck">
  <div class="sys">[04 / STORY_CONTEXT]</div>
  <h2>챕터 4 이전</h2>
  <p class="lead">간략한 줄거리 및 세계관 설명</p>
  <div class="timeline">
    <div><b>CH1</b><span>연결</span></div>
    <div><b>CH2</b><span>확장</span></div>
    <div><b>CH3</b><span>추적</span></div>
    <div><b>CH4</b><span>진실</span></div>
  </div>
</div>

<!--
PDF 6장: 챕터 4 이전의 간략한 줄거리 및 세계관 설명.
이 장은 모든 스토리를 설명하는 장이 아니라, 챕터 4 진엔딩 시연을 이해할 만큼만 설명하는 장이다.
-->

---
layout: center
---

<div class="deck media-slide">
  <div class="sys">[04 / VIDEO]</div>
  <h2>포트폴리오 영상</h2>
  <div class="play-frame">
    <div class="play-button">PLAY</div>
    <p>브라우저 / 터미널 / 메신저 / 미니게임 런타임</p>
  </div>
</div>

<!--
PDF 7장: 포트폴리오 영상.
영상 삽입 또는 직접 시연 전 짧은 연결 장표로 사용한다.
-->

---
layout: center
---

<div class="deck demo">
  <div class="sys">[04 / LIVE_DEMO]</div>
  <h2>실시간 시연</h2>
  <p class="lead">챕터 4 진엔딩</p>
  <div class="terminal large">
    $ open chapter04<br />
    $ trace lucas_route<br />
    $ resolve true_ending<span class="cursor"></span>
  </div>
</div>

<!--
PDF 8장: 실시간 시연.
시연은 짧게 끝내고, 다음 기능 설명에서 방금 본 흐름이 어떻게 서버 검증과 로그로 연결되는지 설명한다.
-->

---
layout: center
---

<div class="deck">
  <div class="sys">[05 / FEATURES]</div>
  <h2>기능 설명</h2>
  <div class="feature-grid">
    <div>진행 무결성</div>
    <div>로그 수집</div>
    <div>힌트</div>
    <div>자동화</div>
    <div>HPA / K8s</div>
    <div>아키텍처</div>
  </div>
</div>

<!--
PDF 9장: 기능 설명.
백엔드/프론트엔드처럼 계층으로 나누지 않고, 유저 경험과 운영 목표 기준으로 설명한다.
-->

---
layout: center
---

<div class="deck integrity">
  <div class="sys">[05.1 / INTEGRITY]</div>
  <h2>악용을 막는<br />진행 무결성</h2>
  <div class="pipeline">
    <span>latestNode</span>
    <span>allowed transition</span>
    <span>validator</span>
    <span>nextNode</span>
  </div>
</div>

<!--
PDF 10장: 악용을 막는 진행 무결성.
유저가 URL, 브라우저 상태, 임의 요청으로 스토리를 건너뛰거나 보상을 위조하지 못하도록 서버의 진행 상태와 전이 그래프를 기준으로 검증한다.
-->

---
layout: center
---

<div class="deck">
  <div class="sys">[05.2 / LOG_PIPELINE]</div>
  <h2>로그 수집</h2>
  <div class="stack-grid">
    <span>Elasticsearch</span>
    <span>Logstash</span>
    <span>Kibana</span>
    <span>Prometheus</span>
    <span>Grafana</span>
    <span>Loki</span>
  </div>
</div>

<!--
PDF 11장: 로그 수집.
PDF의 Garafana 표기는 Grafana로 바로잡았다.
CloudWatch/ALB는 외부 HTTP 요청, Prometheus/Grafana는 노드 상태, ELK는 구조화 게임 이벤트, GA4/Clarity는 프론트 사용성 데이터로 구분한다.
-->

---
layout: center
---

<div class="deck">
  <div class="sys">[05.3 / HINT]</div>
  <h2>힌트</h2>
  <p class="lead">RAG + 경량화 + 고도화</p>
  <div class="flow compact">
    <div>현재 노드</div>
    <span>+</span>
    <div>최근 실패</div>
    <span>-></span>
    <div>간접 힌트</div>
  </div>
</div>

<!--
PDF 12장: 힌트 - RAG + 경량화, 고도화.
힌트는 정답 제공이 아니라 막힌 유저가 이탈하기 전에 다시 움직이게 하는 장치다.
-->

---
layout: center
---

<div class="deck">
  <div class="sys">[05.4 / AUTOMATION]</div>
  <h2>자동화</h2>
  <p class="lead">로그 기반 힌트 제공<br />로그 분석 보고서</p>
  <div class="pipeline wide">
    <span>ELK</span>
    <span>RAG</span>
    <span>Report</span>
    <span>Mattermost</span>
  </div>
</div>

<!--
PDF 13장: 자동화.
유저 실패와 이탈을 운영자가 보는 리포트로 만들고, 힌트 개선과 콘텐츠 수정으로 연결한다.
-->

---
layout: center
---

<div class="deck k8s">
  <div class="sys">[05.5 / INFRA]</div>
  <h2>HPA 기반 K8s</h2>
  <div class="metric-row">
    <div><b>HPA</b><span>Pod replica 조정</span></div>
    <div><b>Probe</b><span>배포 안정성</span></div>
    <div><b>ALB</b><span>외부 요청 라우팅</span></div>
  </div>
</div>

<!--
PDF 14장: HPA 기반 k8s.
HPA는 노드를 늘리는 기능이 아니라 Deployment replica, 즉 Pod 수를 조정하는 기능이다.
-->

---
layout: center
---

<div class="deck">
  <div class="sys">[05.6 / ARCHITECTURE]</div>
  <h2>시스템 아키텍처</h2>
  <div class="arch">
    <div>Browser Runtime</div>
    <div>ALB / Ingress / Service</div>
    <div>Spring Boot Runtime</div>
    <div>PostgreSQL / Redis / PGVector</div>
    <div>ELK / Grafana / GA4 / Clarity</div>
  </div>
</div>

<!--
PDF 15장: 시스템 아키텍처.
유저 경험에서 운영 데이터까지 이어지는 흐름으로 설명한다.
-->

---
layout: center
---

<div class="deck">
  <div class="sys">[06 / TEAM]</div>
  <h2>팀원소개</h2>
  <div class="team-grid">
    <div>Frontend</div>
    <div>Backend</div>
    <div>Infra</div>
    <div>AI / Data</div>
    <div>Game</div>
    <div>Design</div>
  </div>
</div>

<!--
PDF 16장: 팀원소개.
구체적인 이름과 역할이 확정되면 이 장만 교체하면 된다.
현재는 역할 단위 자리만 둔다.
-->

---
layout: center
---

<div class="deck cover">
  <div class="sys">[SESSION_COMPLETE]</div>
  <h1>Q & A</h1>
  <div class="terminal">$ echo "Will you find me?"<br />&gt; <span class="cursor"></span></div>
</div>

<!--
PDF 17장: Q & A.
-->
