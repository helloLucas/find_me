# Chapter 2 결정 문서 04: Active Tab Lock API 설계

## 1. 결정 요약

Chapter 2는 유저별로 하나의 최신 진행 상태를 가진다.

```text
user_story_progress.latest_snapshot_json
= 유저별 최신 진행 상태
```

따라서 같은 유저가 여러 브라우저 탭에서 동시에 명령을 입력하면 `cwd`, `nodeCode`, `snapshotVersion`, `vfsOverlay`가 꼬일 수 있다.

이를 방지하기 위해 Chapter 2에서는 **유저 + 챕터 단위로 하나의 active tab만 command 입력을 허용**한다.

```text
같은 유저의 같은 챕터에서는
한 번에 하나의 탭만 명령 입력 가능
```

Active tab 권한은 프론트에서만 관리하지 않는다.

프론트는 입력창 비활성화, 안내 UI, 버튼 렌더링 등 UX만 담당한다.

최종 권한 판단은 백엔드가 Redis에 저장된 active tab 정보를 기준으로 수행한다.

```text
프론트
- 입력창 활성/비활성
- "다른 탭에서 플레이 중" 안내
- "이 탭에서 계속하기" 버튼 표시
- API 응답 기반 상태 갱신 및 재렌더링

백엔드
- active tab 권한 저장
- command 요청마다 tabId 검증
- snapshotVersion 검증
- 실제 명령 실행 여부 판단
```

---

## 2. 최종 결정 사항

```text
- Active tab lock은 Redis 기반으로 관리한다.
- tabId는 프론트에서 탭마다 생성한다.
- active tab 정보는 백엔드가 Redis에 저장한다.
- command/click 처리 요청마다 tabId를 함께 보낸다.
- 백엔드는 transition 처리 전 active tab 여부를 반드시 검증한다.
- 백엔드는 snapshotVersion도 함께 검증한다.
- active tab이 아닌 탭에서는 명령을 실행하지 않는다.
- 비활성 탭은 프론트에서 입력창을 막는다.
- "이 탭에서 계속하기"를 누르면 active tab 권한을 현재 탭으로 가져온다.
- "이 탭에서 계속하기"는 브라우저 새로고침이 아니라 상태 재조회 및 재렌더링으로 처리한다.
```

---

## 3. Active Tab Lock이 필요한 이유

Chapter 2에서는 유저별 최신 상태가 하나만 존재한다.

예를 들어 같은 유저가 A 탭과 B 탭을 열어둔 상황을 가정한다.

```text
A 탭 화면: guest@lucas-server:~$
B 탭 화면: guest@lucas-server:~$
```

B 탭에서 다음 명령을 입력한다.

```bash
cd sys
```

그러면 서버의 유저별 최신 상태는 다음처럼 변경된다.

```json
{
  "terminal": {
    "cwd": "/home/guest/sys"
  }
}
```

이때 A 탭이 여전히 예전 상태로 명령을 보낼 수 있으면, 화면과 서버 상태가 어긋난다.

```text
A 탭 화면은 아직 ~ 라고 생각함
서버 상태는 이미 ~/sys
```

이 문제를 피하기 위해 하나의 유저/챕터에는 하나의 active tab만 명령 입력을 허용한다.

---

## 4. 전체 UX 시나리오

## 4-1. 최초 진입

A 탭에서 Chapter 2에 진입한다.

```http
POST /api/v1/story/start
```

요청:

```json
{
  "chapterCode": "week02",
  "tabId": "tab-a"
}
```

현재 active tab이 없으면 서버는 A 탭을 active tab으로 등록한다.

응답:

```json
{
  "chapterCode": "week02",
  "nodeCode": "CH2_SERVER_HOME",
  "snapshotVersion": 1,
  "activeTab": {
    "isActive": true,
    "tabId": "tab-a",
    "ttlSeconds": 60
  },
  "renderState": {
    "inputEnabled": true,
    "prompt": "guest@lucas-server:~$"
  }
}
```

A 탭은 입력 가능 상태가 된다.

---

## 4-2. 다른 탭에서 같은 챕터 진입

B 탭에서도 Chapter 2에 진입한다.

```http
POST /api/v1/story/start
```

요청:

