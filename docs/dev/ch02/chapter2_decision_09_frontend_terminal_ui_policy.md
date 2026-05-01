# Chapter 2 결정 문서 09: 프론트 터미널 UI 정책

## 1. 결정 요약

Chapter 2의 프론트 터미널 UI는 **검증하지 않고 렌더링만 담당**한다.

명령어 검증, VFS 처리, story transition 판단, snapshot 갱신은 모두 백엔드에서 수행한다.

프론트는 사용자의 입력을 받고, 백엔드 응답을 화면에 반영하는 역할만 맡는다.

```text
프론트
- 입력 UI
- 터미널 히스토리 렌더링
- 현재 입력줄 렌더링
- active tab 상태에 따른 입력 비활성화
- 백엔드 응답 반영

백엔드
- 명령어 검증
- VFS 처리
- story transition 판단
- snapshot 갱신
- stdout / stderr / prompt 반환
```

프론트에는 다음 정보를 내려보내지 않는다.

```text
- 정답 명령어 목록
- VFS 전체 구조
- validator_config
- 다음 노드 조건
- 보호 코어 포함 여부 판단 로직
- tar 정답 파일 목록
```

---

## 2. 터미널 화면 구조

프론트 터미널은 다음 두 영역을 분리한다.

```text
1. 터미널 히스토리 영역
   - 이미 실행된 명령
   - 명령 결과
   - story output
   - Lucas 메시지

2. 현재 입력줄
   - 현재 prompt
   - 사용자가 타이핑 중인 input
```

핵심 정책:

```text
이미 히스토리에 찍힌 줄은 수정하지 않는다.
현재 입력줄은 최신 cwd / active tab 상태에 따라 바뀔 수 있다.
```

즉, 과거에 출력된 프롬프트는 로그로 남기고, 현재 입력 대기줄만 최신 상태 기준으로 다시 렌더링한다.

---

## 3. command echo 정책

현재 코드 구조에서는 프론트가 command echo를 직접 출력하고 있다.

따라서 1차 구현에서는 이 구조를 유지한다.

```text
1차 구현:
프론트가 사용자가 입력한 command echo 출력

백엔드:
stdout / stderr / cwd / prompt / transitionResult 반환
```

예를 들어 사용자가 다음 명령을 입력한다.

```bash
cd sys
```

프론트는 먼저 터미널 히스토리에 다음 줄을 추가한다.

```bash
guest@lucas-server:~$ cd sys
```

백엔드 응답을 받은 뒤 현재 입력줄의 prompt를 갱신한다.

```bash
guest@lucas-server:~/sys$
```

단, 이 구조에서는 `snapshotVersion`, `activeTab` 검증이 중요하다.

오래된 탭이나 비활성 탭에서는 명령 입력 자체를 막아야 echo 불일치가 생기지 않는다.

---

## 4. 비활성 탭 UI

active tab이 아닌 탭에서는 터미널 입력창을 비활성화한다.

터미널 로그 안에 동기화 메시지를 찍지 않는다.

비추천:

```text
[SYNC] 다른 탭에서 세션 위치가 변경되었습니다.
[SYNC] current directory: /home/guest/sys
```

이런 메시지는 게임 내부 터미널 출력처럼 보여 몰입감을 해칠 수 있다.

대신 터미널 바깥 또는 입력창 위에 UI 안내를 표시한다.

```text
다른 탭에서 플레이 중입니다.
이 탭에서 계속하려면 [이 탭에서 계속하기]를 눌러주세요.
```

버튼 클릭 시:

```text
POST /api/v1/story/active-tab/acquire
```

성공하면 프론트는 다음 상태를 갱신한다.

```text
- 최신 snapshot 반영
- nodeCode 반영
- cwd 반영
- prompt 반영
- inputEnabled = true
- React 재렌더링
```

새로고침은 하지 않는다.

---

## 5. “이 탭에서 계속하기” 처리

“이 탭에서 계속하기”는 브라우저 새로고침이 아니라, active tab 권한 획득과 상태 재렌더링으로 처리한다.

흐름:

```text
1. 사용자가 [이 탭에서 계속하기] 클릭
2. 프론트가 /active-tab/acquire API 호출
3. 백엔드가 activeTab을 현재 tabId로 변경
4. 백엔드가 최신 snapshot, nodeCode, renderState를 반환
5. 프론트가 Zustand 또는 TanStack Query cache를 최신 값으로 갱신
6. React가 변경된 상태를 보고 화면을 재렌더링
7. 입력창이 활성화되고 최신 prompt가 표시됨
```

기존 터미널 히스토리는 임의로 수정하지 않는다.

현재 입력줄만 최신 prompt 기준으로 바뀐다.

---

## 6. 현재 입력줄 갱신 정책

현재 입력줄은 아직 실행된 로그가 아니므로 최신 상태에 따라 변경 가능하다.

예:

```text
이전 입력줄:
guest@lucas-server:~$

active-tab acquire 성공 후:
guest@lucas-server:~/sys$
```

이건 과거 로그를 바꾸는 것이 아니다.

현재 입력 대기 prompt를 최신 snapshot 기준으로 다시 렌더링하는 것이다.

정책:

```text
- 터미널 히스토리는 유지한다.
- 현재 입력줄은 최신 prompt 기준으로 갱신한다.
- active tab이 아니면 현재 입력줄을 비활성화한다.
```

---

## 7. STAY 응답 렌더링

일반 터미널 명령은 `STAY`로 처리된다.

예:

```bash
cd sys
```

백엔드 응답 예시:

```json
{
  "transitionResult": "STAY",
  "terminalResult": {
    "stdout": [],
    "stderr": [],
    "cwd": "/home/guest/sys",
    "prompt": "guest@lucas-server:~/sys$"
  },
  "snapshotVersion": 9
}
```

프론트 처리:

```text
- stdout 줄 추가
- stderr 줄 추가
- cwd 갱신
- prompt 갱신
- nodeCode 유지
- snapshotVersion 갱신
```

STAY 응답은 현재 노드를 바꾸지 않는다.

---

## 8. MOVE 응답 렌더링

스토리 진행 명령은 `MOVE`로 처리된다.

예:

```bash
cat world_map.map
```

백엔드 응답 예시:

```json
{
  "transitionResult": "MOVE",
  "nodeCode": "CH2_WORLD_MAP_VIEW",
  "outputBundle": {
    "scene": {},
    "content": {
      "terminalOutput": [
        "[SESSION MAP UPDATE]",
        "..."
      ]
    },
    "messages": []
  },
  "snapshotVersion": 10
}
```

프론트 처리:

```text
- nodeCode 갱신
- outputBundle 렌더링
- Lucas 메시지 렌더링
- snapshotVersion 갱신
- prompt 갱신
```

MOVE 응답은 스토리 노드를 이동시킨다.

---

## 9. 터미널 출력 누적 정책

Chapter 2에서는 명령을 입력하면서 하나의 터미널 세션을 탐색하는 경험이 중요하다.

따라서 모든 노드 이동마다 화면 전체를 초기화하면 어색할 수 있다.

기본 정책은 다음과 같다.

```text
일반 STAY 명령
→ 기존 히스토리에 결과 append

스토리 MOVE 명령
→ 기본적으로 기존 히스토리에 output append

큰 장면 전환이 필요한 노드
→ outputBundle.scene.resetTerminal = true일 때만 히스토리 초기화
```

예시:

```json
{
  "scene": {
    "id": "CH2_RECOVERED_DOCUMENT",
    "mode": "terminal",
    "resetTerminal": true
  }
}
```

`resetTerminal`의 기본값은 `false`로 둔다.

---

## 10. 입력 잠금 정책

Lucas 메시지나 시스템 연출 중에는 입력을 잠깐 막을 수 있다.

기준 예시:

```json
{
  "messages": [
    {
      "speaker": "LUCAS",
      "text": "먼저 지도를 봐.",
      "blocking": true
    }
  ]
}
```

정책:

```text
blocking = true
→ 해당 메시지 출력 완료 전까지 입력 비활성화

blocking = false
→ 출력 중에도 입력 가능
```

MVP에서는 단순하게 다음 정책을 적용해도 된다.

```text
outputBundle 렌더링 중에는 입력 비활성화
렌더링 완료 후 입력 활성화
```

---

## 11. 입력 중복 방지

사용자가 Enter를 여러 번 누르거나, 요청 중 다시 입력하는 것을 막아야 한다.

정책:

```text
command 요청 중
→ input disabled
→ 응답 수신 후 input enabled
```

이렇게 해야 같은 명령이 중복 전송되지 않는다.

---

## 12. active tab과 입력 가능 상태

입력 가능 여부는 다음 조건을 모두 만족해야 한다.

```text
- 현재 탭이 active tab이다.
- command 요청 중이 아니다.
- outputBundle 렌더링 중이 아니다.
- blocking 메시지 출력 중이 아니다.
- 게임오버 또는 terminal ending 상태가 아니다.
```

프론트 상태 예시:

```json
{
  "inputEnabled": true,
  "isActiveTab": true,
  "isSubmitting": false,
  "isRenderingOutput": false,
  "isBlockedByMessage": false
}
```

---

## 13. 프론트에서 하면 안 되는 것

프론트는 퍼즐 검증이나 스토리 전이를 판단하지 않는다.

금지 항목:

```text
- 정답 명령어 검증
- 숨겨진 파일 경로 판단
- tar 정답 파일 목록 판단
- 보호 코어 포함 여부 판단
- 다음 nodeCode 결정
- validator_config 보관
- VFS JSON 전체 보관
- fail 분기 판단
- scanPercent 변경 판단
```

이 정보가 프론트에 있으면 사용자가 번들 JS 분석을 통해 정답을 알아낼 수 있다.

---

## 14. 프론트에서 해도 되는 것

프론트는 UI와 렌더링에 필요한 작업만 수행한다.

허용 항목:

```text
- tabId 생성
- sessionStorage에 tabId 저장
- command echo 출력
- 입력창 활성/비활성 처리
- stdout/stderr 렌더링
- prompt 표시
- command history 위/아래 이동
- 자동 스크롤
- 출력 타이핑 애니메이션
- active tab 안내 UI
- 이 탭에서 계속하기 버튼
- 백엔드 응답 기반 snapshotVersion 갱신
- 백엔드 응답 기반 cwd/prompt 갱신
```

---

## 15. tabId 관리

각 탭은 최초 로드 시 고유한 `tabId`를 생성한다.

```text
tabId = crypto.randomUUID()
```

저장 위치:

```text
sessionStorage
```

정책:

```text
- localStorage는 사용하지 않는다.
- localStorage는 탭 간 공유되므로 tabId 저장에 부적합하다.
- sessionStorage는 탭 단위로 분리되므로 적합하다.
```

---

## 16. 상태 관리

현재 프론트 기술 스택 기준으로 다음 역할 분리를 권장한다.

```text
Zustand
- 터미널 UI 로컬 상태
- 현재 input
- terminal history
- prompt
- inputEnabled
- activeTab 상태

TanStack Query
- story start 조회
- transition mutation
- active-tab acquire / heartbeat
- hint 요청
```

상태 갱신 흐름:

```text
API 응답 수신
↓
TanStack Query cache 또는 mutation result 반영
↓
Zustand store 갱신
↓
React component 재렌더링
```

---

## 17. API 응답 처리 정책

## 17-1. STAY

```text
- terminalResult.stdout append
- terminalResult.stderr append
- prompt 갱신
- cwd 갱신
- snapshotVersion 갱신
- nodeCode 유지
```

## 17-2. MOVE

```text
- outputBundle append 또는 reset 후 렌더링
- nodeCode 갱신
- prompt 갱신
- snapshotVersion 갱신
- 필요 시 scanPercent UI 갱신
```

## 17-3. INACTIVE_TAB

```text
- 입력창 비활성화
- 터미널 로그에는 출력하지 않음
- 터미널 외부 UI로 “다른 탭에서 플레이 중” 표시
- [이 탭에서 계속하기] 버튼 표시
```

## 17-4. STALE_STATE

```text
- 명령 실행 결과로 처리하지 않음
- 터미널 로그에는 출력하지 않음
- 최신 상태 조회 또는 acquire/status 재요청
- 입력창은 최신 상태 반영 전까지 비활성화
```

## 17-5. GAME_OVER

```text
- 게임오버 outputBundle 렌더링
- 입력창 비활성화
- 재시도 버튼 표시
```

---

## 18. 출력 스타일 정책

stdout과 stderr는 시각적으로 구분할 수 있게 한다.

예시:

```text
stdout
- 일반 터미널 출력

stderr
- 명령 오류
- permission denied
- command not found
```

다만 색상/효과는 과하지 않게 적용한다.

스토리 시스템 경고는 `outputBundle.content.terminalOutput`이나 별도 system message 타입으로 렌더링한다.

예:

```text
[SYSTEM] GC Scanning... [||||------] 42%
```

---

## 19. 스캔 바 표시

`scanPercent`는 터미널 출력과 별개로 상단 UI에도 표시할 수 있다.

정책:

```text
- scanPercent는 백엔드 snapshot 또는 response에서 받은 값을 사용한다.
- 프론트가 자체 계산하지 않는다.
- 50% 이상이면 글리치 효과 가능
- 70% 이상이면 경고 스타일 강화 가능
- 90% 이상이면 강한 경고 효과 가능
```

단, 명령어 자동 오염이나 입력 변조 같은 효과는 MVP에서는 보류한다.

---

## 20. Lucas 메시지 렌더링

Lucas 메시지는 `outputBundle.messages`를 기준으로 렌더링한다.

정책:

```text
- speaker = LUCAS인 메시지는 말풍선 또는 아바타 메시지로 표시
- blocking = true면 출력 완료 전까지 입력 비활성화
- blocking = false면 입력 가능
```

Lucas 메시지 내용은 프론트에서 임의 생성하지 않는다.

프론트는 백엔드가 내려준 메시지만 표시한다.

---

## 21. 테스트 포인트

## 21-1. 일반 명령

```bash
pwd
ls
cd sys
cat nofile.txt
```

확인:

```text
- 프론트 echo가 한 번만 찍히는지
- stdout/stderr가 중복되지 않는지
- prompt가 최신 cwd로 바뀌는지
- nodeCode가 유지되는지
```

## 21-2. 스토리 명령

```bash
cat world_map.map
sh laplace_fragment_01.sh
```

확인:

```text
- MOVE 응답 시 outputBundle이 append되는지
- nodeCode가 갱신되는지
- 입력이 렌더링 중 잠기는지
- Lucas 메시지가 정상 표시되는지
```

## 21-3. active tab

```text
A 탭 active
B 탭 진입
B 탭 [이 탭에서 계속하기]
```

확인:

```text
- B 탭이 새로고침 없이 활성화되는지
- B 탭 prompt가 최신 snapshot 기준으로 갱신되는지
- A 탭이 heartbeat 또는 다음 요청 시 비활성화되는지
- 터미널 히스토리에 SYNC 로그가 찍히지 않는지
```

## 21-4. 중복 입력

```text
Enter 연타
요청 중 추가 입력
```

확인:

```text
- 요청 중 input disabled인지
- 동일 command가 중복 전송되지 않는지
```

## 21-5. resetTerminal

```text
resetTerminal = false
resetTerminal = true
```

확인:

```text
- 기본적으로 히스토리가 누적되는지
- resetTerminal true일 때만 히스토리가 초기화되는지
```

---

## 22. 확정 사항

```text
- 터미널 히스토리와 현재 입력줄을 분리한다.
- 이미 출력된 히스토리는 수정하지 않는다.
- 현재 입력줄은 최신 prompt 기준으로 렌더링한다.
- 1차 구현에서는 프론트 command echo를 유지한다.
- 백엔드는 stdout, stderr, cwd, prompt, transitionResult를 반환한다.
- 프론트는 백엔드 응답을 렌더링만 한다.
- STAY는 히스토리에 결과 append 후 현재 노드 유지.
- MOVE는 outputBundle을 append하고 nodeCode 갱신.
- 기본적으로 터미널 히스토리는 누적한다.
- resetTerminal 옵션이 있는 노드에서만 히스토리를 초기화한다.
- active tab이 아닌 탭은 입력창을 비활성화한다.
- “이 탭에서 계속하기”는 새로고침 없이 acquire 후 상태 재렌더링한다.
- 요청 중에는 입력창을 잠가 중복 입력을 방지한다.
- Lucas blocking 메시지 또는 output 렌더링 중에는 입력을 잠글 수 있다.
- 프론트에는 정답/validator/VFS 전체를 절대 내려보내지 않는다.
- tabId는 sessionStorage에 저장한다.
- scanPercent는 백엔드 응답 기준으로 표시한다.
