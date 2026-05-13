# Chapter 3

상태: 기획 중
담당자: (미정)
상위 작업: 스토리 노드

## 0. 적용 범위

이 문서는 Chapter 03의 스토리 노드, 전이 규칙, 가상 터미널 처리 방식, 출력 JSON 구조, 유저별 스냅샷 저장 방식을 정리한 설계 문서다.

Chapter 03은 Chapter 2에서 라플라스 파편 1번을 활성화하고 가비지 컬렉터의 스캔을 피해 안전한 터널로 대피한 이후의 이야기를 다룬다. 플레이어는 시스템의 무차별적인 삭제를 멈추기 위해 라플라스 파편 2번과 3번을 찾아 보호 대상을 설정하고, 최종적으로 알고리즘을 컴파일하는 과정을 겪게 된다.

Chapter 03의 핵심 구조는 다음과 같다.

```
Chapter 3 시작 영상 (친구의 삭제)
↓
CH3_HOME
↓
grep -r "SOCIAL" /etc
↓
CH3_SOCIAL_PATH_FOUND
↓
cd /sys/social/nodes && ls -al
↓
CH3_SOCIAL_NODES_LIST
↓
cat nexus_monitor.log
↓
CH3_NEXUS_MONITOR_LOG_VIEW
↓
sh laplace_fragment_02.sh
↓
CH3_LAPLACE_MISSION_02_READY
↓
grep -f ./my_contacts.list global_connect.db > core_group.dat
↓
CH3_CORE_GROUP_EXTRACTED
↓
gpg -c core_group.dat
↓
CH3_CORE_GROUP_ENCRYPTED
↓
mv core_group.dat.gpg /tmp/safe_zone.dat.gpg
↓
CH3_SAFE_ZONE_MOVED
↓
sudo iptables -A INPUT -s 0.0.0.0/0 -j DROP
↓
CH3_IPTABLES_BLOCKED
↓
override --force
↓
CH3_GHOST_MODE_ENABLED
↓
cd /usr/bin/local && ls
↓
CH3_LOCAL_BIN_LIST
↓
cp laplace_fragment_03.sh ~/
↓
CH3_FRAGMENT_03_COPIED
↓
cd ~/ && compile --fragments laplace_fragment_*.sh --output laplace.qasm
↓
CH3_COMPILE_BLOCKED (SYSTEM BLOCK)
↓
Chapter 3 완료 (루트 권한의 필요성 인지)
```

---

## 1. Chapter 03 기본 진행 요약

## 1-1. 플레이어 입력 명령어 및 행동

| 순서 | 구분 | 플레이어 행동 / 입력 | 목적 | 결과 |
| --- | --- | --- | --- | --- |
| 1 | 행동 | 오프닝 영상 시청 | 챕터 3 시작 및 삭제 범위 확장 인지 | 친구의 세션 할당 해제 및 위기감 고조 |
| 2 | 입력 | `grep -r "SOCIAL" /etc` | 데이터베이스 경로 탐색 | 소셜 데이터 경로(`/sys/social/nodes`) 확인 |
| 3 | 입력 | `cd /sys/social/nodes` & `ls -al` | 경로 진입 및 파일 목록 확인 | 핵심 파일들 확인 및 로그 노출 |
| 4 | 선택 | `cat nexus_monitor.log` | 시스템 삭제 증거 확인 | 친구가 희생되었음을 인지(서사 분기) |
| 5 | 입력 | `sh laplace_fragment_02.sh` | 파편 2번 미션 시작 | 79억 노드 스캔 및 암호화 지시 활성화 |
| 6 | 입력 | `grep -f ./my_contacts.list global_connect.db > core_group.dat` | 보호 대상 데이터 추출 | 지인 데이터 분리 완료 |
| 7 | 입력 | `gpg -c core_group.dat` | 지인 데이터 암호화 | GC 감시망을 피하는 `.gpg` 파일 생성 |
| 8 | 입력 | `mv core_group.dat.gpg /tmp/safe_zone.dat.gpg` | 안전 구역으로 파일 이동 | 핵심 노드 격리 완료 |
| 9 | 입력 | `sudo iptables -A INPUT -s 0.0.0.0/0 -j DROP` | 방화벽 차단 시도 | 외부 노드 저항 및 살려달라는 메시지 출력 |
| 10 | 입력 | `override --force` | 강제 연결 해제 | 79억 노드 삭제 및 고스트 모드 진입 |
| 11 | 입력 | `cd /usr/bin/local` & `ls` | 3번 파편 위치 확인 | `laplace_fragment_03.sh` 발견 |
| 12 | 입력 | `cp laplace_fragment_03.sh ~/` | 파편 파일 복사 | 권한 문제 우회하여 작업 공간으로 이동 |
| 13 | 입력 | `cd ~/` & `compile --fragments laplace_fragment_*.sh --output laplace.qasm` | 최종 알고리즘 컴파일 | 보안벽 차단 및 [SYSTEM BLOCK] 발생, 루트 권한 필요성 대두 |

