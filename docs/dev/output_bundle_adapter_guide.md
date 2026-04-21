# Frontend Story Runtime: OutputBundle Adapter Guide

이 문서는 스토리 런타임에서 백엔드의 응답 데이터(`outputBundle`)를 프론트엔드가 어떻게 안전하게 변환(Parsing)하고 추상화(Abstraction)하는지 설명하며, 향후 개발을 위한 가이드라인을 제공합니다.

## 1. 개요 및 목적 (Why Adapters?)

백엔드에서 내려주는 `outputBundle`은 스토리 노드의 성격에 따라 데이터 구조가 매우 다양해질 수 있습니다(메신저 대화, 브라우저 팝업, 인게임 컷신, 오디오 재생 등). 
과거에는 `storyRuntime.store.ts` 내부에서 직접 이 원시 데이터(Raw Data)의 타입을 검사하고 로직을 분기했습니다. 

**어댑터 층(Adapter Layer)을 도입한 목적:**
*   **관심사 분리 (Separation of Concerns):** 스토어(전역 상태)는 앱의 흐름과 상태 관리에만 집중하고, 데이터 파싱은 어댑터가 전담합니다.
*   **타입 안정성 (Type Safety):** 백엔드에서 null, array, string 등 예상치 못한 타입이 넘어와도 어댑터가 방어 로직을 통해 런타임 에러를 막습니다.
*   **유연성 및 응집도 (Flexibility & Cohesion):** 브라우저를 언제 열지, 닉네임 치환(`{{playerName}}`)을 어떻게 할지에 대한 비즈니스 로직을 한 곳에 모을 수 있습니다.

---

## 2. 데이터 흐름 (Data Flow)

1.  **Backend (API):** `storyApi.startStory` 또는 `submitTransition`을 통해 `StoryNode` 반환
2.  **Store (`storyRuntime.store.ts`):** 응답을 받으면 상태를 업데이트하고, 처리를 위해 어댑터 호출
3.  **Adapter (`*.adapters.ts`):** 
    *   `normalizeStoryOutputBundle` 등으로 데이터를 정규화
    *   스토어에 필요한 데이터 구조(예: `MessengerConversation`, `SceneData`)로 반환
4.  **Component / Sub-Store:** 어댑터를 거쳐 정제된 안전한 데이터를 기반으로 UI 렌더링 및 하위 로직 실행

---

## 3. 핵심 어댑터 및 유틸리티

### 3.1. 기본 파싱 유틸리티
어댑터는 백엔드에서 오는 데이터(`unknown`)를 프론트엔드 타입 시스템에 맞게 캐스팅하지 않고, 방어적으로 파싱합니다.
*   `objectRecord(value)`: 값이 객체인지 확인하고 `Record<string, unknown>`으로 안전하게 변환합니다.
*   `recordArray(value)`: 값이 배열인지 확인하고 유효한 객체 배열만 필터링합니다.
*   `stringValue(value)`: 값이 존재할 경우 명시적으로 `string`으로 변환합니다.

### 3.2. 텍스트 치환 (Context Resolution)
백엔드에서 고정된 문구(`{{playerName}} 님 안녕하세요`)로 데이터가 넘어올 경우, 프론트엔드의 상태(인증 스토어 등)에 따라 동적으로 값을 바꿔주어야 합니다.
*   **처리 방식:** `normalizeMessengerBundle`와 같은 어댑터 호출 시 `textContext: StoryTextResolveContext` 객체를 넘깁니다. 
*   **내부 동작:** 어댑터 내부에서 `resolveStoryText` 함수를 거치며 정규식을 통해 매칭되는 텍스트를 실제 닉네임 등으로 치환합니다.

### 3.3. 액션(버튼) 파싱
백엔드의 명세가 변경되거나 노드마다 액션 데이터 키값이 다를 수 있습니다(`inputValue`, `actionType`, `title` 등).
*   **처리 방식:** `normalizeMessengerActions` 함수에서 여러 fallback 속성명(`stringValue(action.label) ?? stringValue(action.text) ?? ...`)을 검사하여, UI 컴포넌트가 항상 일정하게 요구하는 규격(`MessengerAction`)으로 뱉어냅니다.

---

## 4. 구체적인 동작 예시 (Code Examples)

### 4.1 스토어의 역할 축소 (Before & After)

**[Before] 기존 스토어 코드:**
```typescript
function applyStoryNodeOutputBundle(node: StoryNode) {
  // 스토어에서 직접 raw 데이터를 까보고 분기 처리함
  const scene = node.outputBundle?.scene;
  if (scene && typeof scene === "object") {
    useLucasStore.getState().setGlitchLevel(Number(scene.glitchLevel ?? 0));
    if (scene.mode === "browser" || node.code.includes("NEWS")) {
      useWindowStore.getState().openWindow("browser", "Web Browser", "chrome");
    }
  }
}
```

