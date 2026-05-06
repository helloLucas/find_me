# 프론트엔드 Microsoft Clarity 및 GA4 도입 검토 보고서

작성일: 2026-05-06  
대상: `frontend` Vite/React 애플리케이션  
범위: Microsoft Clarity, Google Analytics 4(GA4), 동의 처리, 프론트 코드 변경 범위 산정

---

## 1. 결론 요약

현재 프론트엔드는 GA4와 Microsoft Clarity를 도입하기에 구조적으로 무리가 없다. `frontend/index.html`에 직접 태그를 넣는 방식도 가능하고, `src/shared/analytics` 같은 모듈을 만들어 환경변수 기반으로 동적 로딩하는 방식도 가능하다. 다만 이 프로젝트는 Vite 정적 빌드이므로 `VITE_*` 환경변수 값이 빌드 시점에 클라이언트 번들에 포함된다. 운영 중 Kubernetes 환경변수만 바꿔서는 GA/Clarity ID가 바뀌지 않고, 이미지를 다시 빌드해야 한다.

추천 도입안은 "직접 로더 + 환경변수 + GA4 Enhanced Measurement 기반 SPA page_view + 선택적 수동 이벤트"이다. 현재 라우터가 `createBrowserRouter` 기반 SPA이고, Google 공식 문서도 History API를 쓰는 SPA는 Enhanced Measurement의 "browser history events" 기반 page_view 측정을 권장한다. 수동 page_view를 직접 보내려면 GA4의 자동 page_view와 Enhanced Measurement history page_view를 함께 꺼야 중복 집계가 나지 않는다.

난이도는 기본 태그 도입만 하면 낮음, 동의 배너와 수동 이벤트까지 포함하면 중간이다. 대략 4-7개 파일, 100-220줄 추가로 1차 도입이 가능하고, 자체 동의 배너까지 만들면 7-10개 파일, 250-450줄 수준으로 늘어난다.

---

## 2. 현재 코드 분석

### 2.1 프론트엔드 스택

- `frontend/package.json`
  - React `19.2.4`, React Router `7.14.1`, Vite `8.0.4`, TypeScript `6.0.2`
  - GA/Clarity 관련 패키지나 태그는 현재 없음
- `frontend/src/main.tsx`
  - `StrictMode` 안에서 `<App />` 렌더링
- `frontend/src/App.tsx`
  - `AppQueryProvider` 아래 `RouterProvider`를 렌더링
- `frontend/src/app/router/index.tsx`
  - `createBrowserRouter` 사용
  - 주요 경로: `/`, `/lobby`, `/play/:chapterCode`, `/ending`, `/oauth/callback`, `/setup-nickname`, `*`

### 2.2 환경변수 구조

- `frontend/src/shared/config/env.ts`
  - 현재 `VITE_API_BASE_URL`, `VITE_CDN_URL`만 앱 코드에서 사용
- `frontend/.env`, `.env.local`, `.env.development`, `.env.production`
  - 현재 API, CDN, HMR, 포트, 개발 모드 관련 키만 존재
  - `VITE_GA_MEASUREMENT_ID`, `VITE_CLARITY_PROJECT_ID`, `VITE_ANALYTICS_ENABLED` 같은 키는 없음
- Vite 공식 문서 기준으로 `VITE_*` 변수는 클라이언트 코드에 노출되고, 빌드 시 정적으로 대체된다. 따라서 GA/Clarity ID는 비밀값으로 취급하면 안 되고, 운영 반영 시 재빌드가 필요하다.

### 2.3 배포 구조상 주의점

- `frontend/Dockerfile`
  - `npm run build`로 정적 파일을 만들고 Nginx 이미지에 복사
  - Docker runtime 환경변수를 읽는 구조가 아님
- `k8s/frontend.yaml`
  - 프론트 컨테이너에 env 주입이 없음
  - 설령 env를 추가해도 현재 Vite 정적 빌드 구조에서는 이미 빌드된 JS가 값을 다시 읽지 않음