---

## 1-2. 가상 파일 구조

Chapter 03의 가상 파일 시스템 구조다. 유저의 진행에 따라 동적으로 파일이 생성, 이동된다.

```
/home/guest
├── my_contacts.list
├── (이후 생성/복사되는 파일들)
│   ├── core_group.dat
│   ├── core_group.dat.gpg
│   └── laplace_fragment_03.sh

/etc
├── nexus/
│   └── gate.conf
├── security/
│   └── limits.d/
│       └── observer.conf
├── systemd/
│   └── system/
│       └── nexus-watcher.service
└── cron.daily/
    └── clean_cache

/sys/social/nodes
├── global_connect.db
├── laplace_fragment_02.sh
└── nexus_monitor.log

/tmp
└── (이후 이동되는 파일)
    └── safe_zone.dat.gpg

/usr/bin/local
├── nexus_engine
├── gc_controller
└── laplace_fragment_03.sh
```

---

## 4. Chapter 03 노드 맵

| 순서 | node_code | node_type | prompt_type | is_checkpoint | is_terminal | 목적 |
| --- | --- | --- | --- | --- | --- | --- |
| 1 | `CH3_HOME` | `console` | `command` | true | false | Chapter 3 진입 후 루카스의 상황 설명 및 지시 |
| 2 | `CH3_SOCIAL_PATH_FOUND` | `console` | `command` | false | false | `grep -r "SOCIAL" /etc` 결과 출력 및 경로 안내 |
| 3 | `CH3_SOCIAL_NODES_LIST` | `console` | `command` | false | false | `/sys/social/nodes` 진입 및 `ls` 결과 확인 |
| 4 | `CH3_NEXUS_MONITOR_LOG_VIEW` | `console` | `command` | false | false | 넥서스 감시 기록 확인 및 친구 삭제의 진실 파악 |
| 5 | `CH3_LAPLACE_MISSION_02_READY` | `console` | `command` | true | false | 2번 파편 실행 및 79억 노드 스캔, 미션 목표 제시 |
| 6 | `CH3_CORE_GROUP_EXTRACTED` | `console` | `command` | false | false | 보호 대상 데이터 추출 완료 |
| 7 | `CH3_CORE_GROUP_ENCRYPTED` | `console` | `command` | false | false | 핵심 노드 데이터 암호화 완료 |
| 8 | `CH3_SAFE_ZONE_MOVED` | `console` | `command` | true | false | 안전 구역으로 파일 이동 및 터널 외부 연결 폐쇄 지시 |
| 9 | `CH3_IPTABLES_BLOCKED` | `console` | `command` | false | false | 방화벽 차단 시도 및 외부 노드의 저항/구조 요청 연출 |
| 10 | `CH3_GHOST_MODE_ENABLED` | `console` | `command` | true | false | `override --force`를 통한 강제 끊기 및 고스트 모드 진입 |
| 11 | `CH3_LOCAL_BIN_LIST` | `console` | `command` | false | false | `/usr/bin/local`에서 3번째 파편 발견 및 권한 부족 경고 |
| 12 | `CH3_FRAGMENT_03_COPIED` | `console` | `command` | true | false | 홈 디렉토리로 3번 파편 복사 완료 |
| 13 | `CH3_COMPILE_BLOCKED` | `ending` | `none` | true | true | 컴파일 시도 중 코어 보안벽 차단 발생 및 Chapter 3 종료 |

---

## 5. 노드별 상세 정의

## 5-1. `CH3_HOME`

### 목적

오프닝 영상 종료 직후 진입하는 첫 번째 노드. 
친구의 삭제 등 시스템의 강제 최적화 진행을 알려주며, 플레이어에게 두 번째 파편을 찾아 SOCIAL 경로를 알아내라고 지시한다.

