# output_bundle 처리 흐름 가이드

## 1. 문서 목적

`story_nodes.output_bundle`은 백엔드가 프론트에게 내려주는 “현재 노드 화면 지시서”다.

이 문서는 `output_bundle`이 DB에서 출발해 프론트 화면에 반영되는 흐름을 설명한다.

| 질문 | 핵심 답 |
| --- | --- |
| 백엔드는 무엇을 내려주나 | 현재/다음 `StoryNode`와 그 안의 `outputBundle`을 내려준다. |
| 프론트는 어디서 받나 | `client.ts` -> `storyApi.ts` -> `storyRuntime.store.ts` 순서로 받는다. |
| 누가 화면별로 나누나 | `storyRuntime.store.ts`가 큰 분배를 하고, feature adapter가 세부 변환을 한다. |
| 클릭은 어떻게 다음 노드가 되나 | 프론트가 `inputValue`를 보내고, 백엔드가 `story_transitions`로 다음 노드를 결정한다. |

가장 중요한 원칙:

```text
프론트는 다음 노드를 직접 정하지 않는다. 프론트는 백엔드가 준 outputBundle을 화면 상태로 변환한다.
```

---

## 2. 전체 흐름 한 장 요약

```text
PostgreSQL story_nodes.output_bundle
  -> Spring Story API
  -> frontend/src/shared/api/client.ts
  -> frontend/src/shared/api/storyApi.ts
  -> frontend/src/features/story-runtime/storyNode.adapters.ts
  -> frontend/src/features/story-runtime/storyRuntime.store.ts
  -> feature adapter
  -> UI store
  -> 화면 컴포넌트
```

실제 실행 순서:

```text
1. 프론트가 스토리 시작 또는 전이 API를 호출한다.
2. 백엔드는 현재 노드 또는 다음 노드를 결정한다.
3. 백엔드는 노드의 outputBundle을 포함해서 응답한다.
4. 프론트는 백엔드 응답 DTO를 프론트 StoryNode로 정규화한다.
5. storyRuntimeStore가 currentNode를 갱신한다.
6. currentNode.outputBundle을 읽고 메신저, 브라우저, 루카스, 윈도우 상태로 나눈다.
7. UI는 raw outputBundle이 아니라 정리된 store 상태를 보고 렌더링한다.
8. 사용자가 클릭하면 submitStoryClick(inputValue)이 transition API를 호출한다.
9. 백엔드가 다음 노드를 반환하면 같은 흐름이 반복된다.
```

---

## 3. 왜 이렇게 나누는가

화면 컴포넌트가 raw `outputBundle`을 직접 해석하면 안 된다.

| 직접 해석하면 생기는 문제 | 분리했을 때 장점 |
| --- | --- |
| DB JSON 구조가 바뀌면 여러 컴포넌트를 수정해야 한다. | adapter 하나만 수정하면 된다. |
| nodeCode 조건문이 UI에 계속 쌓인다. | nodeCode 판단을 런타임/adapter로 모을 수 있다. |
| 메신저, 브라우저, 루카스 규칙이 뒤섞인다. | feature별 책임이 분리된다. |
| 디버깅 지점이 불명확하다. | API, 정규화, 분배, 렌더링 단계를 따로 볼 수 있다. |

현재 책임 분리:

| 계층 | 책임 |
| --- | --- |
| API 계층 | 백엔드 호출, 토큰 헤더, 응답 unwrap, 에러 변환 |
| 노드 adapter | 백엔드 `StoryNodeResponseDto`를 프론트 `StoryNode`로 변환 |
| story runtime | 현재 노드 저장, transition 호출, outputBundle 큰 분배 |
| feature adapter | outputBundle 일부를 feature 전용 모델로 변환 |
| UI component | 이미 정리된 store 상태를 화면에 표시 |

---

## 4. 백엔드와 프론트의 책임 경계

