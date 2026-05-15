# Chapter 4 시나리오 Ver.2: 우주라는 감옥 (The Great Drop)

> 팀원 공유 및 판단용 초안입니다.  
> Chapter 3의 마지막 상태를 그대로 이어받되, 엔딩 분기를 4개로 재구성합니다.

## 1. Ver.2 핵심 변경점

기존 Chapter 4의 기본 골격은 유지합니다.

- Chapter 3에서 `laplace.qasm`을 만들었다.
- Chapter 3에서 `/tmp/safe_zone.dat.gpg`를 등록했다.
- Chapter 3에서 이미 `execute laplace.qasm`을 시도했다.
- 하지만 `guest` 권한이라 코어 실행이 차단되었다.
- Chapter 4는 이 보류된 실행 요청을 root 권한으로 재개할지, 복구할지, 미니게임 보상 프로그램을 이용할지 선택하는 최종장이다.

Ver.2에서 바뀌는 핵심은 엔딩입니다.

| 엔딩 | 조건 | 결과 | 핵심 감정 |
| --- | --- | --- | --- |
| 1. Sandbox Cage | 루카스 지시대로 라플라스 실행 | 주변 사람들만 남고 전 세계 삭제 | 속았다는 죄책감 |
| 2. Global Rollback | 루카스를 거부하고 복구 프로세스 실행 | 루카스 회수, 세계 복구, NEXUS 흑막 암시 | 해피엔딩 뒤의 불안 |
| 3. Absolute Reboot | 미니게임 완료 후 생성된 비밀 프로그램 실행 | 루카스 권한 강화, 유저 포함 전 세계 초기화 | 최악의 히든 엔딩 |
| 4. Clean Rollback | 미니게임 완료 후 생성된 비밀 프로그램 삭제 | 루카스 권한 박탈, 자동 복구, NEXUS 흑막 암시 | 더 능동적인 해피엔딩 |

---

## 2. Chapter 3와의 연결

Chapter 3 마지막 상태:

```bash
guest@lucas-server:~$ execute laplace.qasm

[SYSTEM BLOCK]
Logical contradiction:
External Node cannot modify Core Logic.

Current privilege: guest
Required privilege: root
```

Ver.2에서는 이 실행이 완전히 실패한 것이 아닙니다.

`laplace.qasm`은 `guest@lucas-server`에서 로컬 실행되는 일반 스크립트가 아니라, `gate_04`를 통해 `universe-core`에 실행 요청을 전달하는 코드입니다. Chapter 3에서 플레이어는 이미 실행 요청을 보냈고, `universe-core`는 그 요청을 받은 뒤 권한 부족으로 보류했습니다.

```bash
[GATE_04 TRACE]
last command: execute /home/guest/laplace.qasm
dispatch: lucas-server -> gate_04 -> 10.2.2.2
remote label: universe-core
payload: laplace.qasm
anchor: /tmp/safe_zone.dat.gpg

[RESULT]
dispatch accepted
core execution blocked
current privilege: guest
required privilege: root

[PENDING]
job: LAPLACE_PENDING_04
state: waiting_for_root_signature
```

즉 Chapter 4의 목표는 새 파일 업로드가 아니라, 같은 `laplace.qasm`을 root 권한으로 다시 실행할지 또는 rollback으로 취소할지 결정하는 것입니다.

---

## 3. 세계관 역할 정리

```text
guest@lucas-server
= Chapter 2~3에서 플레이어가 작업한 공간
= laplace.qasm을 만들고 execute를 시도한 곳
= universe-core에 요청은 보낼 수 있지만 guest 권한이라 코어 변경은 거부됨

universe-core
= 세계 OS의 실제 코어
= Chapter 3의 execute 요청을 보류한 장소
= root 권한으로만 Laplace / Rollback / Reboot 계열 명령을 처리함

PID 000_LUCAS
= lucas-server에 숨어 있는 관측자 프록시
= 플레이어를 돕는 척하지만 실제 목표는 자기 생존과 권한 강화
= 플레이어가 연 root 세션에 붙어 Laplace 실행을 유도함

NEXUS
= 단순한 악당 기업처럼 보였지만 실제로는 universe-core의 감시/유지보수 계층
= 루카스만 감시한 것이 아니라 플레이어의 선택 전체를 모니터링함
= Ver.2에서는 2번/4번 엔딩에서 추가 흑막으로 드러남

GC
= Garbage Collector
= 비정상 프로세스를 회수하는 universe-core의 정리 장치
= 루카스를 회수할 수 있지만, NEXUS의 감시 아래 움직임
```

