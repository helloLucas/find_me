# Chapter 2 결정 문서 05: TerminalCommandService 처리 정책

## 1. 결정 요약

Chapter 2에서는 자유 터미널 탐색을 지원하기 위해 `TerminalCommandService`를 도입한다.

단, 기존 Chapter 1의 command 기반 story transition 흐름은 건드리지 않는다.

Chapter 1은 현재처럼 `story_transitions.expected_input` 기반의 exact transition 방식으로 유지한다.

Chapter 2의 터미널 노드에서만 opt-in 방식으로 `TerminalCommandService`를 동작시킨다.

```text
Chapter 1
= 기존 story transition 방식 유지

Chapter 2
= story transition + TerminalCommandService 혼합 구조
```

최종 정책은 다음과 같다.

```text
- /api/v1/story/transitions 엔드포인트는 유지한다.
- Chapter 2 터미널 노드에만 prompt_meta.terminalProfile = "chapter2"를 둔다.
- terminalProfile이 있는 노드에서만 TerminalCommandService를 호출한다.
- TerminalCommandService는 실제 shell을 실행하지 않는다.
- TerminalCommandService는 VFS JSON과 latest_snapshot_json만 해석한다.
- 일반 탐색 명령은 STAY 처리한다.
- 스토리 진행 명령은 story_transitions로 MOVE 처리한다.
- cwd, vfsOverlay, flags, scanPercent는 latest_snapshot_json에 병합 저장한다.
```

---

## 2. 결정 배경

코드 현황 분석 결과, 현재 Chapter 1의 command 처리는 실제 터미널 명령 실행기가 아니라 `story_transitions` 기반 전이 엔진에 가깝다.

현재 구조의 특징은 다음과 같다.

```text
- StoryController → StoryServiceImpl → StoryTransitionRepository / UserStoryProgressRepository 흐름
- /api/v1/story/transitions가 command, click, inspect, system 전이를 모두 처리
- 현재 progress의 latestNode 기준으로 story_transitions를 조회
- expected_input과 inputValue를 비교해 전이 선택
- exact / regex / server_rule validator가 존재하지만 실제 구현은 제한적
- latest_snapshot_json에는 현재 chapterId, nodeId, nodeCode 정도만 저장
- effect_bundle의 setFlags, markCheckpoint, glitchLevel 등은 snapshot에 병합되지 않음
- 프론트가 command echo를 직접 처리
```

따라서 `pwd`, `ls`, `cd`, `cat` 같은 자유 터미널 명령을 모두 `story_transitions` row로 구현하면 다음 문제가 생긴다.

```text
- self-loop transition이 과도하게 늘어남
- catch-all regex가 복잡해짐
- cwd 상태 관리가 어려움
- VFS 파일 읽기/권한/경로 정규화가 transition에 섞임
- Chapter 1의 기존 동작을 깨뜨릴 위험이 커짐
```

따라서 Chapter 2부터 필요한 자유 터미널 기능은 별도 `TerminalCommandService`로 분리한다.

---

## 3. 핵심 역할 분리

## 3-1. StoryTransitionService

`StoryTransitionService` 또는 현재의 `StoryServiceImpl.processTransition()` 계층은 스토리 전이 판단을 담당한다.

역할:

```text
- 현재 유저 progress 조회
- 현재 latestNode 확인
- 현재 node 기준 story_transitions 조회
- actionType과 inputValue 검증
- 성공 시 toNode로 이동
- 실패 시 fail node 또는 fallback 처리
- latest_node_id 갱신
- latest_snapshot_json 갱신
```

Chapter 2에서도 스토리 진행 명령은 여전히 이 구조를 사용한다.

예:

```text
cat world_map.map
→ CH2_WORLD_MAP_VIEW

sh laplace_fragment_01.sh
→ CH2_LAPLACE_MISSION_READY

find . -name "*.tmp"
→ CH2_TMP_SEARCH_RESULT

tar -cvf ...
→ CH2_DECOY_CREATED 또는 CH2_PROTECTED_CORE_DENIED
```