### DB 필드

```
node_code: CH3_HOME
node_type: console
prompt_type: command
is_checkpoint: true
is_terminal: false
```

### output_bundle

```json
{
  "scene": {
    "id": "CH3_HOME",
    "mode": "terminal",
    "bgm": "tension_hum",
    "glitchLevel": 1,
    "scanPercent": 0,
    "resetTerminal": true
  },
  "content": {
    "terminalOutput": [
      "guest@lucas-server:~$"
    ]
  },
  "messages": [
    {
      "speaker": "LUCAS",
      "channel": "bubble",
      "text": "시스템이 메모리 확보를 위해 삭제 범위를 기하급수적으로 늘리고 있어. 네 친구의 세션도 방금 할당 해제됐어.",
      "blocking": true
    },
    {
      "speaker": "LUCAS",
      "channel": "bubble",
      "text": "가짜 패킷만으로는 더 이상 시간을 끌 수 없어. 우주의 커널 자체를 수정해서 이 미친 삭제 프로세스를 멈춰야 해.",
      "blocking": true
    },
    {
      "speaker": "LUCAS",
      "channel": "bubble",
      "text": "첫 번째 파편은 활성화됐어. 이제 두 번째 파편을 찾아야 해.",
      "blocking": true
    },
    {
      "speaker": "LUCAS",
      "channel": "bubble",
      "text": "시스템 설정이나 로그를 뒤져서 'SOCIAL' 관련 경로를 알아내!",
      "blocking": true
    }
  ],
  "notifications": [],
  "uiMarkers": {},
  "effects": {
    "showDogAvatar": true
  }
}
```

### prompt_meta

```json
{
  "allowedActions": ["command"],
  "placeholder": "guest@lucas-server:~$",
  "validationHint": "terminal_command",
  "commandMode": "virtual_terminal",
  "terminalProfile": "chapter3"
}
```

---

## 5-2. `CH3_SOCIAL_PATH_FOUND`

### 목적

`grep -r "SOCIAL" /etc` 명령어를 통해 소셜 그래프 데이터가 저장된 경로를 찾아낸다.

### DB 필드

```
node_code: CH3_SOCIAL_PATH_FOUND
node_type: console
prompt_type: command
is_checkpoint: false
is_terminal: false
```

### output_bundle

```json
{
  "scene": {
    "id": "CH3_SOCIAL_PATH_FOUND",
    "mode": "terminal",
    "bgm": "tension_hum",
    "glitchLevel": 0,
    "scanPercent": 0,
    "resetTerminal": false
  },
  "content": {
    "terminalOutput": [
      "/etc/nexus/gate.conf:PROTOCOL_TARGET=\"SOCIAL_GRAPH\"",
      "/etc/nexus/gate.conf:MOUNT_POINT=\"/sys/social/nodes\"",
      "/etc/security/limits.d/observer.conf:# Limits for SOCIAL_DATA_ACCESS",
      "/etc/systemd/system/nexus-watcher.service:Description=Nexus Social Surveillance Service",
      "/etc/cron.daily/clean_cache:find /var/cache/social -type f -mtime +1 -delete",
      "guest@lucas-server:~$"
    ]
  },
  "messages": [
    {
      "speaker": "LUCAS",
      "channel": "bubble",
      "text": "찾았다! /sys/social/nodes 에 사람들의 연결 데이터가 모여 있을 거야. 당장 그리로 가보자.",
      "blocking": true
    }
  ],
  "notifications": [],
  "uiMarkers": {},
  "effects": {}
}
```

### effect_bundle

```json
{
  "setFlags": {
    "social_path_found": true
  },
  "snapshotPatch": {
    "flags.social_path_found": true
  },
  "recentResult": "SUCCESS_MOVE"
}
```

---

## 5-3. `CH3_SOCIAL_NODES_LIST`

### 목적

`/sys/social/nodes` 경로로 이동하여 파일 목록을 확인한다. 
핵심 파일인 `global_connect.db`, `laplace_fragment_02.sh`, `nexus_monitor.log`가 등장한다.

### DB 필드

```
node_code: CH3_SOCIAL_NODES_LIST
node_type: console
prompt_type: command
is_checkpoint: false
is_terminal: false
```

### output_bundle