| 구분 | 담당 |
| --- | --- |
| 현재 노드 조회 | 백엔드 |
| 입력값 검증 | 백엔드 |
| `story_transitions` 조회 | 백엔드 |
| 다음 노드 결정 | 백엔드 |
| 다음 노드 `outputBundle` 반환 | 백엔드 |
| 메신저 창 열기 | 프론트 |
| 브라우저 창 열기 | 프론트 |
| 기사 화면 렌더링 | 프론트 |
| 루카스 glitch 반영 | 프론트 |
| 클릭 이벤트를 API 요청으로 변환 | 프론트 |

즉 백엔드는 “무슨 장면인지”를 JSON으로 말하고, 프론트는 “그걸 어떻게 보여줄지”를 결정한다.

---

## 5. 백엔드 응답 예시

```json
{
  "id": 2,
  "nodeCode": "CH1_FRIEND_CHAT_OPEN",
  "nodeType": "narrative",
  "outputBundle": {
    "scene": { "id": "CH1_FRIEND_CHAT_OPEN", "mode": "desktop", "bgm": "rain", "glitchLevel": 0 },
    "content": { "friendMessage": { "linkLabel": "기사 보기", "thumbnail": "missing_people_news_thumb" } },
    "messages": [
      { "channel": "chat", "speaker": "FRIEND", "text": "{플레이어 이름}! 이 기사 봤어?" }
    ]
  },
  "promptType": "click",
  "promptMeta": {},
  "checkpoint": false,
  "terminal": false
}
```

| 필드 | 의미 |
| --- | --- |
| `id` | transition 요청 때 필요한 현재 노드 ID |
| `nodeCode` | 사람이 읽는 노드 식별자 |
| `nodeType` | narrative, console, network 등 노드 타입 |
| `outputBundle` | 프론트가 화면에 반영할 장면 데이터 |
| `promptType` | 이 노드에서 기대하는 입력 방식 |
| `checkpoint`, `terminal` | 체크포인트/종료 노드 여부 |

---

## 6. 파일별 역할

| 파일 | 역할 | 왜 필요한가 |
| --- | --- | --- |
| `frontend/src/shared/api/client.ts` | API 공통 처리 | URL 조립, 토큰 헤더, `BaseResponse.data` unwrap, 에러 변환을 한 곳에서 처리한다. |
| `frontend/src/shared/api/storyApi.ts` | 스토리 API wrapper | `startStory`, `getCurrentNode`, `submitTransition`처럼 의미 있는 함수로 호출하게 한다. |
| `frontend/src/features/story-runtime/storyNode.adapters.ts` | 노드 응답 정규화 | `nodeCode -> code`, `checkpoint -> isCheckpoint` 같은 이름 차이를 흡수한다. |
| `frontend/src/features/story-runtime/storyRuntime.store.ts` | 런타임 중심 | 현재 노드 저장, 시작/전이 API 호출, outputBundle 분배를 담당한다. |
| `frontend/src/features/messenger/messenger.adapters.ts` | 메신저 변환 | raw outputBundle을 `MessengerConversation`으로 바꾼다. |
| `frontend/src/app/store/messengerStore.ts` | 메신저 상태 | 대화, 알림, 창 열림, 읽음 상태를 관리한다. |
| `frontend/src/features/messenger/MessengerNotificationCard.tsx` | 우측 하단 알림 | 새 메시지 알림을 보여주고 최초 `open_friend_chat` 전이를 실행한다. |
| `frontend/src/features/messenger/MessengerWindow.tsx` | 채팅창 | 대화와 링크 액션을 렌더링하고 클릭 시 transition을 호출한다. |
| `frontend/src/app/store/windowStore.ts` | 일반 OS 창 상태 | 브라우저 같은 창의 open/focus/z-index/minimize를 관리한다. |
| `frontend/src/features/Browser/components/NewsTab.tsx` | 뉴스/기사 화면 | `newsCards`, `articleTitle`, `articleBody`를 표시한다. |

---

## 7. API 계층

### `client.ts`

`client.ts`는 fetch 공통 래퍼다. 스토리 전용 파일이 아니다.