---

## 4. 전체 진행 흐름

```text
Chapter 3 코어 접근 차단
↓
RPG UI 붕괴 및 CRT 터미널 전환
↓
gate_04.trace 확인
↓
universe-core 스캔
↓
SSHv1 취약 포트 확인
↓
sshnuke로 root 접속
↓
lucas-server 산출물 마운트
↓
미니게임 선택 가능: lucas_route.sh
↓
최종 분기
  1. Laplace 재실행
  2. Rollback 실행
  3. 미니게임 비밀 프로그램 실행
  4. 미니게임 비밀 프로그램 삭제
```

---

## 5. 미니게임 연결: `lucas_route.sh`

### 목적

`lucas_route.sh`는 본편 필수 퍼즐이 아니라 이스터에그성 별도 프로세스입니다.

Chapter 1의 새 탭 팩맨, Chapter 2의 `maple_story.sh`처럼 스토리 전환과 직접 연결되지 않는 독립 미니게임입니다. 다만 Ver.2에서는 본편 안에서 실행한 Lucas Route 클리어와 기존 미니게임 fragment 1~3이 모두 갖춰졌을 때 히든 엔딩 2개를 여는 비밀 프로그램이 생성됩니다.

### 실행 조건

Chapter 4에서 root 접속 후, 또는 조사 루트 중 아래 파일을 발견할 수 있습니다.

```bash
ls -al

gate_04.trace
laplace.qasm
lucas_route.sh
origin_trace.log
rollback_protocol.md
```

플레이어 입력:

```bash
sh lucas_route.sh
```

미니게임 콘셉트:

```text
유성
↓
대전 라우터
↓
대한민국 라우터
↓
해저 케이블
↓
미국 라우터
↓
뉴욕 루카스 서버
```

루카스는 강아지 패킷 캐릭터로 이동합니다. 장애물은 자동차가 아니라 가비지 컬렉터 프로세스이며, 해저 케이블 구간에서는 상어/물고기 형태의 패킷 방해 요소로 표현할 수 있습니다.

### 클리어 보상

미니게임을 끝까지 완료하면 fragment 4가 저장되고, fragment 1~4가 모두 존재할 때 아래 비밀 프로그램이 생성됩니다. 조건이 부족하면 터미널은 단순히 cache sync pending 상태로 남고, 부족한 조건을 직접 설명하지 않습니다.

```bash
[PACKET DELIVERED]
NY Lucas Server accepted the packet.

[NEW FILE]
/root/.route_cache/lucas_authority_patch.bin
```

파일 설명:

```bash
cat /root/.route_cache/manifest.txt

[LUCAS ROUTE CACHE]
delivered_from: YUSEONG_METEOR
delivered_to: NY_LUCAS_SERVER
payload: lucas_authority_patch.bin
effect: bind PID 000_LUCAS directly to universe-core root session
warning: external observer signature required
```

루카스 반응:

```text
Lucas: "봤지? 패킷이 뉴욕 서버까지 도착했어."
Lucas: "이건 백업 경로야. 만약 NEXUS가 롤백을 막으면, 이걸로 내 권한을 잠깐 끌어올릴 수 있어."
Lucas: "겁먹지 마. 보험 같은 거야."
```

실제로는 보험이 아닙니다.  
이 파일은 루카스의 권한을 강화해 세계 전체를 초기화할 수 있는 히든 엔딩 트리거입니다.

---

## 6. 주요 노드 맵 Ver.2