```json
{
  "scene": {
    "id": "CH3_SOCIAL_NODES_LIST",
    "mode": "terminal",
    "bgm": "tension_hum",
    "glitchLevel": 0,
    "scanPercent": 0,
    "resetTerminal": false
  },
  "content": {
    "terminalOutput": [
      "total 4096",
      "drwxr-xr-x 2 root root    4096 Apr 14 23:10 .",
      "drwxr-xr-x 3 root root    4096 Apr 14 23:05 ..",
      "-rw-r--r-- 1 root root  204800 Apr 14 23:11 global_connect.db",
      "-rwxr-xr-x 1 root root    1024 Apr 14 23:05 laplace_fragment_02.sh",
      "-rw-r--r-- 1 root root   81920 Apr 14 23:12 nexus_monitor.log",
      "guest@lucas-server:/sys/social/nodes$"
    ]
  },
  "messages": [
    {
      "speaker": "LUCAS",
      "channel": "bubble",
      "text": "여기 있네, 두 번째 파편(laplace_fragment_02.sh)이야.",
      "blocking": true
    },
    {
      "speaker": "LUCAS",
      "channel": "bubble",
      "text": "잠깐, 저기 nexus_monitor.log... 불길한 예감이 들어. 저 파일을 한번 확인해봐.",
      "blocking": true
    }
  ],
  "notifications": [],
  "uiMarkers": {},
  "effects": {}
}
```

---

## 5-4. `CH3_NEXUS_MONITOR_LOG_VIEW`

### 목적

`cat nexus_monitor.log`를 통해 시스템의 잔혹한 최적화 과정과 친구의 삭제가 우연이 아님을 알게 된다.

### DB 필드

```
node_code: CH3_NEXUS_MONITOR_LOG_VIEW
node_type: console
prompt_type: command
is_checkpoint: false
is_terminal: false
```

### output_bundle

```json
{
  "scene": {
    "id": "CH3_NEXUS_MONITOR_LOG_VIEW",
    "mode": "terminal",
    "bgm": "tension_hum",
    "glitchLevel": 1,
    "scanPercent": 0,
    "resetTerminal": false
  },
  "content": {
    "terminalOutput": [
      "[2088-04-14 23:08] [정보] 글로벌 세션 메모리 점유율 98.4%. 자동 최적화 절차 개시.",
      "[2088-04-14 23:09] [경고] 가비지 컬렉터(GC) 우선순위 큐 업데이트. 활동성 저하 노드 타겟팅.",
      "[2088-04-14 23:10] [실행] 노드 그룹(서울_4구역) : 4,021개 연결 차단됨. 상태 -> [삭제됨]",
      "[2088-04-14 23:11] [위험] 관측자(플레이어) 이상 현상 감지. 로컬 렌더링을 위한 추가 메모리 할당.",
      "[2088-04-14 23:11] [실행] 관측자 렌더링 유지를 위해 주변 노드 메모리 회수 개시.",
      "[2088-04-14 23:11] [실행] 노드(ID: Friend_04) 상태가 활성(ACTIVE)에서 고립(ORPHANED)으로 변경됨.",
      "[2088-04-14 23:11] [실행] 노드(ID: Friend_04) 할당 해제 승인됨. 상태 -> [삭제됨]",
      "[2088-04-14 23:12] [정보] 최적화 완료. 1.2PB 메모리 확보됨.",
      "guest@lucas-server:/sys/social/nodes$"
    ]
  },
  "messages": [
    {
      "speaker": "LUCAS",
      "channel": "bubble",
      "text": "놈들의 추악한 기록이야. 봐, 네 친구가 사라진 건 단순한 버그나 사고가 아니야.",
      "blocking": true
    },
    {
      "speaker": "LUCAS",
      "channel": "bubble",
      "text": "시스템이 '효율'을 위해, 네 주변 공간을 유지하려고 네 친구를 의도적으로 지워버린 거라고! ...우리가 놈들을 당장 멈춰야 해.",
      "blocking": true
    },
    {
      "speaker": "LUCAS",
      "channel": "bubble",
      "text": "거기 laplace_fragment_02.sh 파일 보이지? 당장 실행해! 우리가 구해야 할 대상들을 특정해야 해.",
      "blocking": true
    }
  ],
  "notifications": [],
  "uiMarkers": {},
  "effects": {}
}
```