운영에서 GA/Clarity ID를 환경별로 바꾸려면 다음 중 하나가 필요하다.

1. 현재 방식 유지: `.env.production` 또는 CI/CD 빌드 환경에 `VITE_*` 값을 넣고 프론트 이미지를 재빌드
2. 런타임 설정으로 전환: Nginx entrypoint에서 `/config.js`를 생성하거나 HTML 치환을 수행하도록 배포 구조 변경

1차 도입은 1번이 단순하다.

### 2.4 기존 모니터링/분석 관련 흔적

- `docs/rules/frontend-engineering-standard.md`
  - 기술 스택 항목에 `Analytics: Google Analytics, Microsoft Clarity`가 명시되어 있음
  - 실제 구현은 아직 없음
- `frontend/src/widgets/layout/app-shell.tsx`
  - `VITE_DEV_MODE !== "true"`일 때 우클릭, 단축키, debugger loop를 차단
  - 운영에서 브라우저 개발자도구 기반 검증이 어렵다. GA Realtime, DebugView, Tag Assistant, Clarity Dashboard, 또는 `VITE_DEV_MODE=true`인 스테이징에서 검증하는 절차가 필요하다.

### 2.5 개인정보 및 민감 데이터 노출 가능 지점

이 프로젝트는 게임형 스토리 런타임이라 일반 페이지뷰보다 더 섬세한 마스킹 정책이 필요하다.

- 닉네임
  - `authStore`, `lobby`, `setup-nickname`, `BugReportModal` 등에서 DOM에 표시됨
  - GA 이벤트 파라미터나 Clarity custom identifier에 닉네임 원문을 보내지 않는 것이 안전함
- 터미널 입력과 명령 이력
  - `frontend/src/features/command-input/TerminalScene.tsx`
  - 사용자가 입력한 명령이 input 상태에서 끝나지 않고 화면 로그로 렌더링될 수 있음
  - Clarity recording에 DOM 텍스트로 남을 수 있으므로, 터미널 로그 영역은 `data-clarity-mask="True"` 적용 후보
- 버그 리포트
  - `frontend/src/widgets/BugReportModal/index.tsx`
  - 제목, 내용, 첨부파일명을 GA 이벤트나 Clarity tag로 보내면 안 됨
  - textarea/input 자체는 Clarity 기본 마스킹 대상이지만, 제출 성공 이벤트에는 내용 없이 `bug_report_submitted` 정도만 전송 권장
- 토큰
  - `frontend/src/shared/utils/tokenManager.ts`에서 access token을 `localStorage`에 저장하며, refresh token 저장 함수도 존재함
  - 분석 도구 이벤트, custom tag, identify API에 토큰을 절대 포함하면 안 됨

---

## 3. 도입에 필요한 외부 준비물

### 3.1 GA4

필수 준비물:

- Google Analytics 계정 및 GA4 Property
- Web Data Stream
- Measurement ID: `G-XXXXXXXXXX` 형식
- 운영 도메인 등록: 예) `find.me.kr`, `www.find.me.kr` 등 실제 배포 도메인
- GA4 Realtime, DebugView 접근 권한
- Enhanced Measurement 설정 결정
  - 추천: Page views 켜기, "Page changes based on browser history events" 켜기
  - 수동 page_view를 구현할 경우: 자동 page_view와 history 기반 page_view를 꺼서 중복 방지

권장 준비물:

- 내부 트래픽 제외 필터
- 데이터 보존 기간, Google Signals 사용 여부 결정
- 이벤트 네이밍 정책
- 개인정보처리방침 또는 쿠키 안내 문구 업데이트

### 3.2 Microsoft Clarity

필수 준비물:

- Microsoft Clarity 계정 및 프로젝트
- Clarity Project ID
- 프로젝트 도메인 설정
- 마스킹 모드 결정
  - 기본값은 Balanced지만, 이 프로젝트는 터미널 로그와 닉네임 노출 가능성이 있어 Strict 또는 요소 단위 마스킹 검토 필요