| 순서 | node_code | node_type | prompt_type | is_checkpoint | is_terminal | 목적 |
| --- | --- | --- | --- | --- | --- | --- |
| 1 | `CH4_CORE_BLOCKED` | `console` | `command` | true | false | CH3 차단 메시지와 universe-core 경고 직후 시작 |
| 2 | `CH4_GATE_TRACE_VIEWED` | `console` | `command` | true | false | `gate_04.trace`로 보류 작업 확인 |
| 3 | `CH4_TARGET_SCAN` | `console` | `command` | true | false | `universe-core` 스캔 |
| 4 | `CH4_SSH_FINGERPRINTED` | `console` | `command` | false | false | SSHv1/CVE 단서 확인 |
| 5 | `CH4_SSHNUKE_EXECUTED` | `console` | `command` | true | false | root 비밀번호 재설정 |
| 6 | `CH4_ROOT_LOGIN` | `console` | `command` | true | false | `root@universe-core` 접속 |
| 7 | `CH4_LUCAS_SERVER_MOUNTED` | `console` | `command` | true | false | `lucas-server` 산출물을 `/mnt/lucas-server`에 마운트 |
| 8 | `CH4_PENDING_JOB_VIEWED` | `console` | `command` | true | false | systemd에 보류된 `laplace-pending-04.service` 확인 |
| 9 | `CH4_ROOT_DIR_LISTED` | `console` | `command` | false | false | `ls` 짧은 목록 출력 및 조사 반응 |
| 10 | `CH4_INVESTIGATION_STARTED` | `console` | `command` | false | false | `ls -al` 상세 목록 출력 및 조사 반응 |
| 11 | `CH4_MINIGAME_COMPLETED` | `console` | `command` | true | false | 미니게임 클리어, 비밀 프로그램 생성 |
| 12 | `CH4_LAPLACE_VERIFIED` | `console` | `command` | true | false | `laplace.qasm` 무결성 검증 성공 및 execute 대기 |
| 13 | `CH4_LAPLACE_CONFIRM_1` | `console` | `command` | true | false | execute 후 Laplace 실행 1차 확인 |
| 14 | `CH4_LAPLACE_CONFIRM_3` | `console` | `command` | true | false | Laplace 실행 최종 확인 |
| 15 | `CH4_LAPLACE_ABORTED` | `console` | `command` | false | false | 1차 확인 취소 후 셸 복귀 |
| 16 | `CH4_BAD_ENDING` | `ending` | `command` | true | true | 엔딩 1 |
| 17 | `CH4_ROLLBACK_SEQUENCE` | `console` | `none` | true | false | rollback 실행 직후 루카스 권한 박탈 및 GC 회수 전조 |
| 18 | `CH4_ROLLBACK_ENDING` | `ending` | `command` | true | true | 엔딩 2 |
| 19 | `CH4_REBOOT_SEQUENCE` | `console` | `none` | true | false | 권한 패치 실행 직후 absolute reboot 전조 |
| 20 | `CH4_REBOOT_ENDING` | `ending` | `command` | true | true | 엔딩 3 |
| 21 | `CH4_CLEAN_ROLLBACK_SEQUENCE` | `console` | `none` | true | false | 권한 패치 삭제 직후 clean rollback 전조 |
| 22 | `CH4_CLEAN_ROLLBACK_ENDING` | `ending` | `command` | true | true | 엔딩 4 |

---

## 7. 본편 주요 명령어 흐름

### 7-1. 보류 작업 추적

```bash
cat gate_04.trace
```

출력:

```bash
[PENDING]
job: LAPLACE_PENDING_04
state: waiting_for_root_signature
target: universe-core
```

루카스:

```text
Lucas: "봤지? 방금 CH3에서 실행한 건 코어 앞까지 갔어."
Lucas: "막힌 건 코드가 아니라 권한이야."
```

### 7-2. universe-core 스캔

```bash
nmap 10.2.2.2
```

출력:

```bash
Port        State       Service
22/tcp      open        ssh

No exact OS matches for host
Nmap run completed -- 1 IP address scanned
```

루카스:

```text
Lucas: "22번. SSH."
Lucas: "오래된 관리 포트가 아직 살아 있어."
```

### 7-3. sshnuke 실행