```json
{
  "chapterCode": "week02",
  "tabId": "tab-b"
}
```

이미 A 탭이 active tab이면 서버는 B 탭을 비활성 상태로 응답한다.

응답:

```json
{
  "chapterCode": "week02",
  "nodeCode": "CH2_EXPLORATION_READY",
  "snapshotVersion": 7,
  "activeTab": {
    "isActive": false,
    "canAcquire": true
  },
  "renderState": {
    "inputEnabled": false,
    "prompt": "guest@lucas-server:~$",
    "inactiveMessage": "다른 탭에서 플레이 중입니다."
  }
}
```

B 탭은 화면은 볼 수 있지만 명령 입력창은 비활성화한다.

표시 문구 예시:

```text
다른 탭에서 플레이 중입니다.
이 탭에서 계속하려면 [이 탭에서 계속하기]를 눌러주세요.
```

---

## 4-3. B 탭에서 “이 탭에서 계속하기” 클릭

B 탭 사용자가 버튼을 누른다.

```http
POST /api/v1/story/active-tab/acquire
```

요청:

```json
{
  "chapterCode": "week02",
  "tabId": "tab-b"
}
```

서버는 Redis의 active tab 값을 B 탭으로 변경한다.

```text
active-tab:story:{userId}:week02 = tab-b
```

서버는 active tab 변경 결과와 함께 최신 snapshot 및 렌더링 상태를 반환한다.

응답:

```json
{
  "activeTab": {
    "isActive": true,
    "tabId": "tab-b",
    "ttlSeconds": 60
  },
  "chapterCode": "week02",
  "nodeCode": "CH2_EXPLORATION_READY",
  "snapshotVersion": 8,
  "snapshot": {
    "terminal": {
      "cwd": "/home/guest/sys",
      "promptUser": "guest",
      "promptHost": "lucas-server"
    },
    "scanPercent": 0,
    "flags": {
      "chapter2_started": true,
      "chapter2_file_list_checked": true
    }
  },
  "renderState": {
    "inputEnabled": true,
    "prompt": "guest@lucas-server:~/sys$"
  }
}
```

B 탭은 브라우저 새로고침을 하지 않는다.

프론트는 응답을 Zustand 또는 TanStack Query cache에 반영하고, React가 자동으로 재렌더링한다.

```text
새로고침 아님
상태 갱신 → React 재렌더링
```

---

## 4-4. A 탭은 어떻게 되는가

A 탭은 다음 중 하나의 시점에 자신이 더 이상 active tab이 아니라는 사실을 알 수 있다.

```text
1. heartbeat 응답에서 active=false를 받았을 때
2. focus 시 active-tab/status를 조회했을 때
3. transition 요청을 보냈는데 INACTIVE_TAB 응답을 받았을 때
4. 같은 브라우저 안에서 BroadcastChannel 이벤트를 받았을 때
```

MVP에서는 heartbeat 또는 다음 요청 시점에 알게 해도 충분하다.

A 탭은 active tab이 아니게 되면 입력창을 비활성화한다.

```json
{
  "activeTab": {
    "isActive": false,
    "canAcquire": true
  },
  "renderState": {
    "inputEnabled": false,
    "inactiveMessage": "다른 탭에서 플레이 중입니다."
  }
}
```

---

## 5. 새로고침이 필요한가

새로고침은 필요 없다.

“이 탭에서 계속하기”는 다음 흐름으로 처리한다.

```text
1. 사용자가 [이 탭에서 계속하기] 클릭
2. 프론트가 active-tab/acquire API 호출
3. 백엔드가 active tab을 현재 tabId로 변경
4. 백엔드가 최신 snapshot, nodeCode, renderState를 반환
5. 프론트가 상태 저장소를 갱신
6. React가 자동으로 재렌더링
7. 입력창이 활성화되고 최신 prompt가 표시됨
```

프론트 처리 예시:

```text
TanStack Query refetch 또는 cache update
Zustand store update
↓
React component re-render
```

---

## 6. 터미널 히스토리 처리 정책

Active tab 전환 시 터미널 히스토리에 동기화 로그를 찍지 않는다.

비추천:

```text
[SYNC] 다른 탭에서 세션 위치가 변경되었습니다.
[SYNC] current directory: /home/guest/sys
```