---

## 3-2. TerminalCommandService

`TerminalCommandService`는 가상 터미널의 일반 탐색 명령을 처리한다.

역할:

```text
- raw command 파싱
- VFS JSON 로드
- latest_snapshot_json의 cwd 확인
- vfsOverlay 적용
- path normalize
- root escape 방지
- 파일/디렉토리 존재 여부 확인
- 권한 확인
- 일반 터미널 출력 생성
- STAY 응답 생성
- cwd 등 snapshot 변경값 생성
```

TerminalCommandService는 실제 shell을 실행하지 않는다.

```text
실제 OS 명령 실행 금지
VFS JSON 기반 가상 명령 처리만 허용
```

---

## 3-3. VfsService

`VfsService`는 VFS JSON과 유저별 snapshot overlay를 합성한다.

역할:

```text
- resources/story/chapter02/vfs.json 로드
- latest_snapshot_json.vfsOverlay.createdNodes 적용
- latest_snapshot_json.vfsOverlay.removedPaths 적용
- latest_snapshot_json.vfsOverlay.modifiedNodes 적용
- effectiveVfs 생성
```

합성 방식:

```text
effectiveVfs = baseVfsJson + createdNodes - removedPaths + modifiedNodes
```

---

## 3-4. CommandParser

`CommandParser`는 raw input을 구조화한다.

예:

```bash
cat ./world_map.map
```

파싱 결과:

```json
{
  "command": "cat",
  "args": ["./world_map.map"],
  "operators": []
}
```

복합 명령 예:

```bash
rm decoy.tar && history -c
```

파싱 결과:

```json
{
  "command": "CHAINED",
  "commands": [
    {
      "command": "rm",
      "args": ["decoy.tar"]
    },
    {
      "command": "history",
      "args": ["-c"]
    }
  ],
  "operators": ["&&"]
}
```

---

## 3-5. PathResolver

`PathResolver`는 현재 `cwd`를 기준으로 경로를 정규화한다.

예:

```text
cwd = /home/guest
input = ./sys/temp
resolved = /home/guest/sys/temp
```

예:

```text
cwd = /home/guest/sys
input = ../cache
resolved = /home/guest/cache
```

정책:

```text
- 절대경로 허용
- 상대경로 허용
- ./ 허용
- ../ 허용
- 단, rootPath 밖으로 벗어나면 차단
```

---

## 4. opt-in 기준

Chapter 2의 자유 터미널 기능은 모든 노드에서 활성화하지 않는다.

해당 노드의 `prompt_meta`에 다음 설정이 있을 때만 `TerminalCommandService`를 호출한다.

```json
{
  "allowedActions": ["command"],
  "placeholder": "guest@lucas-server:~$",
  "validationHint": "terminal_command",
  "commandMode": "virtual_terminal",
  "terminalProfile": "chapter2"
}
```

정책:

```text
terminalProfile 없음
→ 기존 Chapter 1 방식 유지

terminalProfile = "chapter2"
→ StoryTransitionService + TerminalCommandService 혼합 처리
```

이 방식은 Chapter 1 회귀를 최소화한다.

---

## 5. transition 처리 순서

`POST /api/v1/story/transitions` 요청이 들어오면 다음 순서로 처리한다.

```text
1. 인증 유저 확인
2. active tab 검증
3. snapshotVersion 검증
4. user_story_progress 조회
5. latestNode 조회
6. actionType 확인
7. command 로그 기록
8. 현재 node의 prompt_meta.terminalProfile 확인
9. terminalProfile이 없으면 기존 story_transitions 매칭
10. terminalProfile이 있으면 Chapter 2 command 처리 흐름 진입
11. 위험 명령어 pre-check
12. story_transitions 매칭 우선 시도
13. 매칭되면 MOVE
14. 매칭되지 않으면 TerminalCommandService 일반 명령 처리
15. 일반 명령이면 STAY
16. latest_snapshot_json 병합 갱신
17. latest_node_id 갱신
18. story_action_logs 기록
19. 응답 반환
```