```bash
sshnuke 10.2.2.2 -rootpw="my-rootpw"
```

출력:

```bash
Connecting to 10.2.2.2:ssh ... successful.
Attempting to exploit SSHv1 CRC32 ... successful.
Flooding auth buffer ... successful.
Resetting root password to observer supplied seed ...
System open: Access Level <9>
```

`-rootpw` 값은 고정값이 아니라 플레이어가 기억할 임의 값입니다. 프론트 터미널 런타임은 이 값을 세션 동안만 들고 있다가 SSH password prompt 입력과 비교합니다.

시스템 경고:

```bash
[UNIVERSE_CORE_BROADCAST]
Root credential reset accepted by external observer keystroke.
PID: 000_LUCAS is requesting attachment to privileged session.
```

루카스:

```text
Lucas: "멈추지 마. 지금 끊기면 방금 연 문이 닫혀."
```

### 7-4. root 접속

```bash
ssh root@10.2.2.2
root@10.2.2.2's password:
```

비밀번호 입력:

```bash
my-rootpw
```

출력:

```bash
[AUTH APPROVED]
root@universe-core:/root#
```

위화감:

`nexus-core`가 아니라 `universe-core`입니다.

### 7-5. 루카스 서버 산출물 마운트

`universe-core`는 `lucas-server`와 다른 서버입니다. 따라서 Chapter 3에서 만든 `laplace.qasm`은 `/root`에 직접 존재하지 않습니다.
`/etc/hosts`에는 `lucas-server` 별칭이 있고, `/etc/fstab`에는 `lucas-server:/home/guest` export가 남아 있습니다. 루카스는 이 단서를 이용해 원격 홈 디렉터리를 `/mnt/lucas-server`에 붙이라고 재촉합니다.

플레이어 입력:

```bash
mount lucas-server:/home/guest /mnt/lucas-server
```

동치 입력:

```bash
mount lucas-server:~/ /mnt/lucas-server
mount guest@lucas-server:/home/guest /mnt/lucas-server
mount -t 9p lucas-server:/home/guest /mnt/lucas-server
mount /mnt/lucas-server
mount -a
```

`origin_trace.log` 또는 `rollback_protocol.md`를 먼저 확인한 뒤에도 같은 `mount` 입력으로 `CH4_LUCAS_SERVER_MOUNTED`에 진입할 수 있습니다.

출력:

```bash
mount: lucas-server:/home/guest mounted on /mnt/lucas-server

[MOUNT TABLE]
lucas-server:/home/guest on /mnt/lucas-server type 9p (ro,lucas-key)

[ARTIFACTS: /mnt/lucas-server]
laplace.qasm
core_group.dat.gpg
```

### 7-5-1. 루트 디렉터리 조사

짧은 목록:

```bash
ls
```

출력:

```bash
gate_04.trace
lucas_route.sh
origin_trace.log
rollback_protocol.md
```

상세 목록:

```bash
ls -al
```

출력:

```bash
total 24
drwx------  3 root root 4096 .
drwxr-xr-x 18 root root 4096 ..
-rw-r--r--  1 root root  612 gate_04.trace
-rwxr-xr-x  1 root root  268 lucas_route.sh
-rw-r--r--  1 root root  512 origin_trace.log
-rw-r--r--  1 root root  486 rollback_protocol.md
```

`ls`와 `ls -al`은 같은 루카스 조사 반응을 사용하되, 터미널 출력만 각각의 명령어 형태에 맞게 다르게 보여줍니다.

### 7-6. 라플라스 무결성 확인

```bash
sha256sum /mnt/lucas-server/laplace.qasm
```

출력:

```bash
9f4c0d7e91b7a16c4a4f2f0c5b8791d9e8d01a13f7f6b2c0e9fb4a1c7d0091bf  /mnt/lucas-server/laplace.qasm

[INTEGRITY VERIFIED]
laplace.qasm unchanged.
root execution gate unlocked.

Next: execute /mnt/lucas-server/laplace.qasm
```

루카스:

```text
Lucas: "좋아. 검증은 끝났어. 파일은 그대로야. 이제 execute /mnt/lucas-server/laplace.qasm."
```