- 프로젝트 대상 연령 확인
  - Microsoft 문서상 Clarity는 전 세계적으로 18세 미만을 대상으로 하는 웹사이트/앱에는 사용하지 않아야 한다고 안내한다. 게임형 서비스이고 청소년 사용 가능성이 있으면 제품/법무 판단이 필요하다.

권장 준비물:

- 내부 IP 차단
- Consent Mode 사용 여부 결정
- Clarity와 GA 연동 여부 결정
  - Clarity의 GA Integration은 Clarity session playback과 GA 대시보드를 연결하는 용도

### 3.3 동의 및 개인정보 정책

2026-05-06 현재 기준으로, Clarity는 2025-10-31부터 EEA, UK, Switzerland 방문에 대해 유효한 동의 신호 요구를 시행한다고 문서화되어 있다. Google도 자체 동의 배너를 운영하는 경우 Consent Mode에서 기본 동의 상태 설정과 사용자 선택 후 업데이트를 요구한다.

서비스가 한국/미국 사용자만 대상으로 하더라도, 공개 웹이면 해외 트래픽 가능성이 있다. 최소한 다음 중 하나를 결정해야 한다.

1. 자체 동의 배너 없음, 단순 분석만 우선 적용
   - 구현은 가장 쉽지만, EEA/UK/CH 트래픽 또는 광고 기능 확장 시 리스크가 있다.
2. Google Consent Mode v2를 먼저 구현하고 Clarity가 GCM 신호를 따르게 함
   - Google과 Clarity 동의 상태를 한 흐름으로 관리 가능
   - Clarity 문서상 GCM을 이미 쓰면 추가 변경 없이 Clarity가 `ad_storage`, `analytics_storage` 신호를 해석할 수 있음
3. 별도 Clarity Consent API v2와 Google Consent Mode를 둘 다 호출
   - 가장 명시적이지만 코드가 늘어남

추천은 2번이다. Google Consent Mode v2를 기준으로 `analytics_storage`, `ad_storage`, `ad_user_data`, `ad_personalization`을 관리하고, Clarity는 GCM 호환을 활용한다. 단, Clarity 프로젝트 설정에서 Consent Mode 관련 설정이 맞는지 확인해야 한다.

---

## 4. 도입 방식 비교

| 방식 | 설명 | 장점 | 단점 | 현재 프로젝트 적합도 |
| :--- | :--- | :--- | :--- | :--- |
| 직접 gtag.js + Clarity 로더 | 앱 코드 또는 `index.html`에서 직접 스크립트 로드 | 코드 추적 가능, 의존성 없음, 배포 예측 쉬움 | 마케팅 태그를 코드 배포 없이 바꾸기 어려움 | 높음 |
| Google Tag Manager(GTM) | GTM 컨테이너 하나를 넣고 GA/Clarity를 GTM에서 관리 | 비개발자가 태그 변경 가능 | GTM 권한/승인/프리뷰 관리 필요, CSP와 디버깅 복잡도 증가 | 중간 |
| NPM 패키지 | Clarity NPM 등 SDK 패키지 사용 | 타입/초기화 코드 관리 쉬움 | 패키지 추가와 업데이트 관리 필요 | 중간 |

1차 도입은 직접 로더가 적합하다. 현재 앱은 마케팅 태그가 많지 않고, Vite/React 코드로 분석 이벤트를 중앙화하는 편이 스토리 런타임 이벤트의 민감 데이터 필터링에 유리하다.

---

## 5. 예상 코드 변경 범위

### 5.1 최소 도입

목표:

- GA4와 Clarity 스크립트 로드
- 환경변수로 on/off 및 ID 관리
- GA4 기본 page_view는 Enhanced Measurement에 맡김
- Clarity 기본 recording/heatmap 활성화

예상 변경:

| 파일 | 변경 내용 | 예상 규모 |
| :--- | :--- | :--- |
| `frontend/src/shared/config/env.ts` | `gaMeasurementId`, `clarityProjectId`, `analyticsEnabled` 추가 | 5-15줄 |
| `frontend/src/shared/analytics/index.ts` 신규 | GA/Clarity 동적 script loader, 중복 초기화 guard | 80-140줄 |
| `frontend/src/main.tsx` 또는 `frontend/src/App.tsx` | 앱 시작 시 `initAnalytics()` 호출 | 2-8줄 |
| `frontend/.env*` | `VITE_GA_MEASUREMENT_ID`, `VITE_CLARITY_PROJECT_ID`, `VITE_ANALYTICS_ENABLED` 추가 | 파일별 2-3줄 |
| `frontend/src/vite-env.d.ts` 신규, 선택 | 커스텀 Vite env 타입 보강 | 10-25줄 |

예상 난이도: 낮음  
예상 소요: 0.5-1일  
위험도: 낮음. 단, 운영 검증은 실제 ID와 도메인 설정이 있어야 가능

### 5.2 SPA page_view를 수동 제어하는 도입

목표:

- React Router location 변경마다 명시적으로 `page_view` 전송
- page title, page location, chapter route 등을 제어

추가 변경:

| 파일 | 변경 내용 | 예상 규모 |
| :--- | :--- | :--- |
| `frontend/src/shared/analytics/pageView.ts` 신규 | `sendPageView()` 래퍼 | 20-40줄 |
| `frontend/src/app/analytics/routerTracker.ts` 신규 | `router.subscribe` 또는 라우트 레이아웃 기반 추적 | 40-80줄 |
| `frontend/src/app/router/index.tsx` | 루트 레이아웃 구조 변경 또는 tracker 연결 | 10-40줄 |

예상 난이도: 중간  
예상 소요: 1-1.5일  
주의: GA4 자동 page_view, Enhanced Measurement의 history page_view를 끄지 않으면 중복 집계 위험이 있음

현재는 수동 제어보다 GA4 Enhanced Measurement를 우선 추천한다. React Router가 브라우저 History API를 사용하기 때문이다.

### 5.3 자체 동의 배너 포함 도입

목표:

- 최초 방문 시 분석/광고 저장 동의 수집
- Google Consent Mode v2 기본값 설정 및 사용자 선택 후 update
- Clarity Consent Mode 또는 GCM 연동
- localStorage 등에 동의 선택 저장

추가 변경:

| 파일 | 변경 내용 | 예상 규모 |
| :--- | :--- | :--- |
| `frontend/src/shared/consent/consentStore.ts` 신규 | 동의 상태 저장/조회 | 50-90줄 |
| `frontend/src/widgets/ConsentBanner/index.tsx` 신규 | 배너 UI | 100-180줄 |
| `frontend/src/shared/analytics/consent.ts` 신규 | `gtag('consent', ...)`, `clarity('consentv2', ...)` 래퍼 | 60-120줄 |
| `frontend/src/App.tsx` 또는 `AppShell` | 배너 렌더링 위치 추가 | 5-15줄 |

예상 난이도: 중간  
예상 소요: 2-4일  
위험도: 정책 문구와 법적 요구사항이 코드보다 더 중요함

---

## 6. 이벤트 설계 제안

### 6.1 GA4 이벤트

처음부터 많은 이벤트를 넣기보다, 스토리 런타임의 핵심 전환만 중앙에서 전송하는 것이 좋다.

권장 이벤트:

| 이벤트명 | 발생 위치 | 파라미터 | 보내면 안 되는 값 |
| :--- | :--- | :--- | :--- |
| `chapter_start` | `initializeStory` 성공 후 | `chapter_code`, `role`, `is_guest` | 닉네임, 토큰 |
| `story_action` | `submitStoryAction` 성공 후 | `action_type`, `from_node_code`, `to_node_code`, `chapter_code` | raw command, inputValue 원문 |
| `chapter_complete` | 완료 노드 도달 시 | `chapter_code`, `ending_type` | 사용자 식별 원문 |
| `bug_report_submitted` | 버그 리포트 전송 성공 | `chapter_code`, `has_attachment` | 제목, 내용, 파일명 |
| `auth_completed` | 인증 완료 | `auth_provider`, `role` | accessToken, tempKey, 이메일 |