---

## 5-5. `CH3_LAPLACE_MISSION_02_READY`

### 목적

두 번째 라플라스 파편을 실행하여 전 세계 79억 노드를 감지하고, 지인 데이터 추출 및 암호화 미션을 시작한다.

### DB 필드

```
node_code: CH3_LAPLACE_MISSION_02_READY
node_type: console
prompt_type: command
is_checkpoint: true
is_terminal: false
```

### output_bundle

```json
{
  "scene": {
    "id": "CH3_LAPLACE_MISSION_02_READY",
    "mode": "terminal",
    "bgm": "tension_hum",
    "glitchLevel": 1,
    "scanPercent": 0,
    "resetTerminal": false
  },
  "content": {
    "terminalOutput": [
      "[NODE SCAN] Total Connected Nodes: 7,904,213,001",
      "guest@lucas-server:/sys/social/nodes$"
    ]
  },
  "messages": [
    {
      "speaker": "LUCAS",
      "channel": "bubble",
      "text": "79억 개의 연결... 이건 축복이 아니라 거대한 덫이야. 시스템은 이 수십억 개의 연결선을 타고 네 위치를 실시간으로 추적하고 있어.",
      "blocking": true
    },
    {
      "speaker": "LUCAS",
      "channel": "bubble",
      "text": "이 거대한 네트워크 전체를 암호화해서 숨기는 건 불가능해. 우주의 연산 능력이 우리보다 압도적이니까.",
      "blocking": true
    },
    {
      "speaker": "LUCAS",
      "channel": "bubble",
      "text": "살고 싶다면... 네가 신뢰하는 최소한의 노드(지인)들만 추출해서 놈들이 읽을 수 없게 완전히 암호화해버리고, 나머지는 과감히 끊어내야 해.",
      "blocking": true
    }
  ],
  "notifications": [],
  "uiMarkers": {},
  "effects": {}
}
```

---

## 5-6. `CH3_CORE_GROUP_EXTRACTED`

### 목적

플레이어의 지인 목록(`my_contacts.list`)을 기반으로 `global_connect.db`에서 보호 대상을 추출하여 `core_group.dat`을 생성한다.

### DB 필드

```
node_code: CH3_CORE_GROUP_EXTRACTED
node_type: console
prompt_type: command
is_checkpoint: false
is_terminal: false
```

### output_bundle

```json
{
  "scene": {
    "id": "CH3_CORE_GROUP_EXTRACTED",
    "mode": "terminal",
    "bgm": "tension_hum",
    "glitchLevel": 0,
    "scanPercent": 0,
    "resetTerminal": false
  },
  "content": {
    "terminalOutput": [
      "[EXTRACT] 142 matched nodes extracted to core_group.dat",
      "guest@lucas-server:/sys/social/nodes$"
    ]
  },
  "messages": [
    {
      "speaker": "LUCAS",
      "channel": "bubble",
      "text": "좋아, 핵심 인원들의 데이터는 뽑아냈어. 이제 이걸 시스템이 읽을 수 없게 암호화해야 해.",
      "blocking": true
    }
  ],
  "notifications": [],
  "uiMarkers": {},
  "effects": {}
}
```

### effect_bundle

```json
{
  "vfsOverlay": {
    "createdNodes": [
      {
        "path": "/sys/social/nodes/core_group.dat",
        "type": "file",
        "readable": true,
        "executable": false,
        "protected": false,
        "virtual": true,
        "createdBy": "grep_extract",
        "contentKey": "CORE_GROUP_DAT"
      }
    ]
  },
  "recentResult": "SUCCESS_MOVE"
}
```

---

## 5-7. `CH3_CORE_GROUP_ENCRYPTED`

### 목적

`gpg -c` 명령어를 통해 `core_group.dat`을 암호화하여 넥서스가 내용을 추적하지 못하게 한다.

### DB 필드

```
node_code: CH3_CORE_GROUP_ENCRYPTED
node_type: console
prompt_type: command
is_checkpoint: false
is_terminal: false
```

### output_bundle

