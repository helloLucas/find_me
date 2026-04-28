# 프론트엔드 개발 및 디자인 일관성 유지 지침 (Integrated Frontend Standard)

**대상:** Codex, Antigravity 등 코드 생성형 AI  
**목적:** 프론트엔드 구현 시 구조, 보안(난독화), 상태, UI, 상호작용 방식을 일관되게 유지하기 위한 통합 기준 문서

---

## 0. 문서 사용 규칙

- **0-1. 문서의 역할:** AI 코드 어시스턴트가 작업할 때 반드시 따라야 할 **최우선 일관성 유지 기준**.
- **0-2. 우선순위:** 본 문서 > 기술 스택 결정 > 아키텍처 문서 > 개별 작업 요청.
- **0-3. 적용 범위:** 프론트 앱 구조, 플레이 런타임, UI 계층, 상태 관리, API 소비, 보안 전략, 계측 방식 등.

---

## 1. 프로젝트 정체성 및 전략

### 1-1. 프론트 앱의 정체성
이 프로젝트의 프론트는 일반적인 CRUD 웹앱이 아니다. 브라우저, 개발자도구, 네트워크, 콘솔, CLI를 하나의 흐름으로 소비하는 **데이터 주도형 스토리 플레이 런타임**이다.

### 1-2. 보안 및 라우팅 전략 (Triple Lock System)
AI는 보안과 몰입감을 위해 아래의 라우팅 전략을 반드시 준수해야 한다.
1. **외부 라우트 (BrowserRouter) 최소화:**
    - 허용 경로: `/` (Home), `/login`, `/signup`, `/lobby`, `/play/:chapterHash`
    - **`/ending` 라우트 폐쇄:** 모든 엔딩 연출은 플레이 런타임 내부에서 종결하며 독립된 페이지로 분리하지 않는다.
2. **챕터 코드 난독화 (Chapter Hashing):**
    - `ch1`, `stage1` 등 예측 가능한 코드 사용 금지.
    - URL 파라미터는 반드시 고유 해시(예: `a1b2-c3d4`) 또는 UUID 형태를 사용하여 주소창 추측 공격을 차단한다.
3. **서버 사이드 가드 (Server-Side Guard):**
    - `/play/:chapterHash` 진입 시 서버 API를 호출하여 해당 해시의 유효성 및 유저 권한을 확인하고, 부적절한 접근 시 즉시 `/lobby`로 리다이렉트한다.
4. **내부 캡슐화 (MemoryRouter):**
    - 플레이 내부의 장면 전환(브라우저 ↔ DevTools ↔ Terminal ↔ Ending)은 **MemoryRouter**를 사용하여 브라우저 주소창 변화 없이 캡슐화한다.

---

## 2. 기술 스택 고정 규칙

- **Core:** React, Vite, TypeScript, Tailwind CSS
- **Routing:** React Router (BrowserRouter for top-level, MemoryRouter for internal play)
- **State:** Zustand (UI/Effect only), TanStack Query (Server State/Truth)
- **Analytics:** Google Analytics, Microsoft Clarity
- **Styling 원칙:** Tailwind 기반 공통 토큰 사용, 무분별한 인라인 스타일 금지, 의미 단위 색상 체계 준수.

---

## 3. 디렉토리 구조 기준 (FSD-lite)

### 3-1. 최상위 구조 및 책임
```
src/
  app/        # Providers, Router, Global Store, 전역 CSS
  pages/      # Route Entry (Home, Auth, Lobby, Play) - 로직 최소화
  widgets/    # 복합 기능 조립 단위 (Layout, Navigation, Global Modal)
  features/   # 사용자 액션 단위 (Story-play runtime, Command-input, Analytics)
  entities/   # 도메인 중심 레이어 (Story, Chapter, Progress, Ending, User)
  shared/     # 범용 자원 (API Client, UI components, Hooks, Utils, Constants)
```

### 3-2. 설계 금지사항
- 챕터별 폴더 생성 금지 (`src/chapter1/` 등).
- 상태/모드별 폴더 분리 금지 (`src/browserMode/` 등).
- 모든 데이터와 로직은 도메인(Entity)과 기능(Feature) 단위로 관리한다.

---

## 4. 플레이 런타임 명세

### 4-1. PlayRuntime (Feature)
플레이 라우트 내부의 최상위 컨테이너로, 현재 노드 데이터에 따른 장면 렌더링과 상태 전이를 관리한다.
- **SceneRenderer:** `nodeType`에 따라 Browser, Devtools, Terminal, Ending 등 적절한 장면 컴포넌트 매핑.
- **PromptController:** 입력 방식(Command, Choice, Inspect, Click)에 맞는 UI 제공.
- **EffectController:** 서버의 `effectBundle`을 해석하여 글리치, 사운드, 패널 전환 등 로컬 UI 효과 적용.

### 4-2. 장면(Scene) Layer
1. **BrowserScene:** 주소창, 기사 레이아웃, 미세한 렌더링 이상(Corrupted Text).
2. **DevtoolsScene:** Console / Network / Headers 패널.
3. **TerminalScene:** 프롬프트, 입력 줄, 출력 로그, 스캔 바/타이머.
4. **SystemAlertScene:** 경고 배너 및 위기 연출 오버레이.
5. **EndingScene:** 플레이 런타임의 최종 상태로서 별도 URL 없이 렌더링.

---

## 5. 상태 관리 명세 (Dual State Principle)

### 5-1. 서버 상태 (TanStack Query) - 진실의 원천
- 챕터/노드 정보, 유저 진행도, 저장 슬롯, 해금된 엔딩.
- **금지:** 서버 상태 전체를 Zustand에 중복 저장하거나 로컬 진실로 재구성하지 말 것.

### 5-2. 클라이언트 상태 (Zustand) - UI/연출 전용
- 현재 활성 패널/탭, 글리치 강도, 오디오 ON/OFF, 터미널 로컬 버퍼, 연출용 타이머.

---

## 6. API 소비 및 타입 규칙

- **API 위치:** `shared/api` 또는 각 Entity/Feature의 API wrapper에서만 수행.
- **입력 처리:** 사용자의 모든 입력(명령어, 선택지 등)은 프론트에서 최종 판정하지 않고 서버에 제출하여 응답을 반영한다.
- **핵심 타입:** `StoryNode`, `TransitionRequest/Response`, `OutputBundle`, `EffectBundle` 등 명확한 스키마 준수.

---

## 7. AI 작업 시 금지사항 총괄

1. **라우팅:** `/ending` 독립 페이지 생성 금지, 순차적 URL(`/play/ch1`) 설계 금지.
2. **구현:** 챕터별 대규모 코드 복붙 금지, 장면마다 별도 라우트 생성 금지.
3. **상태:** 서버 데이터를 Zustand에 동기화하려 하지 말 것.
4. **연출:** 시작부터 전체 화면 글리치 남발 금지 (인과관계 기반 연출 상승 곡선 준수).
5. **의존성:** xterm.js 사용 금지 (커스텀 터미널 UI 구현).
6. **API:** 장면 컴포넌트에서 직접 fetch/axios 호출 금지.

---

## 8. 최종 판단 문장

**이 프로젝트의 프론트는 핵심 플레이 영역이 `/play/:chapterHash` 내부에서 동작하는 데이터 주도형 스토리 런타임이며, Triple Lock System(해시 URL, 서버 검증, MemoryRouter 캡슐화)을 통해 보안과 몰입감을 유지하고 브라우저↔CLI 전환을 일관된 상태 전이로 표현해야 한다.**
