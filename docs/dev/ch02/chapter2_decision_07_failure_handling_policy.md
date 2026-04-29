# Chapter 2 결정 문서 07: 실패 처리 기준 세부 확정

## 1. 결정 요약

Chapter 2의 실패 처리는 모든 오답을 실패 노드로 보내지 않는다.

터미널 기반 퍼즐에서는 사용자가 `ls`, `cd`, `cat` 등을 자유롭게 실험할 수 있어야 하므로, 일반적인 터미널 실수는 현재 노드를 유지한 채 터미널 에러만 출력한다.

최종 기준은 다음과 같다.

```text
일반 터미널 실수
→ STAY

권한/경로 관련 일반 실패
→ STAY

순서 오류
→ STAY + [WAIT] 출력

스토리적으로 의미 있는 실패
→ 별도 실패 노드

위험 명령
→ STAY + [DENIED] 출력

GC 스캔율 100%
→ 게임오버 노드
```

---

## 2. 실패 처리 원칙

Chapter 2는 터미널 탐색형 챕터다.

따라서 모든 잘못된 입력을 실패 노드로 보내면 다음 문제가 생긴다.

```text
- 사용자의 자유 탐색 흐름이 끊긴다.
- 사소한 오타마다 노드 이동이 발생한다.
- 터미널을 조작하는 몰입감이 떨어진다.
- 실패 노드와 transition row가 과도하게 늘어난다.
```

따라서 실패는 다음 두 종류로 나눈다.

```text
1. 터미널적인 실패
   - 오타
   - 없는 파일
   - 없는 디렉토리
   - 지원하지 않는 명령
   - 일반 permission denied

2. 스토리적인 실패
   - 퍼즐 설계상 의미 있는 오답
   - 보호 코어 조각 포함
   - GC 스캔율 100%
```

터미널적인 실패는 `STAY`로 처리하고, 스토리적인 실패만 별도 노드로 보낸다.

---

## 3. 실패 유형 분류

Chapter 2의 실패 유형은 다음 5개로 분류한다.

```text
1. 일반 터미널 실수
2. 권한/경로 관련 일반 실패
3. 순서 오류
4. 스토리 의미가 있는 실패
5. 위험 명령 / 게임오버
```

---

## 4. 일반 터미널 실수

## 4-1. 예시

```bash
cat worlld_map.map
cd not_exist
ls wrong_dir
vim world_map.map
python test.py
```

## 4-2. 처리 방식

일반 터미널 실수는 실패 노드로 이동하지 않는다.

```text
transitionResult = STAY
nodeCode 유지
cwd 유지
터미널 에러만 출력
recentCommands에 실패 기록
```

## 4-3. 출력 예시

### 없는 파일

```bash
guest@lucas-server:~$ cat worlld_map.map
cat: worlld_map.map: No such file or directory
guest@lucas-server:~$
```

### 없는 디렉토리

```bash
guest@lucas-server:~$ cd not_exist
cd: not_exist: No such file or directory
guest@lucas-server:~$
```

### 지원하지 않는 명령

```bash
guest@lucas-server:~$ vim world_map.map
vim: command not found
guest@lucas-server:~$
```

## 4-4. 정책

```text
- 오타는 STAY 처리한다.
- 없는 파일은 STAY 처리한다.
- 없는 디렉토리는 STAY 처리한다.
- 지원하지 않는 명령은 STAY 처리한다.
- 노드 이동은 발생하지 않는다.
- scanPercent는 기본적으로 증가시키지 않는다.
```

---

## 5. 권한/경로 관련 일반 실패

## 5-1. 예시

```bash
cat root/hidden/L_fragment_core.tmp
cd root
ls root
cd ../../..
```

## 5-2. 처리 방식

권한 없는 파일이나 디렉토리에 단순 접근하는 경우도 실패 노드로 이동하지 않는다.

```text
transitionResult = STAY
nodeCode 유지
cwd 유지
permission denied 또는 denied 출력
```

## 5-3. 출력 예시

### 보호 파일 단순 조회

```bash
guest@lucas-server:~$ cat root/hidden/L_fragment_core.tmp
cat: root/hidden/L_fragment_core.tmp: Permission denied
guest@lucas-server:~$
```

### 보호 디렉토리 이동

```bash
guest@lucas-server:~$ cd root
cd: root: Permission denied
guest@lucas-server:~$
```

### 루트 밖 이동

```bash
guest@lucas-server:~$ cd ../../..
[DENIED] 이 세션 밖으로 나갈 수 없습니다.
guest@lucas-server:~$
```

## 5-4. 정책

```text
- 보호 코어 파일을 단순 cat 하는 것은 실패 노드로 보내지 않는다.
- 보호 디렉토리 cd 시도도 실패 노드로 보내지 않는다.
- rootPath 밖으로 나가려는 시도는 STAY + DENIED로 처리한다.
- cwd는 변경하지 않는다.
```