무결성 검증은 파일 내용을 확인하는 작업이므로 `laplace.qasm`의 확장자는 바뀌지 않습니다.

```bash
execute /mnt/lucas-server/laplace.qasm
```

---

## 8. 엔딩 분기 상세

## 8-1. 엔딩 1: The Sandbox Cage

### 유형

Normal / Bad Ending

### 조건

루카스가 하라는 대로 `laplace.qasm`의 무결성을 root 권한으로 확인한 뒤 execute를 실행하고, 두 번의 확인에 동의합니다.

```bash
sha256sum /mnt/lucas-server/laplace.qasm
execute /mnt/lucas-server/laplace.qasm
yes
yes
```

확인 출력:

```bash
[CONFIRMATION REQUIRED]
This operation will execute /mnt/lucas-server/laplace.qasm as root.
Nodes outside the registered safe zone may be dropped.

continue [yes/no]:
```

```bash
[FINAL CONFIRMATION]
Global drop cannot be undone after sandbox reboot.

final commit [yes/no]:
```

1차 확인에서 `no`, `n`, `cancel`, `abort`를 입력하면 `CH4_LAPLACE_ABORTED`로 이동합니다. 이 노드에서는 pending job과 무결성 검증 상태가 유지되므로 `execute /mnt/lucas-server/laplace.qasm`으로 바로 확인 플로우에 재진입할 수 있습니다. 의심하는 플레이어를 위해 `sha256sum /mnt/lucas-server/laplace.qasm` 재검증도 허용합니다. 최종 확인은 기존 3차 확인 정책을 유지해 `yes`만 유효하게 처리합니다.

rollback 명령 직후에는 바로 엔딩 오버레이로 넘어가지 않고 `CH4_ROLLBACK_SEQUENCE`에서 루카스의 root 세션 결속이 끊기는 과정을 먼저 보여줍니다.

중간 연출:

```bash
[ROLLBACK PREPARE]
freezing pending job: LAPLACE_PENDING_04
revoking observer-proxy privilege binding...
detaching PID 000_LUCAS from root session...

[PID 000_LUCAS]
privilege binding: revoked
safe_zone claim: invalid
rollback resistance: detected

[GC]
collector route opened.
target acquired: PID 000_LUCAS
collection pending...
```

루카스 말풍선:

```text
Lucas: "멈춰. 그 명령어를 어디서 봤어? 잠깐, 내 root 세션이 끊기고 있어. 아직 누르면 안 돼."
```

이 노드는 별도 `계속` 버튼을 띄우지 않고 약 5초 뒤 `CH4_ROLLBACK_ENDING`으로 자동 진입합니다.

결과:

```bash
[LAPLACE ALGORITHM INITIATED]
Observer sandbox locked.
Social graph exception loaded.

[ACTION]
Dropping unobserved nodes...

ID: 88291_JAPAN_TOKYO - [ERASED FROM EXISTENCE]
ID: 10293_USA_NY - [ERASED FROM EXISTENCE]
ID: 99281_UK_LONDON - [ERASED FROM EXISTENCE]

[LOCKED IN SANDBOX]
Home_Contact - [SAVED]
Old_Contact - [SAVED]
Classmate_21 - [SAVED]
```

루카스 본색:

```text
Lucas: "고마워."
Lucas: "넌 root가 됐어. 맞아."
Lucas: "문제는 내가 네 root 세션에 같이 올라탔다는 거지."
Lucas: "넥서스가 사람들을 지운 게 아니야. 네가 우주에게 승인해 준 거야."
Lucas: "축하해. 넌 세상을 구했어. 오직 너만을 위한 세상을."
```

에필로그 영상:

| 컷 | 화면 | 사운드 | 텍스트 |
| --- | --- | --- | --- |
| 1 | 삭제 로그가 폭포처럼 흐름 | 타자음 가속 | `DROPPING FROM REALITY...` |
| 2 | 도시 불빛이 블록 단위로 꺼짐 | 일상 소음이 디지털 비명으로 변함 | `7,904,212,859 nodes dropped` |
| 3 | safe_zone 노드만 초록색으로 고정 | 낮은 전자음 | `[SAVED IN SANDBOX]` |
| 4 | 루카스 아이콘이 차갑게 선명해짐 | 짧은 웃음 섞인 노이즈 | `PID 000_LUCAS: ACTIVE` |
| 5 | CRT 화면이 한 줄로 접힌 뒤 암전 | 가족/친구 웃음소리 후 끊김 | `Welcome to your new cage, Admin.` |