이런 로그는 게임 내부 터미널 출력처럼 보여 몰입감을 해칠 수 있다.

권장 정책:

```text
- 터미널 히스토리에 SYNC 로그를 추가하지 않는다.
- 현재 입력줄과 입력 가능 상태만 최신 snapshot 기준으로 갱신한다.
- 필요하면 터미널 밖 UI 영역에 안내 메시지를 표시한다.
```

예시 UI 문구:

```text
다른 탭에서 진행 상태가 변경되어 최신 상태로 갱신되었습니다.
```

이 문구는 터미널 출력이 아니라 UI 알림으로 표시한다.

---

## 7. 현재 입력줄과 히스토리 분리

프론트 터미널 UI는 다음 두 영역을 분리한다.

```text
터미널 히스토리 영역
- 이미 실행된 명령
- 서버가 반환한 명령 결과
- 스토리 출력

현재 입력줄
- 현재 prompt
- 사용자가 타이핑 중인 input
```

이미 히스토리에 출력된 과거 prompt는 수정하지 않는다.

하지만 아직 실행 전인 현재 입력줄의 prompt는 최신 snapshot 기준으로 바꿀 수 있다.

```text
과거 히스토리: 수정하지 않음
현재 입력줄: 최신 cwd 기준으로 표시 가능
```

---

## 8. API 설계

## 8-1. `POST /api/v1/story/start`

### 역할

```text
- 챕터 시작 또는 이어하기
- 최신 node / snapshot 반환
- active tab 상태 반환
- active tab이 없으면 현재 tab을 active로 등록 가능
```

### 요청

```json
{
  "chapterCode": "week02",
  "tabId": "tab-a"
}
```

### 응답: active tab 획득 성공

```json
{
  "chapterCode": "week02",
  "nodeCode": "CH2_SERVER_HOME",
  "snapshotVersion": 1,
  "activeTab": {
    "isActive": true,
    "tabId": "tab-a",
    "ttlSeconds": 60
  },
  "renderState": {
    "inputEnabled": true,
    "prompt": "guest@lucas-server:~$"
  }
}
```

### 응답: 다른 active tab 존재

```json
{
  "chapterCode": "week02",
  "nodeCode": "CH2_EXPLORATION_READY",
  "snapshotVersion": 7,
  "activeTab": {
    "isActive": false,
    "canAcquire": true
  },
  "renderState": {
    "inputEnabled": false,
    "prompt": "guest@lucas-server:~$",
    "inactiveMessage": "다른 탭에서 플레이 중입니다."
  }
}
```

---

## 8-2. `POST /api/v1/story/active-tab/acquire`

### 역할

```text
- 현재 탭을 active tab으로 등록한다.
- 기존 active tab 권한을 현재 탭으로 이전한다.
- 최신 snapshot과 renderState를 반환한다.
```

### 요청

```json
{
  "chapterCode": "week02",
  "tabId": "tab-b"
}
```

### 응답

```json
{
  "activeTab": {
    "isActive": true,
    "tabId": "tab-b",
    "ttlSeconds": 60
  },
  "chapterCode": "week02",
  "nodeCode": "CH2_EXPLORATION_READY",
  "snapshotVersion": 8,
  "snapshot": {
    "terminal": {
      "cwd": "/home/guest/sys",
      "promptUser": "guest",
      "promptHost": "lucas-server"
    },
    "scanPercent": 0,
    "flags": {
      "chapter2_started": true,
      "chapter2_file_list_checked": true
    }
  },
  "renderState": {
    "inputEnabled": true,
    "prompt": "guest@lucas-server:~/sys$"
  }
}
```

---

## 8-3. `POST /api/v1/story/active-tab/heartbeat`

### 역할

```text
- active tab TTL을 갱신한다.
- 현재 탭이 active tab인지 확인한다.
```

### 요청

```json
{
  "chapterCode": "week02",
  "tabId": "tab-b"
}
```

### 응답: active 유지

```json
{
  "active": true,
  "ttlSeconds": 60
}
```

### 응답: active tab 아님

```json
{
  "active": false,
  "canAcquire": true
}
```

---

## 8-4. `POST /api/v1/story/active-tab/release`

### 역할