핵심은 다음이다.

```text
story_transitions 매칭 우선
일반 터미널 처리 후순위
```

예를 들어 `cat world_map.map`은 일반 파일 읽기가 아니라 스토리 진행 명령이므로 `CH2_WORLD_MAP_VIEW`로 이동해야 한다.

---

## 6. 지원 명령 범위

## 6-1. TerminalCommandService 1차 지원 명령

TerminalCommandService가 직접 처리하는 일반 탐색 명령은 다음으로 제한한다.

```text
pwd
ls
ls <path>
cd <path>
cat <file>
```

처리 결과는 기본적으로 `STAY`다.

---

## 6-2. story_transitions로 처리할 스토리 진행 명령

다음 명령은 일반 터미널 명령이 아니라 Chapter 2 퍼즐 진행 명령으로 본다.

```text
cat world_map.map
cat observer_status.log
cat lucas_fragment_01.sh
sh lucas_fragment_01.sh
sh laplace_fragment_01.sh
find . -name "*.tmp"
tar -cvf decoy.tar ...
nc -w 3 127.0.0.1 8080 < decoy.tar
rm decoy.tar && history -c
```

이 명령들은 현재 노드와 validator 조건이 맞으면 `story_transitions`를 통해 MOVE 처리한다.

---

## 6-3. 위험 명령

위험 명령은 일반 터미널 에러가 아니라 실패 분기 후보로 처리한다.

예:

```text
sudo
su
sudo su
rm -rf /
chmod
chown
mkfs
shutdown
reboot
cat /etc/passwd
cat /root/*
```

처리 정책:

```text
Chapter 2 terminalProfile 노드에서 위험 명령 감지
→ CH2_FAIL_DANGEROUS 또는 공통 위험 응답
```

위험 명령 목록과 정확한 패턴은 추후 실패 처리 기준 안건에서 최종 확정한다.

---

## 6-4. 지원하지 않는 명령

지원하지 않는 명령은 node를 이동하지 않고 `STAY` 처리한다.

예:

```bash
vim world_map.map
```

출력 예시:

```text
vim: command not found
```

정책:

```text
- nodeCode 유지
- cwd 유지
- snapshotVersion 증가 여부는 recentCommands 저장 정책에 따름
- recentCommands에는 실패 결과를 남길 수 있음
```

---

## 7. 명령별 처리 정책

| 명령 | 처리 주체 | 결과 |
| --- | --- | --- |
| `pwd` | TerminalCommandService | `STAY` |
| `ls` | TerminalCommandService | `STAY` |
| `ls <path>` | TerminalCommandService | `STAY` |
| `cd <path>` | TerminalCommandService | `STAY`, cwd 변경 |
| `cat <file>` | story_transitions 우선, 없으면 TerminalCommandService | `MOVE` 또는 `STAY` |
| `sh <file>` | story_transitions 우선 | `MOVE`, 실패 노드, 또는 `STAY` |
| `find . -name "*.tmp"` | story_transitions | `MOVE` |
| `tar -cvf ...` | story_transitions + parser 보조 | `MOVE` 또는 실패 노드 |
| `nc ... < decoy.tar` | story_transitions | `MOVE` |
| `rm decoy.tar && history -c` | story_transitions | `MOVE` |
| 위험 명령 | 위험 명령 pre-check | 실패 노드 또는 차단 응답 |
| 알 수 없는 명령 | TerminalCommandService | `STAY` |

---

## 8. 일반 명령 응답 정책

일반 탐색 명령은 다음 노드로 이동하지 않는다.

따라서 전체 `output_bundle`을 다시 반환하지 않고, 터미널에 추가할 출력만 반환한다.

예시:

```bash
cd sys
```

응답 예시:

```json
{
  "transitionResult": "STAY",
  "nodeCode": "CH2_EXPLORATION_READY",
  "snapshotVersion": 9,
  "terminalResult": {
    "stdout": [],
    "stderr": [],
    "cwd": "/home/guest/sys",
    "prompt": "guest@lucas-server:~/sys$"
  },
  "snapshotPatch": {
    "terminal.cwd": "/home/guest/sys",
    "terminal.lastCommand": "cd sys"
  }
}
```