가장 좋은 삽입 위치는 `frontend/src/features/story-runtime/storyRuntime.store.ts`이다. `submitStoryAction`, `initializeStory`가 이미 스토리 행동의 중앙 관문이므로 이벤트 누락과 중복을 줄일 수 있다.

### 6.2 Clarity custom tags

Clarity custom tag는 세션 녹화와 히트맵 필터링에 유용하다.

권장:

- `clarity("set", "chapter", chapterCode)`
- `clarity("set", "node", nodeCode)`
- `clarity("set", "session_mode", "guest" | "member")`

비권장:

- `clarity("identify", nickname)`
- `clarity("set", "command", rawCommand)`
- `clarity("set", "bug_report_title", title)`
- 이메일, 닉네임, 토큰, tempKey, 자유입력 원문

---

## 7. Clarity 마스킹 권장 지점

Clarity는 입력창과 dropdown을 기본적으로 마스킹하지만, 화면에 렌더링된 일반 DOM 텍스트는 정책에 따라 녹화될 수 있다. 다음 영역은 명시 마스킹 후보이다.

| 위치 | 이유 | 권장 조치 |
| :--- | :--- | :--- |
| 터미널 로그 영역 | 사용자가 입력한 명령이 텍스트 로그로 재표시될 수 있음 | `data-clarity-mask="True"` |
| 닉네임 표시 영역 | 개인 식별 가능성 | 닉네임 span에 `data-clarity-mask="True"` |
| 버그 리포트 모달 | 자유 입력과 첨부 관련 정보 | 입력은 기본 마스킹, 주변 표시값도 필요 시 마스킹 |
| OAuth callback/error 표시 | 인증 관련 상태 노출 가능성 | token/tempKey DOM 렌더링 금지 유지 |

스토리 본문 자체가 제품 분석 대상이라면 전체 마스킹은 과할 수 있다. 대신 "사용자 입력이 다시 렌더링되는 영역"과 "닉네임" 위주로 시작하는 것이 현실적이다.

---

## 8. CSP 및 네트워크 고려사항

현재 `frontend/nginx.conf`에는 CSP 헤더가 없다. 따라서 GA/Clarity 스크립트가 CSP 때문에 차단될 가능성은 낮다. 다만 추후 CSP를 추가한다면 다음 도메인을 허용해야 한다.

GA4 기본:

- `script-src`: `https://*.googletagmanager.com`
- `img-src`: `https://*.google-analytics.com`, `https://*.googletagmanager.com`
- `connect-src`: `https://*.google-analytics.com`, `https://*.analytics.google.com`, `https://*.googletagmanager.com`

Clarity 기본:

- `https://*.clarity.ms`
- `https://c.bing.com`

Google Signals, Google Ads, GTM Preview Mode를 쓰면 허용 도메인이 더 늘어난다.

---

## 9. 검증 계획

### 9.1 로컬/스테이징

1. `.env.development` 또는 스테이징 빌드 환경에 테스트용 ID 설정
2. `VITE_ANALYTICS_ENABLED=true` 설정
3. 개발자도구 검증이 필요하면 `VITE_DEV_MODE=true`로 debugger loop 비활성화
4. `npm run build` 실행
5. `npm run preview` 또는 스테이징 배포에서 네트워크 요청 확인

확인할 요청:

- GA4 script: `https://www.googletagmanager.com/gtag/js?id=G-...`
- GA4 collect: `https://*.google-analytics.com/g/collect`
- Clarity collect: `https://www.clarity.ms/collect`

### 9.2 운영