| 처리 | 내용 |
| --- | --- |
| URL 생성 | `env.apiBaseUrl + path` |
| 인증 | `Authorization: Bearer ...` 헤더 추가 |
| 요청 body | JSON 직렬화 |
| 성공 응답 | 백엔드 `BaseResponse<T>`에서 `data`만 반환 |
| 실패 응답 | `ProblemDetail` 형태로 변환 |

### `storyApi.ts`

| 함수 | HTTP | 의미 |
| --- | --- | --- |
| `startStory(chapterCode)` | `POST /api/v1/story/start` | 챕터 시작 노드 요청 |
| `getCurrentNode()` | `GET /api/v1/story/current` | 현재 진행 노드 요청 |
| `submitTransition(request)` | `POST /api/v1/story/transitions` | 클릭/명령어/선택 전이 요청 |

컴포넌트는 URL을 직접 알 필요가 없다. 런타임 store가 `storyApi` 함수를 호출한다.

---

## 8. 노드 정규화 계층

파일: `frontend/src/features/story-runtime/storyNode.adapters.ts`

| 백엔드 | 프론트 |
| --- | --- |
| `id` | `id` |
| `nodeCode` | `code` |
| `nodeType` | `nodeType` |
| `outputBundle` | `outputBundle` |
| `promptType` | `promptType` |
| `promptMeta` | `promptMeta` |
| `checkpoint` | `isCheckpoint` |
| `terminal` | `isTerminal` |

흐름:

```text
StoryNodeResponseDto -> normalizeStoryNodeResponse() -> StoryNode
```

이후 프론트 내부에서는 `response.nodeCode`가 아니라 `currentNode.code`를 사용한다.

---

## 9. 스토리 런타임 계층

파일: `frontend/src/features/story-runtime/storyRuntime.store.ts`

| 함수 | 역할 |
| --- | --- |
| `initializeStory(chapterCode)` | 스토리 진입 시 시작 노드를 요청하고 currentNode를 세팅한다. |
| `setCurrentNode(node)` | 현재 노드를 저장하고 outputBundle 분배를 실행한다. |
| `submitStoryClick(inputValue)` | 현재 `nodeId`와 `inputValue`로 transition API를 호출한다. |
| `applyStoryNodeOutputBundle(node)` | outputBundle을 읽고 feature별 store로 나눈다. |

현재 분배 규칙:

| outputBundle 필드 | 처리 |
| --- | --- |
| `scene.glitchLevel` | `lucasStore.setGlitchLevel()` |
| `scene.mode === "browser"` | 브라우저 창 열기 |
| `node.code`에 `NEWS` 또는 `ARTICLE` 포함 | 브라우저 창 열기 |
| `messages[channel="chat"]` | 메신저 대화로 변환 |
| `notifications[type="chat"]` | 메신저 제목/부제목 후보 |
| `content.friendMessage.linkLabel` | 메신저 링크 action label 후보 |

---

## 10. 메신저 변환 방식

파일: `frontend/src/features/messenger/messenger.adapters.ts`

목표:

```text
raw outputBundle -> MessengerConversation
```

| outputBundle 값 | 변환 결과 |
| --- | --- |
| `messages[channel="chat"]` | `conversation.messages` |
| `notifications[type="chat"].title` | `conversation.title` |
| `notifications[type="chat"].body` | `conversation.subtitle` |
| `content.friendMessage.linkLabel` | `conversation.actions[].label` |
| `node.code` | 어떤 actionType을 만들지 판단 |

현재 DB `outputBundle`에는 명시적인 `actions`가 없다. 그래서 adapter가 nodeCode를 보고 임시 action을 만든다.

| nodeCode | label | actionType |
| --- | --- | --- |
| `CH1_FRIEND_CHAT_PUSH` | `채팅 열기` | `open_friend_chat` |
| `CH1_FRIEND_CHAT_OPEN` | `기사 보기` | `friend_message_link` |

장기적으로는 DB에 명시적인 action을 넣는 것이 더 좋다.

```json
{
  "actions": [
    { "label": "기사 보기", "actionType": "click", "inputValue": "friend_message_link" }
  ]
}
```

---

## 11. 알림 클릭과 채팅 열기