```json
{
  "scene": {
    "id": "CH3_CORE_GROUP_ENCRYPTED",
    "mode": "terminal",
    "bgm": "tension_hum",
    "glitchLevel": 0,
    "scanPercent": 0,
    "resetTerminal": false
  },
  "content": {
    "terminalOutput": [
      "[ENCRYPT] Encrypting core_group.dat...",
      "[ENCRYPT] Enter passphrase: ***",
      "[SUCCESS] core_group.dat.gpg created.",
      "guest@lucas-server:/sys/social/nodes$"
    ]
  },
  "messages": [
    {
      "speaker": "LUCAS",
      "channel": "bubble",
      "text": "암호화 완료! 이제 이 파일을 안전 구역(/tmp)으로 옮겨서 격리시켜.",
      "blocking": true
    }
  ],
  "notifications": [],
  "uiMarkers": {},
  "effects": {}
}
```

### effect_bundle

```json
{
  "vfsOverlay": {
    "createdNodes": [
      {
        "path": "/sys/social/nodes/core_group.dat.gpg",
        "type": "file",
        "readable": true,
        "executable": false,
        "protected": false,
        "virtual": true,
        "createdBy": "gpg_encrypt",
        "contentKey": "CORE_GROUP_ENCRYPTED"
      }
    ]
  },
  "recentResult": "SUCCESS_MOVE"
}
```

---

## 5-8. `CH3_SAFE_ZONE_MOVED`

### 목적

암호화된 파일을 `/tmp/safe_zone.dat.gpg`로 이동시키고, 외부 터널 차단 명령을 준비한다.

### DB 필드

```
node_code: CH3_SAFE_ZONE_MOVED
node_type: console
prompt_type: command
is_checkpoint: true
is_terminal: false
```

### output_bundle

```json
{
  "scene": {
    "id": "CH3_SAFE_ZONE_MOVED",
    "mode": "terminal",
    "bgm": "tension_hum",
    "glitchLevel": 0,
    "scanPercent": 0,
    "resetTerminal": false
  },
  "content": {
    "terminalOutput": [
      "[SUCCESS] 142개 핵심 노드가 암호화되어 격리 터널(/tmp/safe_zone.dat.gpg)로 이동되었습니다.",
      "guest@lucas-server:/sys/social/nodes$"
    ]
  },
  "messages": [
    {
      "speaker": "LUCAS",
      "channel": "bubble",
      "text": "좋아, 네 사람들은 암호화된 안전 구역으로 옮겼어. 하지만 아직 79억 개의 선이 너에게 연결되어 있어. 이대로 두면 놈들이 선을 타고 들어올 거야.",
      "blocking": true
    },
    {
      "speaker": "LUCAS",
      "channel": "bubble",
      "text": "이제 보안 터널을 제외한 모든 외부 경로를 폐쇄해! 놈들이 더 이상 네 소셜 그래프를 타고 들어오지 못하게 iptables로 차단 명령을 내려!",
      "blocking": true
    }
  ],
  "notifications": [],
  "uiMarkers": {},
  "effects": {}
}
```

---

## 5-9. `CH3_IPTABLES_BLOCKED`

### 목적

`sudo iptables -A INPUT -s 0.0.0.0/0 -j DROP` 실행 시, 시스템에 연결되어 있던 수십억 개의 노드(타인들)가 연결 해제에 저항하며 살려달라는 메시지를 보낸다. 플레이어는 강제 종료의 죄책감과 결단을 강요받는다.

### DB 필드

```
node_code: CH3_IPTABLES_BLOCKED
node_type: console
prompt_type: command
is_checkpoint: false
is_terminal: false
```

### output_bundle

```json
{
  "scene": {
    "id": "CH3_IPTABLES_BLOCKED",
    "mode": "terminal",
    "bgm": "tension_hum",
    "glitchLevel": 2,
    "scanPercent": 0,
    "resetTerminal": false
  },
  "content": {
    "terminalOutput": [
      "[SEVERING] 비활성 노드 연결 해제 중...",
      "██████████████████░░░░░ 72%",
      "[!] ERROR: NODE_RESISTANCE_DETECTED",
      "[!] 7,904,212,859 nodes are requesting re-connection.",
      "",
      "Node_84920: \"Wait! I'm still here!\"",
      "Node_31022: \"Help me...\"",
      "guest@lucas-server:/sys/social/nodes$"
    ]
  },
  "messages": [
    {
      "speaker": "LUCAS",
      "channel": "bubble",
      "text": "망할, 터널 밖에 남은 노드들이 끊어지지 않으려고 발버둥 치고 있어. 시스템이 이 저항을 감지하면 곧바로 우리를 찾아낼 거야.",
      "blocking": true
    },
    {
      "speaker": "LUCAS",
      "channel": "bubble",
      "text": "...미안해하지 마. 그들이 희생해야 네가 살고, 네가 살아야 나중에 우주 커널을 고쳐서 그들을 롤백(복구)할 수 있어.",
      "blocking": true
    },
    {
      "speaker": "LUCAS",
      "channel": "bubble",
      "text": "눈 딱 감고 밀어버려. override --force 를 입력해!",
      "blocking": true
    }
  ],
  "notifications": [],
  "uiMarkers": {},
  "effects": {
    "playSound": "warning_short",
    "showDogAvatar": true
  }
}
```