```text
- 현재 탭이 active tab인 경우 active tab 권한을 해제한다.
- 탭 종료, 챕터 이탈, 로그아웃 시 호출할 수 있다.
```

### 요청

```json
{
  "chapterCode": "week02",
  "tabId": "tab-b"
}
```

### 응답

```json
{
  "released": true
}
```

주의:

```text
release 호출은 best effort로 본다.
브라우저 탭 종료 시 항상 성공한다고 가정하지 않는다.
최종 정리는 Redis TTL 만료에 맡긴다.
```

---

## 8-5. `GET /api/v1/story/active-tab/status`

### 역할

```text
- 현재 탭이 active tab인지 조회한다.
- focus 또는 visibilitychange 시 호출할 수 있다.
```

### 요청 쿼리 예시

```text
chapterCode=week02&tabId=tab-b
```

### 응답

```json
{
  "activeTab": {
    "isActive": true,
    "canAcquire": false
  },
  "snapshotVersion": 8,
  "renderState": {
    "inputEnabled": true,
    "prompt": "guest@lucas-server:~/sys$"
  }
}
```

---

## 8-6. `POST /api/v1/story/transitions`

### 역할

```text
- 실제 command/click 처리
- active tab 검증
- snapshotVersion 검증
- 명령 실행
- snapshot 갱신
```

### 요청

```json
{
  "chapterCode": "week02",
  "tabId": "tab-b",
  "snapshotVersion": 8,
  "actionType": "command",
  "input": "cd sys"
}
```

### 처리 순서

```text
1. tabId가 active tab인지 검증
2. snapshotVersion이 최신인지 검증
3. story transition 또는 TerminalCommandService 처리
4. snapshot 갱신
5. snapshotVersion 증가
6. 응답 반환
```

### active tab이 아닌 경우

```json
{
  "transitionResult": "INACTIVE_TAB",
  "message": "다른 탭에서 플레이 중입니다.",
  "activeTab": {
    "isActive": false,
    "canAcquire": true
  }
}
```

### snapshotVersion이 오래된 경우

```json
{
  "transitionResult": "STALE_STATE",
  "message": "최신 진행 상태로 갱신이 필요합니다.",
  "latestSnapshotVersion": 9
}
```

---

## 9. Redis 설계

## 9-1. Redis key

```text
active-tab:story:{userId}:{chapterCode}
```

예시:

```text
active-tab:story:42:week02
```

## 9-2. Redis value

```json
{
  "tabId": "tab-b",
  "chapterCode": "week02",
  "snapshotVersion": 8,
  "acquiredAt": "2026-04-28T12:00:00+09:00"
}
```

## 9-3. TTL

MVP 추천값:

```text
TTL: 60초
heartbeat 주기: 20초
```

정책:

```text
- heartbeat 성공 시 TTL을 다시 60초로 갱신한다.
- heartbeat가 끊기면 TTL 만료 후 active tab 권한이 사라진다.
- active tab이 없는 상태에서 start 또는 acquire가 오면 해당 탭이 active tab을 얻을 수 있다.
```

---

## 10. 백엔드 서비스 구조

## 10-1. `ActiveTabService`

역할:

```text
- acquire()
- heartbeat()
- release()
- status()
- validateActiveTab()
```

## 10-2. `StoryStartService`

역할:

```text
- Chapter 시작 또는 이어하기 처리
- user_story_progress 조회
- latest_snapshot_json 반환
- active tab 상태 반환
- active tab이 없으면 현재 tab 자동 등록 가능
```

## 10-3. `StoryTransitionService`

역할:

```text
- transition 요청 처리
- active tab 검증
- snapshotVersion 검증
- TerminalCommandService 또는 story_transitions 처리
- snapshot 갱신
- latest_node_id 갱신
```

## 10-4. `TerminalCommandService`

역할:

```text
- pwd, ls, cd, cat 등 일반 터미널 명령 처리
- VFS JSON + vfsOverlay 기준으로 effectiveVfs 생성
- STAY 응답 생성
```

---

## 11. AOP / Filter 사용 여부

AOP 또는 Filter 단독으로 active tab lock을 처리하지 않는다.

이유:

```text
- active tab 검증은 단순 인증/인가가 아니라 스토리 도메인 규칙이다.
- chapterCode, tabId, snapshotVersion, latest_snapshot_json이 필요하다.
- start, acquire, heartbeat, transition마다 검증 정책이 다르다.
```

따라서 Active tab 검증은 서비스 레벨에서 처리한다.

```text
StoryTransitionService
→ ActiveTabService.validateActiveTab()
→ SnapshotVersion 검증
→ Command 처리
```

공통 로깅이나 요청 추적에는 Filter/AOP를 쓸 수 있지만, active tab 판단의 핵심 로직을 Filter/AOP에 넣지는 않는다.

---

## 12. 프론트 처리 정책

## 12-1. tabId 생성

각 탭은 최초 로드 시 고유한 tabId를 생성한다.

```text
tabId = crypto.randomUUID()
```

보관 위치:

```text
sessionStorage
```

이유:

```text
- localStorage는 브라우저 탭 간 공유되므로 부적합
- sessionStorage는 탭 단위로 분리됨
```

## 12-2. command 요청

모든 transition 요청에 다음 값을 포함한다.

```json
{
  "tabId": "tab-b",
  "snapshotVersion": 8
}
```

## 12-3. 입력 비활성화

active tab이 아니면 명령 입력창을 비활성화한다.

```text
inputEnabled = false
```

## 12-4. 이 탭에서 계속하기

비활성 탭에는 버튼을 제공한다.

```text
[이 탭에서 계속하기]
```

클릭 시:

```text
POST /api/v1/story/active-tab/acquire
```

응답을 받은 뒤:

```text
- snapshot 갱신
- nodeCode 갱신
- prompt 갱신
- inputEnabled = true
- React 재렌더링
```

## 12-5. BroadcastChannel

MVP에서는 필수는 아니다.

추가하면 같은 브라우저 내 탭 간 active tab 변경을 빠르게 공유할 수 있다.

```text
BroadcastChannel("story-active-tab")
```

하지만 최종 권한 검증은 반드시 백엔드에서 한다.

---

## 13. transition 처리 검증 순서

`POST /api/v1/story/transitions` 요청이 들어오면 다음 순서로 처리한다.

```text
1. 인증 유저 확인
2. chapterCode 유효성 확인
3. active tab 검증
4. snapshotVersion 검증
5. 현재 node 확인
6. actionType 확인
7. story_transitions 매칭 또는 TerminalCommandService 처리
8. effect_bundle 적용
9. latest_snapshot_json 갱신
10. snapshotVersion 증가
11. story_action_logs 기록
12. 응답 반환
```

active tab 검증과 snapshotVersion 검증은 명령 실행 전에 반드시 수행한다.

---

## 14. 응답 코드 정책

| transitionResult | 의미 |
| --- | --- |
| `MOVE` | 스토리 노드 이동 성공 |
| `STAY` | 현재 노드 유지, 터미널 출력만 추가 |
| `INACTIVE_TAB` | active tab이 아닌 탭의 요청 |
| `STALE_STATE` | snapshotVersion이 오래된 요청 |
| `FAIL_WRONG_ORDER` | 순서가 맞지 않는 명령 |
| `FAIL_DANGEROUS` | 위험 명령어 |
| `GAME_OVER` | GC 스캔 100% 등 게임오버 |

---

## 15. 확정 사항

```text
- Active tab lock은 Redis로 관리한다.
- 프론트만으로 active tab을 신뢰하지 않는다.
- tabId는 프론트에서 탭마다 생성한다.
- tabId는 sessionStorage에 저장한다.
- transition 요청마다 tabId와 snapshotVersion을 보낸다.
- active tab 검증은 transition 처리 전에 백엔드에서 수행한다.
- snapshotVersion 검증도 transition 처리 전에 수행한다.
- "이 탭에서 계속하기"는 active-tab/acquire API로 처리한다.
- "이 탭에서 계속하기"는 새로고침이 아니라 상태 갱신 및 React 재렌더링으로 처리한다.
- 터미널 히스토리에 SYNC 로그를 남기지 않는다.
- 비활성 탭은 입력창을 비활성화하고 UI 안내만 표시한다.
- heartbeat로 Redis TTL을 갱신한다.
- release는 best effort로 처리하고 최종 정리는 TTL 만료에 맡긴다.
```