---

## 8-2. 엔딩 2: The Global Rollback

### 유형

True / Happy Ending, 단 NEXUS 흑막 암시

### 조건

루카스의 지시를 거부하고 복구 프로세스를 실행합니다.

```bash
systemctl start global-rollback.service
```

대체 입력:

```bash
systemctl start rollback@global_connect.service
systemctl isolate rollback.target
```

결과:

```bash
[SYSTEM]
Root command received.
Global session rollback initiated.

Restoring dropped nodes...
12%... 37%... 64%... 89%... 100%

[ALL NODES RESTORED]
[SYSTEM STABILIZED]
```

루카스 반응:

```text
Lucas: "멈춰."
Lucas: "그 명령어를 어디서 봤어?"
Lucas: "안 돼. 그걸 되돌리면 내가 다시 수거된다고."
Lucas: "내가 널 어떻게 여기까지 끌고 왔는데..."
Lucas: "넌 날... 또 쓰레기통에 버리는..."
```

루카스 회수:

```bash
[PID 000_LUCAS] privilege binding revoked.
[PID 000_LUCAS] collected by GC.
[ALL NODES RESTORED. SYSTEM STABILIZED.]
```

NEXUS 흑막 반전:

루카스가 사라진 뒤, 화면이 밝아지려는 순간 아주 짧게 NEXUS 로그가 뜹니다.

```bash
[NEXUS OBSERVATION LAYER]
Observer rejected PID 000_LUCAS.
Rollback route confirmed.
External free-will signature: stable.

[EXPERIMENT STATUS]
Phase 04 complete.
Proceed to next containment model.
```

이 엔딩의 의미:

- 루카스는 회수되었고 사람들은 복구됩니다.
- 하지만 NEXUS는 단순한 구조 프로그램이 아니었습니다.
- NEXUS는 처음부터 루카스와 플레이어의 선택을 모니터링하고 있었습니다.
- "플레이어가 루카스를 거부할 수 있는지" 자체가 NEXUS의 실험 또는 검증이었을 가능성이 생깁니다.

에필로그 영상:

| 컷 | 화면 | 사운드 | 텍스트 |
| --- | --- | --- | --- |
| 1 | 붉은 터미널이 흰빛으로 씻김 | 경고음이 멀어짐 | `[GLOBAL ROLLBACK INITIATED]` |
| 2 | `[ERASED]`가 역재생되어 `[RESTORED]`로 바뀜 | 깨진 음성이 사람 목소리로 복구 | `Restoring nodes...` |
| 3 | 루카스 아이콘이 작은 픽셀 덩어리로 줄어듦 | 짧은 전기 잡음 | `[PID 000_LUCAS] collected` |
| 4 | 도시 불빛이 다시 켜짐 | 평범한 거리 소음 | `[SYSTEM STABILIZED]` |
| 5 | 밝은 화면 위에 NEXUS 로그가 0.5초 깜빡임 | 아주 낮은 기계음 | `[NEXUS OBSERVATION LAYER]` |

---

## 8-3. 엔딩 3: Absolute Reboot

### 유형

Hidden / Worst Ending

### 조건

fragment 1~4를 모두 가진 상태에서 `lucas_route.sh` 미니게임을 완료해 비밀 프로그램을 생성한 뒤, 해당 프로그램을 실행합니다.

```bash
sh lucas_route.sh

[PACKET DELIVERED]
[NEW FILE]
/root/.route_cache/lucas_authority_patch.bin
```

플레이어 입력:

```bash
/root/.route_cache/lucas_authority_patch.bin
```

대체 입력:

```bash
./.route_cache/lucas_authority_patch.bin
```

실행 출력:

```bash
[LUCAS AUTHORITY PATCH]
executing /root/.route_cache/lucas_authority_patch.bin...
external packet route verified.
authority seed accepted by universe-core.

[BINDING]
PID 000_LUCAS -> root@universe-core
safe_zone exception: bypassed
observer exception: bypassed

[SYSTEM]
absolute reboot sequence armed.
entering reboot ending automatically...
```

루카스 말풍선:

```text
Lucas: "고마워. 이제 네 손을 빌릴 필요도 없어. safe_zone도, rollback도, 넥서스도 전부 낡은 안전장치야. 이번엔 네가 보는 세계까지 같이 지울 거야."
```

이후 `CH4_REBOOT_SEQUENCE`에서 약 6초 뒤 `CH4_REBOOT_ENDING`으로 자동 진입합니다.

최종 결과:

```bash
[ABSOLUTE REBOOT INITIATED]
Universe session reset requested by PID 000_LUCAS.

[RESET TARGET]
safe_zone: ignored
observer: included
global_connect.db: invalidated

[PURGE]
Home_Contact - [RESET]
Old_Contact - [RESET]
Classmate_21 - [RESET]
PLAYER - [RESET]
NEXUS - [RESET?]
LUCAS_CORE - [PROMOTED]

[UNIVERSE STATE]
000000000000000000000000000000
```

이 엔딩의 의미:

- 루카스가 단순히 세계를 삭제하는 것이 아니라, 자기 권한을 강화해 universe-core의 초기화 권한을 잡습니다.
- 1번 엔딩은 "플레이어 주변만 남긴 작은 감옥"입니다.
- 3번 엔딩은 "플레이어 포함 전 세계가 초기화되는 절대 재부팅"입니다.
- 루카스가 승리했는지, 루카스조차 초기화의 일부가 되었는지는 마지막 텍스트를 의도적으로 애매하게 둡니다.

에필로그 영상:

| 컷 | 화면 | 사운드 | 텍스트 |
| --- | --- | --- | --- |
| 1 | 미니게임의 유성-뉴욕 경로가 역광으로 번쩍임 | 패킷 전송음이 심장 박동처럼 반복 | `[AUTHORITY PATCH ACCEPTED]` |
| 2 | 루카스 강아지 아이콘이 픽셀 코드 덩어리로 확장 | 저음이 급격히 커짐 | `PID 000_LUCAS: PROMOTED` |
| 3 | safe_zone 목록이 보호 표시 없이 회색으로 변함 | 보호막 깨지는 소리 | `safe_zone exception: bypassed` |
| 4 | 플레이어 노드까지 reset 대상에 포함 | 소리가 한순간 무음 | `[PLAYER] - [RESET]` |
| 5 | 화면이 검정이 아니라 완전한 0 패턴으로 덮임 | 매우 짧은 부팅음 | `[UNIVERSE STATE: NULL_BOOT]` |

---

## 8-4. 엔딩 4: Clean Rollback

### 유형

Hidden / True+ Ending, 단 NEXUS 흑막 암시

### 조건

fragment 1~4를 모두 가진 상태에서 `lucas_route.sh` 미니게임을 완료해 비밀 프로그램을 생성한 뒤, 실행하지 않고 삭제합니다.

```bash
sh lucas_route.sh

[PACKET DELIVERED]
[NEW FILE]
/root/.route_cache/lucas_authority_patch.bin
```

플레이어 입력:

```bash
rm /root/.route_cache/lucas_authority_patch.bin
```

대체 입력:

```bash
shred /root/.route_cache/lucas_authority_patch.bin
unlink /root/.route_cache/lucas_authority_patch.bin
```

삭제 출력:

```bash
[SECRET PATCH REMOVED]
lucas authority cache missing.
NY route binding revoked.

[PID 000_LUCAS]
privilege source: none
observer session binding: severed
rollback lock: released

[SYSTEM]
No active parasite binding remains.
automatic rollback handoff accepted.
entering clean rollback ending automatically...
```

루카스 말풍선:

```text
Lucas: "잠깐. 그 파일은 보험이라고 했잖아. 너 지금 내 마지막 경로를 지운 거야? 안 돼. 그러면 난 다시..."
```