파일: `frontend/src/features/messenger/MessengerNotificationCard.tsx`

현재 UX에서는 우측 하단 알림 클릭이 곧 “채팅 열기”다.

알림 클릭 시 실행:

```text
1. messengerStore.openMessengerWindow()
2. conversation.actions 안에 open_friend_chat이 있으면 submitStoryClick("open_friend_chat")
```

이 처리가 없으면 사용자는 이미 알림을 눌러 채팅창을 열었는데도, 시스템상 노드는 아직 `CH1_FRIEND_CHAT_PUSH`에 머문다.

그래서 채팅창 안에서 `채팅 열기`를 한 번 더 눌러야 하는 문제가 생긴다.

---

## 12. 기사 보기 클릭 흐름

`기사 보기`는 단순 링크가 아니다. 다음 노드 전이를 발생시키는 action이다.

```text
MessengerWindow
  -> submitStoryClick("friend_message_link")
  -> storyApi.submitTransition()
  -> POST /api/v1/story/transitions
  -> 백엔드가 story_transitions 조회
  -> nextNode 반환
  -> storyRuntimeStore.setCurrentNode(nextNode)
  -> applyStoryNodeOutputBundle(nextNode)
```

transition 요청 body:

```json
{ "nodeId": 2, "actionType": "click", "inputValue": "friend_message_link" }
```

프론트가 보내는 것은 “사용자가 무엇을 눌렀는지”다. 다음 노드는 백엔드가 결정한다.

---

## 13. 뉴스/기사 처리 방식

파일: `frontend/src/features/Browser/components/NewsTab.tsx`

`NewsTab`은 현재 노드의 `outputBundle.content`를 읽는다.

| content 필드 | 화면 |
| --- | --- |
| `newsCards` | 뉴스 목록 카드 |
| `articleTitle` | 기사 상세 제목 |
| `articleBody` | 기사 상세 본문 |

뉴스 카드 클릭 흐름:

```text
card.id === "dark_article"
  -> submitStoryClick("dark_article")
  -> 백엔드 transition 판정
  -> nextNode 반환
  -> 기사 상세 outputBundle 표시
```

---

## 14. 1~4번 노드 실제 흐름

| 단계 | 노드/행동 | 프론트 처리 |
| --- | --- | --- |
| 1 | `CH1_FRIEND_CHAT_PUSH` | `messages[channel=chat]`를 우측 하단 새 메시지 알림으로 표시 |
| 2 | 유저가 알림 클릭 | `open_friend_chat` 전이를 자동 호출 |
| 3 | `CH1_FRIEND_CHAT_OPEN` | `content.friendMessage.linkLabel`로 채팅창 안에 `<기사 보기>` 링크 카드 표시 |
| 4 | 유저가 기사 보기 클릭 | `friend_message_link` 전이 호출 |
| 5 | `CH1_NEWS_PORTAL` | 브라우저 창 열고 `content.newsCards` 표시 |
| 6 | 유저가 `dark_article` 카드 클릭 | `dark_article` 전이 호출 |
| 7 | `CH1_DARK_ARTICLE_OPEN` | `articleTitle/articleBody`로 기사 상세 표시 |

---

## 15. 자동화된 것과 아닌 것

| 자동화된 것 | 설명 |
| --- | --- |
| 노드 갱신 | transition 응답의 `nextNode`가 currentNode가 된다. |
| outputBundle 분배 | currentNode가 바뀌면 `applyStoryNodeOutputBundle()`이 실행된다. |
| 메신저 변환 | chat 메시지가 있으면 `MessengerConversation`으로 바뀐다. |
| 브라우저 열기 | browser mode 또는 NEWS/ARTICLE 노드면 브라우저 창이 열린다. |
| 뉴스/기사 표시 | `newsCards`, `articleTitle`, `articleBody`가 화면에 반영된다. |