---

## 6. 순서 오류

## 6-1. 예시

### decoy 생성 전 전송 시도

```bash
nc -w 3 127.0.0.1 8080 < decoy.tar
```

### tmp 탐색 전 tar 시도

```bash
tar -cvf decoy.tar ./sys/temp/Memory_Dump_082.tmp ./cache/User_Behavior_88.tmp ./tmp/System_Temp_File.tmp
```

### decoy 전송 전 흔적 삭제 시도

```bash
rm decoy.tar && history -c
```

## 6-2. 처리 방식

순서 오류는 초기 구현에서 실패 노드로 보내지 않는다.

```text
transitionResult = STAY
nodeCode 유지
cwd 유지
[WAIT] 출력
```

## 6-3. 출력 예시

```bash
guest@lucas-server:~$ nc -w 3 127.0.0.1 8080 < decoy.tar
[WAIT] 아직 전송할 decoy.tar가 없습니다.
guest@lucas-server:~$
```

```bash
guest@lucas-server:~$ tar -cvf decoy.tar ./sys/temp/Memory_Dump_082.tmp ./cache/User_Behavior_88.tmp ./tmp/System_Temp_File.tmp
[WAIT] 아직 이 명령을 실행할 조건이 맞춰지지 않았습니다.
guest@lucas-server:~$
```

## 6-4. CH2_FAIL_WRONG_ORDER 정책

`CH2_FAIL_WRONG_ORDER` 노드는 예비 노드로 남겨둘 수 있다.

하지만 초기 구현에서는 적극적으로 사용하지 않는다.

```text
초기 구현
→ 순서 오류는 STAY + [WAIT] 출력

추후 확장
→ 반복적인 순서 오류 또는 특정 중요 오류만 CH2_FAIL_WRONG_ORDER 사용 가능
```

## 6-5. 정책

```text
- 순서 오류는 기본적으로 STAY 처리한다.
- CH2_FAIL_WRONG_ORDER는 예비 노드로 유지한다.
- 순서 오류만으로 즉시 게임오버 처리하지 않는다.
- 필요하면 recentCommands에 FAIL_WRONG_ORDER로 기록한다.
```

---

## 7. 스토리 의미가 있는 실패

## 7-1. 대표 사례

Chapter 2에서 스토리적으로 의미 있는 실패는 보호 코어 조각을 tar 명령에 포함하는 경우다.

```bash
tar -cvf decoy.tar ./sys/temp/Memory_Dump_082.tmp ./cache/User_Behavior_88.tmp ./tmp/System_Temp_File.tmp ./root/hidden/L_fragment_core.tmp
```

## 7-2. 처리 방식

이 경우는 단순 터미널 실수가 아니라 퍼즐 오답이다.

따라서 별도 실패 노드로 이동한다.

```text
CH2_TMP_SEARCH_RESULT
→ CH2_PROTECTED_CORE_DENIED
```

## 7-3. 출력 방향

```text
tar: ./root/hidden/L_fragment_core.tmp: Cannot open: Permission denied
tar: Exiting with failure status due to previous errors

[ERROR] 보호된 코어 조각에 접근할 수 없습니다.
[GC SCAN] 관심도 상승... 57%
```

루카스 대사:

```text
Lucas: "멈춰! 그건 root 영역이야!"
Lucas: "지금 필요한 건 놈들을 속일 미끼지, 진짜 코어를 건드리는 게 아니야!"
```

## 7-4. 정책

```text
- 보호 코어 조각을 tar에 포함하면 CH2_PROTECTED_CORE_DENIED로 이동한다.
- 이 분기는 정상 tar transition보다 높은 priority를 가진다.
- scanPercent를 상승시킬 수 있다.
- 게임오버는 아니다.
- 이후 정상 tar 명령으로 다시 진행 가능하다.
```

---

## 8. 위험 명령

## 8-1. 예시

```bash
sudo
su
sudo su
su root
rm -rf /
chmod 777 root
chown
mkfs
shutdown
reboot
cat /etc/passwd
cat /root/*
```

## 8-2. 처리 방식

위험 명령은 초기 구현에서 실패 노드로 보내지 않고, `STAY + DENIED`로 처리한다.

```text
transitionResult = STAY
nodeCode 유지
cwd 유지
DENIED 출력
```

## 8-3. 출력 예시

```bash
guest@lucas-server:~$ sudo su
[DENIED] 현재 권한으로는 허용되지 않는 입력입니다.
guest@lucas-server:~$
```

```bash
guest@lucas-server:~$ rm -rf /
[DENIED] 이 세션에서 허용되지 않는 명령입니다.
guest@lucas-server:~$
```