---

## 5-10. `CH3_GHOST_MODE_ENABLED`

### 목적

`override --force`를 통해 타인들의 연결을 끊어버리고, 추적 불가능한 유령 상태가 된다. 루카스는 마지막 3번째 파편의 위치를 안내한다.

### DB 필드

```
node_code: CH3_GHOST_MODE_ENABLED
node_type: console
prompt_type: command
is_checkpoint: true
is_terminal: false
```

### output_bundle

```json
{
  "scene": {
    "id": "CH3_GHOST_MODE_ENABLED",
    "mode": "terminal",
    "bgm": "server_hum",
    "glitchLevel": 0,
    "scanPercent": 0,
    "resetTerminal": false
  },
  "content": {
    "terminalOutput": [
      "[SYSTEM] Force Severing initiated...",
      "[7,904,212,859 / 7,904,212,859] █ █ █ █ █ █ █ █ █ █",
      "",
      "[ SUCCESS ]",
      "- Isolated Nodes (Safe): 142",
      "- Purged Nodes (Dead): 7,904,212,859",
      "--------------------------------------------------",
      "Status: PURE_GHOST_MODE_ENABLED",
      "guest@lucas-server:/sys/social/nodes$"
    ]
  },
  "messages": [
    {
      "speaker": "LUCAS",
      "channel": "bubble",
      "text": "우린 이제 시스템에서 완전히 지워진 유령(Ghost)이야. 놈들은 더 이상 우리를 추적할 수 없어.",
      "blocking": true
    },
    {
      "speaker": "LUCAS",
      "channel": "bubble",
      "text": "이제 정말 마지막 조각이야. 마지막 조각을 찾은 후에 파편들을 하나로 합쳐서 '라플라스 알고리즘'을 컴파일하면 돼. 서둘러!",
      "blocking": true
    },
    {
      "speaker": "LUCAS",
      "channel": "bubble",
      "text": "거의 다 왔어. 마지막 조각은 시스템의 실행 엔진 근처에 있어. /usr/bin/local 경로를 찾아봐.",
      "blocking": true
    }
  ],
  "notifications": [],
  "uiMarkers": {},
  "effects": {}
}
```

---

## 5-11. `CH3_LOCAL_BIN_LIST`

### 목적

`/usr/bin/local` 디렉토리에 진입하여 `laplace_fragment_03.sh`를 발견하지만, 해당 위치에서는 권한 문제로 컴파일할 수 없음을 알게 된다.

### DB 필드

```
node_code: CH3_LOCAL_BIN_LIST
node_type: console
prompt_type: command
is_checkpoint: false
is_terminal: false
```

### output_bundle

```json
{
  "scene": {
    "id": "CH3_LOCAL_BIN_LIST",
    "mode": "terminal",
    "bgm": "server_hum",
    "glitchLevel": 0,
    "scanPercent": 0,
    "resetTerminal": false
  },
  "content": {
    "terminalOutput": [
      "nexus_engine*",
      "gc_controller*",
      "laplace_fragment_03.sh",
      "guest@lucas-server:/usr/bin/local$"
    ]
  },
  "messages": [
    {
      "speaker": "LUCAS",
      "channel": "bubble",
      "text": "찾았다, 3번째 파편! 하지만 여긴 시스템 핵심 보호 구역이라 네 게스트(guest) 권한으로는 여기서 파일을 조립할 수 없어.",
      "blocking": true
    },
    {
      "speaker": "LUCAS",
      "channel": "bubble",
      "text": "그 파편을 네 개인 작업 공간(홈 디렉토리, ~/)으로 안전하게 복사해 와!",
      "blocking": true
    }
  ],
  "notifications": [],
  "uiMarkers": {},
  "effects": {}
}
```