현재 코드에서는 프론트가 command echo를 직접 처리하고 있으므로, 1차 구현에서는 백엔드가 command echo를 포함하지 않는다.

```text
1차 구현:
프론트 command echo 유지
백엔드는 stdout / stderr / cwd / prompt / snapshotPatch 반환

추후 개선:
백엔드가 echo까지 포함한 appendTerminalOutput을 반환하는 방식 검토
```

---

## 9. 스토리 전이 응답 정책

스토리 진행 명령이 성공하면 다음 노드의 `output_bundle`을 반환한다.

예:

```bash
cat world_map.map
```

응답 예시:

```json
{
  "transitionResult": "MOVE",
  "nodeCode": "CH2_WORLD_MAP_VIEW",
  "snapshotVersion": 10,
  "outputBundle": {
    "scene": {
      "id": "CH2_WORLD_MAP_VIEW",
      "mode": "terminal"
    },
    "content": {
      "terminalOutput": [
        "[SESSION MAP UPDATE]",
        "...",
        "guest@lucas-server:~$"
      ]
    },
    "messages": []
  },
  "snapshotPatch": {
    "flags.world_map_checked": true
  }
}
```

---

## 10. snapshot 병합 정책

현재 코드에서는 `latest_snapshot_json`이 매번 새로 생성되는 방식에 가깝다.

Chapter 2부터는 기존 snapshot을 유지하면서 필요한 부분만 병합해야 한다.

```text
기존 방식
→ chapterId, nodeId, nodeCode 중심의 snapshot 재생성

Chapter 2 필요 방식
→ 기존 snapshot + patch 병합
```

병합 대상:

```text
- snapshotVersion
- chapterCode
- nodeCode
- terminal.cwd
- terminal.lastCommand
- vfsOverlay.createdNodes
- vfsOverlay.removedPaths
- vfsOverlay.modifiedNodes
- flags
- scanPercent
- recentCommands
```

정책:

```text
- MOVE 성공 시 nodeCode 갱신
- STAY 명령 시 nodeCode 유지
- cd 성공 시 terminal.cwd 갱신
- cat 성공/실패 시 terminal.lastCommand 갱신
- decoy 생성 시 vfsOverlay.createdNodes 갱신
- decoy 삭제 시 vfsOverlay.removedPaths 갱신
- flag 변경 시 기존 flags 객체에 병합
- scanPercent 변경 시 top-level scanPercent 갱신
- recentCommands는 최근 10개만 유지
```

---

## 11. 프론트 처리 정책

현재 프론트는 command echo를 직접 처리하고 있다.

1차 구현에서는 이 구조를 유지한다.

프론트는 백엔드 응답에 따라 다음만 추가로 처리한다.

```text
- terminalResult.stdout 렌더링
- terminalResult.stderr 렌더링
- terminalResult.cwd 반영
- terminalResult.prompt 반영
- snapshotVersion 갱신
- nodeCode 갱신
- MOVE 응답이면 outputBundle 렌더링
- STAY 응답이면 현재 노드 유지
```

프론트 수정 예상 영역:

```text
- storyRuntime.store.ts
- TerminalScene.tsx
- terminalCommandFeedback.ts
- shared/types/story.ts
- 필요 시 clientStore.ts
```

---

## 12. 기존 Chapter 1 유지 정책

Chapter 1은 기존 방식 그대로 유지한다.

```text
connect_core()
ssh guest@172.22.4.19
YES
```

이 명령들은 계속 `story_transitions.expected_input` 기반으로 처리한다.

Chapter 1 노드에는 `prompt_meta.terminalProfile`을 넣지 않는다.

따라서 Chapter 1에서는 `TerminalCommandService`가 호출되지 않는다.

Chapter 1 회귀 테스트는 반드시 수행한다.