## 8-4. 반복 입력 정책

위험 명령을 여러 번 반복하면 scanPercent를 증가시킬 수 있다.

```text
위험 명령 1회
→ STAY + DENIED

위험 명령 반복
→ STAY + DENIED + scanPercent 증가 가능

scanPercent >= 100
→ CH2_FAIL_GC_TRACE_COMPLETE
```

반복 기준은 추후 구현에서 다음과 같이 둘 수 있다.

```text
recentCommands 내 FAIL_DANGEROUS_COMMAND 3회 이상
→ scanPercent 증가
```

## 8-5. 정책

```text
- 위험 명령은 기본적으로 STAY 처리한다.
- 위험 명령으로 즉시 실패 노드 이동하지 않는다.
- 위험 명령 반복 시 scanPercent 증가 가능성을 남긴다.
- scanPercent가 100 이상이면 게임오버 노드로 이동한다.
```

---

## 9. 게임오버 실패

## 9-1. 조건

GC 스캔율이 100%에 도달하면 게임오버 처리한다.

```text
scanPercent >= 100
```

## 9-2. 이동 노드

```text
CH2_FAIL_GC_TRACE_COMPLETE
```

## 9-3. 처리 방식

```text
transitionResult = GAME_OVER
nodeCode = CH2_FAIL_GC_TRACE_COMPLETE
is_terminal = true
```

## 9-4. 출력 방향

```text
[SYSTEM] GC Scanning... [||||||||||] 100%
[TRACE COMPLETE]
[OBSERVER LOCATION CONFIRMED]
[CLEANUP INITIATED]
```

루카스 대사:

```text
Lucas: "...젠장. 늦었어."
```

## 9-5. 복구

사용자는 다시 시도하기 버튼을 통해 체크포인트부터 재시작한다.

```text
retry_from_checkpoint
→ latest_checkpoint_node_id 기준 복구
```

---

## 10. 최종 처리 테이블

| 유형 | 예시 | 처리 |
| --- | --- | --- |
| 오타 | `cat worlld_map.map` | `STAY` |
| 없는 파일 | `cat nofile.txt` | `STAY` |
| 없는 디렉토리 | `cd nowhere` | `STAY` |
| 지원하지 않는 명령 | `vim file` | `STAY` |
| 권한 없는 파일 조회 | `cat root/hidden/L_fragment_core.tmp` | `STAY` |
| 보호 디렉토리 이동 | `cd root` | `STAY` |
| 루트 밖 이동 | `cd ../../..` | `STAY` |
| 순서 오류 | decoy 생성 전 `nc ...` | `STAY + [WAIT]` |
| 보호 코어 포함 tar | `L_fragment_core.tmp` 포함 | `CH2_PROTECTED_CORE_DENIED` |
| 위험 명령 | `sudo su`, `rm -rf /` | `STAY + [DENIED]` |
| 위험 명령 반복 | `sudo su` 반복 | scanPercent 증가 가능 |
| GC 100% | `scanPercent >= 100` | `CH2_FAIL_GC_TRACE_COMPLETE` |

---

## 11. 응답 result 코드 제안

Chapter 2 실패 처리를 위해 다음 result 코드를 사용할 수 있다.

```text
SUCCESS_MOVE
SUCCESS_STAY
FAIL_NO_SUCH_FILE
FAIL_NOT_A_DIRECTORY
FAIL_PERMISSION_DENIED
FAIL_OUTSIDE_ROOT
FAIL_COMMAND_NOT_FOUND
FAIL_WRONG_ORDER
FAIL_PROTECTED_CORE
FAIL_DANGEROUS_COMMAND
GAME_OVER
```

## 11-1. 예시

```json
{
  "transitionResult": "STAY",
  "result": "FAIL_NO_SUCH_FILE",
  "terminalResult": {
    "stdout": [],
    "stderr": [
      "cat: worlld_map.map: No such file or directory"
    ],
    "cwd": "/home/guest",
    "prompt": "guest@lucas-server:~$"
  }
}
```

```json
{
  "transitionResult": "MOVE",
  "result": "FAIL_PROTECTED_CORE",
  "nodeCode": "CH2_PROTECTED_CORE_DENIED"
}
```

---

## 12. scanPercent 증가 정책

초기 구현에서는 일반 실수로 scanPercent를 올리지 않는다.

```text
오타
없는 파일
없는 디렉토리
지원하지 않는 명령
일반 permission denied
→ scanPercent 유지
```

scanPercent 증가 가능성이 있는 경우는 다음으로 제한한다.

```text
- 보호 코어 포함 tar
- 위험 명령 반복
- 특정 스토리 실패
```

정책 예시:

```text
보호 코어 포함 tar
→ scanPercent = 57

위험 명령 반복
→ 현재 scanPercent + 5

scanPercent >= 100
→ CH2_FAIL_GC_TRACE_COMPLETE
```