**[After] 어댑터를 거친 깔끔한 스토어 로직:**
```typescript
function applyStoryNodeOutputBundle(node: StoryNode) {
  const outputBundle = node.outputBundle;
  if (!outputBundle) return;

  // 1. 어댑터를 통해 데이터를 무조건 안전한 객체로 정규화
  const normalizedOutput = normalizeStoryOutputBundle(outputBundle);
  useLucasStore.getState().setGlitchLevel(normalizedOutput.scene.glitchLevel);

  // 2. 브라우저 오픈 여부 결정도 어댑터 층으로 캡슐화
  if (shouldOpenBrowserForStoryNode(node, normalizedOutput)) {
    useWindowStore.getState().openWindow("browser", "Web Browser", "chrome");
  }
}
```

### 4.2 텍스트 동적 치환 (Text Resolution) 동작 원리

백엔드에서 `"{{playerName}}님, 안녕하세요!"` 라는 문자열을 내려주면 프론트엔드는 이를 유저 닉네임으로 변환해야 합니다.

**어댑터 사용 로직 (`normalizeMessengerBundle` 내부):**
```typescript
// 스토어에서는 아래와 같이 textContext 객체를 주입합니다.
const conversation = normalizeMessengerBundle(outputBundle, node, {
  playerName: "주동니" // getAuthenticatedPlayerName()
});

// 어댑터 내부 구현 원리:
export function resolveStoryText(
  text: unknown, 
  context: StoryTextResolveContext
): string {
  const str = stringValue(text) ?? "";
  if (!str) return "";

  // 정규식을 돌며 {{playerName}} 등을 context에 맞게 치환
  return str.replace(/\{\{\s*(\w+)\s*\}\}/g, (match, key) => {
    if (key === "playerName" && context.playerName) return context.playerName;
    return match; // 없으면 원본 그대로 반환
  });
}
```

### 4.3 방어적 파싱 유틸리티 동작 원리

백엔드 명세와 다르게 데이터가 내려올 경우를 대비해 캐스팅(as) 대신 유틸리티 함수를 씁니다.

```typescript
export function normalizeStoryOutputBundle(rawBundle: unknown) {
  // rawBundle이 null, 배열, 문자열 등으로 잘못 오면 빈 객체 {} 로 안전하게 래핑
  const root = objectRecord(rawBundle) ?? {};
  
  return {
    raw: root,
    // scene 객체가 없거나 이상해도 최소한의 fallback 구조 반환
    scene: {
      id: stringValue(objectRecord(root.scene)?.id),
      glitchLevel: Number(objectRecord(root.scene)?.glitchLevel ?? 0),
    },
    // messages가 엉뚱한 타입이어도 항상 배열 반환 보장
    messages: recordArray(root.messages), 
  };
}
```

---

## 5. 향후 개발 가이드라인 (Rules for Development)

앞으로 스토리 시스템에 새로운 피처(예: 오디오 재생, 미니게임 UI 연동, 새로운 알림 형식)가 추가될 때 다음 원칙을 따르세요.

### 🚨 Rule 1: 스토어에서 직접 Raw Data를 조작하지 마세요.
`storyRuntime.store.ts` 내부에서 `if (outputBundle.someNewFeature)`와 같이 직접 접근하거나 파싱하지 마세요.
반드시 `outputBundle.adapters.ts`에 새로운 정규화 함수(예: `normalizeAudioBundle`)를 만들고, 이를 스토어에서 호출하여 사용하세요.

### 🚨 Rule 2: 조건 및 비즈니스 로직은 어댑터에 캡슐화하세요.
특정 UI를 띄워야 하는 조건(예: 브라우저 팝업 조건)은 `shouldOpenBrowserForStoryNode` 처럼 별도의 함수로 추상화하세요. 스토어는 조건이 복잡해지는 것을 몰라도 되며 그저 "어댑터가 참을 반환하면 연다" 수준으로 유지해야 합니다.

### 🚨 Rule 3: `unknown`을 가정하고 방어적으로 코딩하세요.
백엔드 API 명세가 있더라도 네트워크 오류나 예상치 못한 예외 페이로드를 대비해야 합니다. 어댑터를 작성할 때는 `as Type` 과 같은 위험한 강제 캐스팅을 지양하고, `objectRecord()`, `typeof === 'string'` 등 타입 가드(Type Guard)를 적극 사용하여 프론트엔드가 터지는 상황(White Screen of Death)을 방지하세요.