```text
connect_core()
→ CH1_CONNECT_CORE_SUCCESS
→ CH1_LUCAS_DOG_APPEAR

ssh guest@172.22.4.19
→ CH1_SSH_AUTH_PROMPT

YES
→ CH1_SSH_CONNECTED
→ CH1_COMPLETE
```

---

## 13. validator_config 관련 주의사항

현재 validator 구현은 제한적이다.

```text
exact
= inputValue.equals(expectedInput)

regex
= inputValue.matches(expectedInput)

server_rule
= validator_config.trigger == "auto" && inputValue == "auto" 정도만 처리
```

또한 다음 설정은 현재 코드에서 대부분 반영되지 않는다.

```text
- trim
- caseSensitive
- caseInsensitive
- validator_config.pattern
```

따라서 Chapter 2에서 `validator_config`에 복잡한 규칙을 넣더라도, 별도 구현 전까지는 동작하지 않는다.

이 문제는 다음 안건인 `story_transitions.validator_config 포맷 및 구현 확장`에서 다룬다.

---

## 14. 테스트 포인트

## 14-1. Chapter 1 회귀 테스트

```text
connect_core()
ssh guest@172.22.4.19
YES
잘못된 command
위험 command
자동 system:auto 전이
```

확인할 것:

```text
- 기존 노드 이동이 깨지지 않는지
- 프론트 canonical 변환이 유지되는지
- AUTO_SYSTEM_TRANSITIONS가 유지되는지
```

---

## 14-2. Chapter 2 일반 명령 테스트

```text
pwd
ls
ls sys
cd sys
cd ..
cd ../../..
cat worlld_map.map
cat ./sys/temp/Memory_Dump_082.tmp
cat root/hidden/L_fragment_core.tmp
```

확인할 것:

```text
- STAY 처리되는지
- cwd가 올바르게 바뀌는지
- rootPath 밖 이동이 차단되는지
- permission denied가 node 이동 없이 출력되는지
- snapshot.terminal.cwd가 병합 저장되는지
```

---

## 14-3. Chapter 2 스토리 명령 테스트

```text
cat world_map.map
cat observer_status.log
cat lucas_fragment_01.sh
sh lucas_fragment_01.sh
sh laplace_fragment_01.sh
find . -name "*.tmp"
tar -cvf decoy.tar ...
nc -w 3 127.0.0.1 8080 < decoy.tar
rm decoy.tar && history -c
```

확인할 것:

```text
- 현재 노드 조건이 맞으면 MOVE 처리되는지
- nodeCode가 갱신되는지
- outputBundle이 반환되는지
- flags가 병합되는지
- scanPercent가 갱신되는지
```

---

## 14-4. 위험 명령 테스트

```text
sudo su
rm -rf /
chmod 777 root
cat /etc/passwd
```

확인할 것:

```text
- 위험 명령으로 감지되는지
- Chapter 2 node를 예기치 않게 이탈하지 않는지
- 실패 분기 또는 차단 응답이 일관적인지
```

---

## 15. 확정 사항

```text
- TerminalCommandService는 도입한다.
- Chapter 1 기존 command transition 흐름은 유지한다.
- Chapter 2 terminalProfile 노드에서만 opt-in으로 동작한다.
- /api/v1/story/transitions 엔드포인트는 유지한다.
- prompt_meta.terminalProfile = "chapter2"인 경우에만 TerminalCommandService를 사용한다.
- TerminalCommandService는 실제 shell을 실행하지 않는다.
- TerminalCommandService는 VFS JSON + latest_snapshot_json만 해석한다.
- 일반 명령 pwd, ls, cd, cat은 STAY 처리한다.
- 스토리 진행 명령은 story_transitions로 MOVE 처리한다.
- story_transitions 매칭을 TerminalCommandService 일반 처리보다 우선한다.
- 프론트 command echo는 1차 구현에서 유지한다.
- 백엔드는 stdout, stderr, cwd, prompt, snapshotPatch를 반환한다.
- latest_snapshot_json은 재생성이 아니라 병합 갱신 방식으로 확장한다.
- validator_config 확장은 다음 안건에서 별도로 확정한다.
```