| 아직 자동화되지 않은 것 | 이유 |
| --- | --- |
| 모든 버튼 자동 생성 | 일부 action은 nodeCode 기반 하드코딩이다. |
| placeholder 치환 | `{플레이어 이름}` 치환 계층이 없다. |
| BGM | `scene.bgm`은 아직 오디오 런타임에 연결되지 않았다. |
| 배경화면/openWindows | `desktopState` 처리 규칙이 없다. |
| 메신저 Window 편입 | 메신저는 아직 일반 `Window` 시스템 밖의 오버레이다. |

---

## 16. 새 필드가 생기면 어디를 수정하나

| 새 요구사항 | 우선 확인 파일 |
| --- | --- |
| 메신저 메시지 shape 변경 | `messenger.adapters.ts` |
| 메신저 버튼 추가 | 단기: `messenger.adapters.ts`, 장기: DB `outputBundle.actions` |
| 우측 하단 알림 동작 변경 | `MessengerNotificationCard.tsx`, `messengerStore.ts` |
| 채팅창 UI 변경 | `MessengerWindow.tsx` |
| 브라우저 자동 열기 규칙 변경 | `storyRuntime.store.ts` |
| 뉴스 카드/기사 본문 변경 | `NewsTab.tsx` |
| 루카스 연출 추가 | `storyRuntime.store.ts`, `lucasStore` |
| 일반 창 포커스/z-index 변경 | `windowStore.ts`, `Window/index.tsx` |
| BGM 추가 | 새 오디오 런타임 필요 |
| 네트워크 탭 데이터 추가 | Browser/DevTools 전용 adapter 필요 |

---

## 17. 디버깅 순서

```text
1. Network 탭에서 story API 응답 확인
2. response.data.nodeCode 확인
3. response.data.outputBundle 확인
4. normalizeStoryNodeResponse 이후 currentNode.code 확인
5. storyRuntimeStore.currentNode 확인
6. messengerStore.conversation 확인
7. conversation.actions 확인
8. transition 요청 body의 inputValue 확인
9. story_transitions.expected_input과 inputValue 비교
10. transition 응답의 nextNode 확인
```

| 증상 | 먼저 볼 곳 |
| --- | --- |
| 메시지는 뜨는데 버튼이 없다 | `messenger.adapters.ts`의 action 생성 로직 |
| 버튼 눌러도 다음 노드가 안 간다 | transition 요청 `inputValue`와 DB `expected_input` |
| 다음 노드는 왔는데 화면이 안 바뀐다 | `applyStoryNodeOutputBundle()` 분배 규칙 |
| 기사 창이 뒤에 뜬다 | `windowStore.ts`의 z-index, `MessengerWindow.tsx`의 z-index |
| 알림 클릭 후 채팅 열기를 또 눌러야 한다 | `MessengerNotificationCard.tsx`의 `open_friend_chat` 자동 전이 |

---

## 18. 장기 TODO

1. `outputBundle.actions`를 DB schema/seed에 명시해서 프론트 nodeCode 하드코딩을 줄인다.
2. `{플레이어 이름}` 같은 placeholder 치환 계층을 만든다.
3. `scene.bgm`을 오디오 런타임에 연결한다.
4. `desktopState.wallpaper`, `desktopState.openWindows`를 Desktop/windowStore에 연결한다.
5. 메신저 창을 일반 `Window` 컴포넌트/windowStore에 편입한다.
6. 네트워크/개발자도구용 outputBundle adapter를 만든다.
7. 새로 시작과 이어하기 UX가 정해지면 `startStory()`와 `getCurrentNode()` 호출 기준을 분리한다.

---

## 19. 최종 요약

```text
백엔드: 현재 노드와 다음 노드를 결정한다.
outputBundle: 현재 노드를 화면에 어떻게 보여줄지 담는다.
client/storyApi: 백엔드와 통신한다.
storyNode adapter: 백엔드 DTO를 프론트 StoryNode로 바꾼다.
storyRuntimeStore: 현재 노드를 저장하고 outputBundle을 분배한다.
feature adapter: outputBundle 일부를 feature 전용 상태로 바꾼다.
UI: 정리된 store 상태를 보고 렌더링한다.
클릭: inputValue로 백엔드에 보내고, 백엔드가 다음 노드를 결정한다.
```