- GA4 Realtime에서 방문 이벤트 확인
- DebugView에서 `page_view`, 커스텀 이벤트 확인
- Clarity Dashboard에서 live user 또는 recording 확인
- Clarity 설치 검증은 Network 탭의 `/collect` POST 또는 Clarity dashboard로 확인
- 데이터가 뜨기까지 GA4는 최대 약 30분 지연될 수 있음

---

## 10. 추천 구현 순서

1. GA4/Clarity 계정과 ID 발급
2. 운영 도메인과 내부 트래픽 필터 정책 결정
3. `VITE_GA_MEASUREMENT_ID`, `VITE_CLARITY_PROJECT_ID`, `VITE_ANALYTICS_ENABLED` 키 추가
4. `src/shared/analytics` 로더 구현
5. GA4 Enhanced Measurement에서 history page_view 사용
6. Clarity 마스킹 후보에 `data-clarity-mask` 적용
7. `storyRuntime.store.ts`에 최소 이벤트 2-3개만 추가
8. 동의 배너와 Consent Mode v2는 2차로 적용하거나, 해외 트래픽 가능성이 있으면 1차에 포함
9. 스테이징 검증 후 운영 이미지 재빌드 및 배포

---

## 11. 최종 난이도 평가

| 범위 | 난이도 | 예상 기간 | 변경량 | 판단 |
| :--- | :--- | :--- | :--- | :--- |
| 태그만 삽입 | 낮음 | 0.5일 | 1-3개 파일, 30-80줄 | 빠른 확인용 |
| 환경변수 기반 직접 로더 | 낮음-중간 | 0.5-1일 | 4-7개 파일, 100-220줄 | 1차 추천 |
| 수동 SPA page_view | 중간 | 1-1.5일 | 5-8개 파일, 150-280줄 | 정밀 분석 필요 시 |
| 자체 동의 배너 포함 | 중간 | 2-4일 | 7-10개 파일, 250-450줄 | 해외/광고/정책 대응 시 |
| GTM 기반 운영 체계 | 중간-높음 | 2-5일 | 코드 적음, 운영 설정 많음 | 마케팅 태그가 많아질 때 |

현재 프로젝트 기준 최적안은 "환경변수 기반 직접 로더 + GA4 Enhanced Measurement + Clarity 마스킹 + 최소 커스텀 이벤트"이다. 이 범위라면 기능 리스크는 낮고, 분석 품질은 충분히 확보할 수 있다.

---

## 12. 참고한 공식 문서

- Vite Env Variables and Modes: https://vite.dev/guide/env-and-mode
- Google Analytics Help, GA4 setup for website/app: https://support.google.com/analytics/answer/14183469
- Google Analytics Developer, Measure pageviews: https://developers.google.com/analytics/devguides/collection/ga4/views
- Google Analytics Developer, Measure single-page applications: https://developers.google.com/analytics/devguides/collection/ga4/single-page-applications
- Google Tag Platform, Consent Mode for websites: https://developers.google.com/tag-platform/security/guides/consent
- Google Tag Platform, CSP guidance for GA4/GTM: https://developers.google.com/tag-platform/security/guides/csp
- Microsoft Clarity setup: https://learn.microsoft.com/en-us/clarity/setup-and-installation/clarity-setup
- Microsoft Clarity consent management: https://learn.microsoft.com/en-us/clarity/setup-and-installation/consent-management
- Microsoft Clarity Consent API v2: https://learn.microsoft.com/en-us/clarity/clarity-consent-api-v2
- Microsoft Clarity GCM support: https://learn.microsoft.com/en-us/clarity/setup-and-installation/cookie-gcm
- Microsoft Clarity masking: https://learn.microsoft.com/en-us/clarity/setup-and-installation/clarity-masking
- Microsoft Clarity custom tags: https://learn.microsoft.com/en-us/clarity/filters/custom-tags
- Microsoft Clarity CSP: https://learn.microsoft.com/en-us/clarity/setup-and-installation/clarity-csp