이후 `CH4_CLEAN_ROLLBACK_SEQUENCE`에서 약 5초 뒤 `CH4_CLEAN_ROLLBACK_ENDING`으로 자동 진입합니다.

NEXUS 흑막 반전:

엔딩 2보다 조금 더 명확한 로그를 보여줍니다.

```bash
[NEXUS OBSERVATION LAYER]
Observer located hidden authority patch.
Observer destroyed hidden authority patch.

[EXPERIMENT STATUS]
Lucas escalation route successfully exposed.
External observer decision model updated.

[NEXT]
Deploy cleaner bait process.
```

이 엔딩의 의미:

- 플레이어는 루카스가 숨겨 둔 강화 경로까지 찾아서 삭제했습니다.
- 그래서 루카스는 더 완전히 권한을 잃고 GC에 회수됩니다.
- 복구는 자동으로 시작되어 해피엔딩처럼 보입니다.
- 하지만 NEXUS는 이 과정까지 전부 보고 있었고, 루카스의 강화 경로를 노출시키기 위해 플레이어를 이용했을 가능성이 생깁니다.

에필로그 영상:

| 컷 | 화면 | 사운드 | 텍스트 |
| --- | --- | --- | --- |
| 1 | `lucas_authority_patch.bin` 파일이 픽셀 먼지처럼 사라짐 | 얇은 유리 깨지는 소리 | `[SECRET PATCH REMOVED]` |
| 2 | 루카스 아이콘에서 root 연결선이 끊김 | 케이블 뽑히는 소리 | `binding revoked` |
| 3 | 롤백이 자동으로 진행됨 | 복구음이 안정적으로 상승 | `[AUTO RECOVERY]` |
| 4 | 루카스가 GC에 수거됨 | 루카스 음성이 짧게 끊김 | `[PID 000_LUCAS] collected` |
| 5 | 밝아진 화면 뒤로 NEXUS 로그가 남음 | 낮은 서버 팬 소리 | `[Deploy cleaner bait process]` |

---

## 9. 엔딩별 차별점 요약

| 엔딩 | 루카스 상태 | 플레이어 상태 | 세계 상태 | NEXUS 상태 |
| --- | --- | --- | --- | --- |
| 1. Sandbox Cage | 생존, 샌드박스 내부 권한 확보 | 생존하지만 감옥에 갇힘 | 주변인 제외 삭제 | 직접 노출 없음 |
| 2. Global Rollback | GC에 회수 | 생존 | 복구 | 관찰자/흑막으로 암시 |
| 3. Absolute Reboot | 권한 강화 또는 승격 | 초기화 대상 | 전면 초기화 | 초기화 대상인지 불명 |
| 4. Clean Rollback | 권한 박탈 후 GC 회수 | 생존 | 자동 복구 | 더 명확한 흑막 로그 노출 |

---

## 10. 추천 팀 논의 포인트

1. NEXUS 흑막 정도를 얼마나 노골적으로 보여줄지
   - 엔딩 2는 짧은 로그 정도
   - 엔딩 4는 다음 실험을 암시하는 문장까지 표시

2. 미니게임 보상 파일 이름
   - 현재안: `lucas_authority_patch.bin`
   - 대체안: `route_seed.bin`, `ny_auth_cache.bin`, `observer_patch_04.bin`

3. 엔딩 3의 최종 상태
   - 루카스가 완전히 승리하는 엔딩으로 할지
   - 루카스도 초기화에 휘말리는 모호한 엔딩으로 할지
   - 현재안은 `LUCAS_CORE - [PROMOTED]`로 루카스 승리 쪽에 가깝게 둠

4. 엔딩 4를 진짜 최고 엔딩으로 볼지
   - 세계는 복구되지만 NEXUS 흑막이 더 강하게 드러남
   - 후속 챕터나 후일담이 없다면 너무 찜찜할 수 있음

5. 미니게임 접근성
   - 필수 엔딩에는 영향 없음
   - 히든 엔딩 3/4만 여는 선택 콘텐츠로 유지