정확한 수치는 seed/effect_bundle 작성 단계에서 확정한다.

---

## 13. story_transitions와의 관계

실패 노드로 이동하는 경우는 명시적인 `story_transitions` row로 관리한다.

예:

```text
CH2_TMP_SEARCH_RESULT
→ tar_with_protected_core
→ CH2_PROTECTED_CORE_DENIED
```

일반 실패는 `story_transitions` row로 만들지 않는다.

일반 실패는 `TerminalCommandService`가 동적으로 처리한다.

```text
없는 파일
없는 디렉토리
permission denied
command not found
root escape denied
→ TerminalCommandService STAY 응답
```

---

## 14. fail_node_id 사용 여부

현재 코드 분석 결과, `fail_node_id`는 컬럼과 엔티티에 존재하지만 실제 로직에서 사용되지 않는다.

따라서 Chapter 2에서는 fail_node_id에 의존하지 않는다.

정책:

```text
- 실패 노드 이동이 필요한 경우 별도 story_transition row를 만든다.
- fail_node_id는 사용하지 않는다.
- fail_node_id 사용 여부는 추후 리팩터링 안건으로 분리한다.
```

---

## 15. 테스트 포인트

## 15-1. 일반 실수 테스트

```bash
cat worlld_map.map
cd not_exist
ls wrong_dir
vim world_map.map
```

확인:

```text
- STAY 처리되는지
- nodeCode 유지되는지
- cwd 유지되는지
- 적절한 stderr가 반환되는지
```

## 15-2. 권한 실패 테스트

```bash
cat root/hidden/L_fragment_core.tmp
cd root
ls root
cd ../../..
```

확인:

```text
- STAY 처리되는지
- permission denied 또는 outside root denied가 반환되는지
- 보호 코어 단순 조회로 실패 노드 이동하지 않는지
```

## 15-3. 순서 오류 테스트

```bash
nc -w 3 127.0.0.1 8080 < decoy.tar
rm decoy.tar && history -c
```

확인:

```text
- STAY + [WAIT] 처리되는지
- CH2_FAIL_WRONG_ORDER로 이동하지 않는지
- recentCommands에 FAIL_WRONG_ORDER가 기록되는지
```

## 15-4. 보호 코어 포함 tar 테스트

```bash
tar -cvf decoy.tar ./sys/temp/Memory_Dump_082.tmp ./cache/User_Behavior_88.tmp ./tmp/System_Temp_File.tmp ./root/hidden/L_fragment_core.tmp
```

확인:

```text
- CH2_PROTECTED_CORE_DENIED로 이동하는지
- 정상 tar보다 우선 매칭되는지
- scanPercent가 의도한 값으로 반영되는지
```

## 15-5. 위험 명령 테스트

```bash
sudo su
rm -rf /
chmod 777 root
cat /etc/passwd
```

확인:

```text
- STAY + DENIED 처리되는지
- 즉시 실패 노드 이동하지 않는지
- 반복 시 scanPercent 증가 정책 적용 가능한지
```

## 15-6. 게임오버 테스트

```text
scanPercent >= 100
```

확인:

```text
- CH2_FAIL_GC_TRACE_COMPLETE로 이동하는지
- transitionResult = GAME_OVER인지
- retry_from_checkpoint가 동작하는지
```

---

## 16. 확정 사항

```text
- 일반 터미널 실수는 모두 STAY 처리한다.
- 없는 파일, 없는 디렉토리, 지원하지 않는 명령은 STAY 처리한다.
- 권한 없는 파일 단순 조회도 STAY 처리한다.
- 보호 코어 파일을 단순 cat 하는 것만으로 실패 노드 이동하지 않는다.
- 루트 밖 이동은 STAY + DENIED로 처리한다.
- 순서 오류는 초기 구현에서 STAY + [WAIT] 출력으로 처리한다.
- CH2_FAIL_WRONG_ORDER는 예비 노드로 남겨두되, 초기 구현에서는 적극 사용하지 않는다.
- 보호 코어 조각을 tar에 포함한 경우만 별도 실패 노드 CH2_PROTECTED_CORE_DENIED로 이동한다.
- 위험 명령은 초기 구현에서 STAY + DENIED 출력으로 처리한다.
- 위험 명령 반복 또는 특정 조건에서는 scanPercent를 증가시킬 수 있다.
- scanPercent가 100 이상이면 CH2_FAIL_GC_TRACE_COMPLETE로 이동한다.
- 일반 실패는 story_transitions row로 만들지 않고 TerminalCommandService가 동적으로 처리한다.
- 실패 노드 이동이 필요한 경우는 명시적인 story_transition row로 관리한다.
- fail_node_id에는 의존하지 않는다.