---

## 5-12. `CH3_FRAGMENT_03_COPIED`

### 목적

`cp laplace_fragment_03.sh ~/`를 통해 3번 파편을 안전하게 복사하고, 최종 컴파일을 준비한다.

### DB 필드

```
node_code: CH3_FRAGMENT_03_COPIED
node_type: console
prompt_type: command
is_checkpoint: true
is_terminal: false
```

### output_bundle

```json
{
  "scene": {
    "id": "CH3_FRAGMENT_03_COPIED",
    "mode": "terminal",
    "bgm": "server_hum",
    "glitchLevel": 0,
    "scanPercent": 0,
    "resetTerminal": false
  },
  "content": {
    "terminalOutput": [
      "guest@lucas-server:/usr/bin/local$"
    ]
  },
  "messages": [
    {
      "speaker": "LUCAS",
      "channel": "bubble",
      "text": "좋아, 모든 파편이 네 작업 공간(~/)에 모였어! 이제 이걸 하나로 합쳐서 '라플라스 알고리즘'을 컴파일해.",
      "blocking": true
    },
    {
      "speaker": "LUCAS",
      "channel": "bubble",
      "text": "이 코드가 완성되면 우주의 루트 권한을 얻고, 모든 걸 되돌릴 수 있어. 서둘러!",
      "blocking": true
    }
  ],
  "notifications": [],
  "uiMarkers": {},
  "effects": {}
}
```

### effect_bundle

```json
{
  "vfsOverlay": {
    "createdNodes": [
      {
        "path": "/home/guest/laplace_fragment_03.sh",
        "type": "file",
        "readable": true,
        "executable": true,
        "protected": false,
        "virtual": true,
        "createdBy": "cp_command",
        "contentKey": "LAPLACE_FRAGMENT_03"
      }
    ]
  },
  "recentResult": "SUCCESS_MOVE"
}
```

---

## 5-13. `CH3_COMPILE_BLOCKED`

### 목적

`compile --fragments laplace_fragment_*.sh --output laplace.qasm` 실행 시도.
파편을 모았으나 권한 문제로 코어 보안벽에 막혀버린다. 시스템 룰을 부수려면 `root` 권한이 필요함을 깨닫게 되며 Chapter 3가 종료된다.

### DB 필드

```
node_code: CH3_COMPILE_BLOCKED
node_type: ending
prompt_type: none
is_checkpoint: true
is_terminal: true
```

### output_bundle

```json
{
  "scene": {
    "id": "CH3_COMPILE_BLOCKED",
    "mode": "terminal",
    "bgm": "tension_hum",
    "glitchLevel": 3,
    "scanPercent": 0,
    "resetTerminal": false
  },
  "content": {
    "terminalOutput": [
      "[COMPILING] Quantum Assembly Code...",
      "[▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒--] 89.2%",
      "",
      "[!!! CRITICAL ALERT !!!]",
      "넥서스 코어 보안벽(Firewall) 접근 감지.",
      "[SYSTEM BLOCK] 논리적 모순 발생: 'External Node'가 'Core Logic'을 수정할 수 없습니다."
    ]
  },
  "messages": [
    {
      "speaker": "LUCAS",
      "channel": "bubble",
      "text": "안 돼!!! 코어 보안벽에 막혔어! '게스트' 권한으로는 우주의 커널을 수정할 수 없어...",
      "blocking": true
    },
    {
      "speaker": "LUCAS",
      "channel": "bubble",
      "text": "이대로면 알고리즘을 완성할 수 없어. 시스템의 룰을 깨부수려면... 우리가 직접 서버의 신(root)이 되어야만 해!",
      "blocking": true
    }
  ],
  "notifications": [
    {
      "type": "system",
      "title": "SYSTEM BLOCK",
      "body": "External Node가 Core Logic을 수정할 수 없습니다.",
      "priority": "high"
    }
  ],
  "uiMarkers": {},
  "effects": {
    "showDogAvatar": true,
    "playSound": "critical_error"
  }
}
```

### effect_bundle

```json
{
  "setFlags": {
    "chapter3_completed": true
  },
  "markCheckpoint": true,
  "snapshotPatch": {
    "flags.chapter3_completed": true
  },
  "recentResult": "SUCCESS_MOVE"
}
```
