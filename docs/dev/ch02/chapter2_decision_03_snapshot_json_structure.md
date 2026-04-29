# Chapter 2 결정 문서 03: Snapshot JSON 구조

## 1. 결정 요약

Chapter 2의 유저별 진행 상태는 `user_story_progress.latest_snapshot_json`에 저장한다.

수동 저장 또는 체크포인트 저장 시점의 상태는 `save_slots.snapshot_json`에 저장한다.

두 JSON은 같은 구조를 사용한다.

```text
latest_snapshot_json
= 계속 갱신되는 유저별 최신 진행 상태

save_slots.snapshot_json
= 특정 저장 시점의 snapshot 복사본
```

Snapshot JSON에는 전체 VFS 구조나 전체 터미널 로그를 저장하지 않는다.

Snapshot JSON은 다음 상태를 복구할 수 있을 정도의 최소 동적 상태만 저장한다.

```text
- 현재 챕터
- 현재 노드
- 현재 가상 디렉토리 위치
- VFS 버전
- snapshot 버전
- 동적 생성/삭제 파일
- 진행 flag
- GC 스캔율
- 최근 명령 요약
```

---

## 2. 최종 Snapshot JSON 표준 구조

```json
{
  "schemaVersion": 1,
  "snapshotVersion": 1,
  "vfsVersion": "chapter02-v1",
  "chapterCode": "week02",
  "nodeCode": "CH2_SERVER_HOME",
  "terminal": {
    "cwd": "/home/guest",
    "promptUser": "guest",
    "promptHost": "lucas-server",
    "lastCommand": null
  },
  "vfsOverlay": {
    "createdNodes": [],
    "removedPaths": [],
    "modifiedNodes": []
  },
  "flags": {
    "chapter2_started": true,
    "chapter2_file_list_checked": false,
    "world_map_checked": false,
    "observer_status_checked": false,
    "lucas_fragment_checked": false,
    "lucas_fragment_exec_attempted": false,
    "gc_scan_started": false,
    "laplace_mission_started": false,
    "tmp_files_found": false,
    "protected_core_access_attempted": false,
    "decoy_created": false,
    "decoy_sent": false,
    "trace_cleaned": false,
    "recovered_document_viewed": false,
    "chapter2_completed": false
  },
  "scanPercent": 0,
  "recentCommands": []
}
```

---

## 3. 필드 정의

| 필드 | 타입 | 설명 |
| --- | --- | --- |
| `schemaVersion` | number | Snapshot JSON 구조 자체의 버전 |
| `snapshotVersion` | number | 유저 상태 변경 버전. stale request 검증에 사용 |
| `vfsVersion` | string | 현재 snapshot이 기준으로 삼는 VFS JSON 버전 |
| `chapterCode` | string | 현재 챕터 코드 |
| `nodeCode` | string | 현재 스토리 노드 코드 |
| `terminal.cwd` | string | 유저의 현재 가상 디렉토리 위치 |
| `terminal.promptUser` | string | 터미널 프롬프트 사용자명 |
| `terminal.promptHost` | string | 터미널 프롬프트 호스트명 |
| `terminal.lastCommand` | string 또는 null | 마지막으로 처리된 명령어 |
| `vfsOverlay.createdNodes` | array | 유저 진행 중 생성된 동적 VFS 노드 |
| `vfsOverlay.removedPaths` | array | 유저 진행 중 삭제된 동적 파일/디렉토리 경로 |
| `vfsOverlay.modifiedNodes` | array | 유저 진행 중 수정된 동적 VFS 노드 |
| `flags` | object | Chapter 2 진행 상태 flag |
| `scanPercent` | number | 현재 GC 스캔율 |
| `recentCommands` | array | 최근 명령 요약 목록 |

---

## 4. `schemaVersion`

`schemaVersion`은 snapshot JSON의 구조 버전이다.

나중에 snapshot 구조가 바뀌면 이 값을 기준으로 마이그레이션하거나 fallback 처리를 할 수 있다.

```json
{
  "schemaVersion": 1
}
```

예를 들어 나중에 `terminal` 구조가 바뀌거나, `flags` 구조가 바뀌면 `schemaVersion`을 올린다.

---

## 5. `snapshotVersion`

`snapshotVersion`은 유저 상태가 변경될 때마다 증가하는 버전이다.

Active tab lock, stale request 방지, 여러 탭 상태 충돌 방지에 사용한다.

예시 요청:

```json
{
  "tabId": "tab-abc-123",
  "snapshotVersion": 3,
  "input": "cd cache"
}
```

서버의 최신 snapshotVersion이 4인데 요청이 3으로 들어오면, 서버는 오래된 탭의 요청으로 판단한다.

이 경우 명령을 실행하지 않는다.

```json
{
  "transitionResult": "STALE_STATE",
  "latestSnapshotVersion": 4
}
```

정책:

```text
- 명령 처리 성공 시 snapshotVersion을 1 증가시킨다.
- 일반 탐색 명령 STAY도 상태가 바뀌면 증가시킨다.
- cwd 변경, flag 변경, scanPercent 변경, vfsOverlay 변경 시 증가시킨다.
- 단순 조회성 명령이라도 recentCommands를 저장한다면 증가시킬 수 있다.
```

---

## 6. `vfsVersion`

`vfsVersion`은 현재 snapshot이 어떤 VFS JSON 버전을 기준으로 저장되었는지 나타낸다.

VFS JSON은 `resources/story/chapter02/vfs.json`에 저장되고, 정적 구조를 가진다.

```json
{
  "vfsVersion": "chapter02-v1"
}
```

이 값을 snapshot에도 저장하는 이유는 나중에 VFS 구조가 바뀌었을 때 기존 유저 상태를 복구하기 위해서다.

예를 들어 기존 snapshot에는 다음 상태가 저장되어 있다고 하자.

```json
{
  "vfsVersion": "chapter02-v1",
  "terminal": {
    "cwd": "/home/guest/cache"
  }
}
```

그런데 새 VFS에서 `/home/guest/cache`가 사라졌다면 서버는 fallback 처리를 해야 한다.

추천 fallback:

```text
1. snapshot.vfsVersion과 현재 VFS version 비교
2. 다르면 migration rule 확인
3. migration rule이 없고 cwd가 유효하지 않으면 defaultCwd로 복구
4. 내부 로그만 남기고 플레이어에게는 자연스럽게 최신 상태를 제공
```

---

## 7. `terminal`

`terminal`은 유저의 현재 가상 터미널 세션 상태를 저장한다.

```json
{
  "terminal": {
    "cwd": "/home/guest",
    "promptUser": "guest",
    "promptHost": "lucas-server",
    "lastCommand": null
  }
}
```

### 필드 설명

| 필드 | 설명 |
| --- | --- |
| `cwd` | 현재 가상 디렉토리 위치 |
| `promptUser` | 프롬프트 사용자명 |
| `promptHost` | 프롬프트 호스트명 |
| `lastCommand` | 마지막으로 처리한 명령어 |

예를 들어 사용자가 다음 명령을 입력하면:

```bash
cd sys/temp
```

snapshot은 다음처럼 변경된다.

```json
{
  "terminal": {
    "cwd": "/home/guest/sys/temp",
    "promptUser": "guest",
    "promptHost": "lucas-server",
    "lastCommand": "cd sys/temp"
  }
}
```

---

## 8. `vfsOverlay`

`vfsOverlay`는 기본 VFS JSON에 없는 유저별 동적 변경 사항을 저장한다.

기본 VFS JSON은 모든 유저에게 공통이다.

하지만 미션 중 생성되는 `decoy.tar`는 특정 유저에게만 존재해야 한다.

따라서 기본 VFS JSON에 넣지 않고 snapshot overlay로 관리한다.

```json
{
  "vfsOverlay": {
    "createdNodes": [],
    "removedPaths": [],
    "modifiedNodes": []
  }
}
```

런타임의 실제 파일 시스템은 다음 방식으로 합성한다.

```text
effectiveVfs = baseVfsJson + vfsOverlay.createdNodes - vfsOverlay.removedPaths + vfsOverlay.modifiedNodes
```

---

## 9. `vfsOverlay.createdNodes`

`createdNodes`는 유저 진행 중 새로 생성된 가상 파일/디렉토리를 저장한다.

예를 들어 정상 tar 명령으로 `decoy.tar`를 생성하면 다음처럼 저장한다.

```json
{
  "vfsOverlay": {
    "createdNodes": [
      {
        "path": "/home/guest/decoy.tar",
        "type": "file",
        "readable": true,
        "executable": false,
        "protected": false,
        "virtual": true,
        "createdBy": "tar_normal_decoy",
        "contentKey": "DECOY_TAR"
      }
    ],
    "removedPaths": [],
    "modifiedNodes": []
  }
}
```

`createdNodes`의 node 구조는 기본 VFS JSON의 node 구조와 최대한 맞춘다.

---

## 10. `vfsOverlay.removedPaths`

`removedPaths`는 유저 진행 중 삭제된 가상 파일/디렉토리 경로를 저장한다.

예를 들어 `rm decoy.tar && history -c`가 성공하면 다음처럼 저장한다.

```json
{
  "vfsOverlay": {
    "createdNodes": [],
    "removedPaths": [
      "/home/guest/decoy.tar"
    ],
    "modifiedNodes": []
  }
}
```

`removedPaths`는 기본 VFS에 있는 파일을 삭제하는 용도로도 사용할 수 있지만, Chapter 2에서는 기본적으로 `decoy.tar` 같은 동적 생성 파일 삭제에 사용한다.

---

## 11. `vfsOverlay.modifiedNodes`

`modifiedNodes`는 기존 파일의 속성이나 내용 키가 바뀌는 경우를 대비한 필드다.

Chapter 2 초기 구현에서는 사용하지 않아도 된다.

예시:

```json
{
  "vfsOverlay": {
    "modifiedNodes": [
      {
        "path": "/home/guest/observer_status.log",
        "patch": {
          "contentKey": "OBSERVER_STATUS_AFTER_SCAN"
        }
      }
    ]
  }
}
```

초기 정책:

```text
- Chapter 2 MVP에서는 modifiedNodes는 빈 배열로 둔다.
- 추후 파일 내용이 진행 상태에 따라 바뀌는 연출이 필요하면 사용한다.
```

---

## 12. `flags`

`flags`는 배열이 아니라 객체 형태로 저장한다.

```json
{
  "flags": {
    "world_map_checked": true,
    "tmp_files_found": false
  }
}
```

배열 방식은 사용하지 않는다.

```json
{
  "flags": [
    "world_map_checked"
  ]
}
```

객체 형태를 사용하는 이유:

```text
- true / false 상태가 명확하다.
- 특정 flag 존재 여부 확인이 쉽다.
- effect_bundle.snapshotPatch로 갱신하기 쉽다.
- 디버깅이 쉽다.
- false 상태도 명시적으로 관리할 수 있다.
```

---

## 13. Chapter 2 flag 목록

Chapter 2의 기본 flag는 다음과 같다.

| flag | 초기값 | 의미 |
| --- | --- | --- |
| `chapter2_started` | `true` | Chapter 2 시작 여부 |
| `chapter2_file_list_checked` | `false` | 최초 `ls` 확인 여부 |
| `world_map_checked` | `false` | `world_map.map` 확인 여부 |
| `observer_status_checked` | `false` | `observer_status.log` 확인 여부 |
| `lucas_fragment_checked` | `false` | `lucas_fragment_01.sh` 확인 여부 |
| `lucas_fragment_exec_attempted` | `false` | `lucas_fragment_01.sh` 실행 시도 여부 |
| `gc_scan_started` | `false` | GC 스캔 시작 여부 |
| `laplace_mission_started` | `false` | `laplace_fragment_01.sh` 미션 시작 여부 |
| `tmp_files_found` | `false` | `.tmp` 파일 탐색 완료 여부 |
| `protected_core_access_attempted` | `false` | 보호 코어 접근 시도 여부 |
| `decoy_created` | `false` | `decoy.tar` 생성 여부 |
| `decoy_sent` | `false` | `decoy.tar` 전송 여부 |
| `trace_cleaned` | `false` | 흔적 삭제 완료 여부 |
| `recovered_document_viewed` | `false` | 복구 문서 확인 여부 |
| `chapter2_completed` | `false` | Chapter 2 완료 여부 |

---

## 14. `scanPercent`

`scanPercent`는 현재 GC 스캔율을 저장한다.

```json
{
  "scanPercent": 42
}
```

처리 원칙:

```text
- Chapter 2 시작 시 0
- GC 스캔 시작 시 1
- laplace 미션 시작 시 18
- tmp 파일 탐색 성공 시 42
- decoy 생성 성공 시 58
- decoy 전송 성공 시 63
- 흔적 삭제 성공 시 0
- 위험/실패 입력 시 정책에 따라 증가 가능
- 100 도달 시 CH2_FAIL_GC_TRACE_COMPLETE
```

`scanPercent`는 top-level에 둔다.

이유:

```text
- 스토리 전체 상태에 가까움
- UI 스캔 바와 직접 연결됨
- terminal 내부 상태와 분리하는 것이 명확함
```

---

## 15. `recentCommands`

`recentCommands`는 최근 명령 요약만 저장한다.

전체 로그 저장소가 아니다.

```json
{
  "recentCommands": [
    {
      "input": "cat worlld_map.map",
      "result": "FAIL_NO_SUCH_FILE",
      "nodeCode": "CH2_EXPLORATION_READY"
    },
    {
      "input": "cat world_map.map",
      "result": "SUCCESS_MOVE",
      "nodeCode": "CH2_WORLD_MAP_VIEW"
    }
  ]
}
```

추천 저장 개수:

```text
최근 10개
```

용도:

```text
- 힌트 생성
- 직전 실수 파악
- 디버깅
- 복구 시 간단한 맥락 확인
```

전체 command/click 로그는 별도 `story_action_logs` 안건에서 다룬다.

---

## 16. `recentCommands` 저장 필드

각 command 요약은 다음 필드를 가진다.

```json
{
  "input": "cat world_map.map",
  "result": "SUCCESS_MOVE",
  "nodeCode": "CH2_WORLD_MAP_VIEW"
}
```

선택적으로 timestamp를 추가할 수 있다.

```json
{
  "input": "cat world_map.map",
  "result": "SUCCESS_MOVE",
  "nodeCode": "CH2_WORLD_MAP_VIEW",
  "at": "2026-04-28T12:00:00+09:00"
}
```

MVP에서는 `input`, `result`, `nodeCode`만으로 충분하다.

---

## 17. 초기 snapshot 예시

Chapter 2 첫 진입 시 snapshot은 다음과 같다.

```json
{
  "schemaVersion": 1,
  "snapshotVersion": 1,
  "vfsVersion": "chapter02-v1",
  "chapterCode": "week02",
  "nodeCode": "CH2_SERVER_HOME",
  "terminal": {
    "cwd": "/home/guest",
    "promptUser": "guest",
    "promptHost": "lucas-server",
    "lastCommand": null
  },
  "vfsOverlay": {
    "createdNodes": [],
    "removedPaths": [],
    "modifiedNodes": []
  },
  "flags": {
    "chapter2_started": true,
    "chapter2_file_list_checked": false,
    "world_map_checked": false,
    "observer_status_checked": false,
    "lucas_fragment_checked": false,
    "lucas_fragment_exec_attempted": false,
    "gc_scan_started": false,
    "laplace_mission_started": false,
    "tmp_files_found": false,
    "protected_core_access_attempted": false,
    "decoy_created": false,
    "decoy_sent": false,
    "trace_cleaned": false,
    "recovered_document_viewed": false,
    "chapter2_completed": false
  },
  "scanPercent": 0,
  "recentCommands": []
}
```

---

## 18. `cd sys/temp` 이후 snapshot 예시

```json
{
  "schemaVersion": 1,
  "snapshotVersion": 2,
  "vfsVersion": "chapter02-v1",
  "chapterCode": "week02",
  "nodeCode": "CH2_EXPLORATION_READY",
  "terminal": {
    "cwd": "/home/guest/sys/temp",
    "promptUser": "guest",
    "promptHost": "lucas-server",
    "lastCommand": "cd sys/temp"
  },
  "vfsOverlay": {
    "createdNodes": [],
    "removedPaths": [],
    "modifiedNodes": []
  },
  "flags": {
    "chapter2_started": true,
    "chapter2_file_list_checked": true,
    "world_map_checked": false,
    "observer_status_checked": false,
    "lucas_fragment_checked": false,
    "lucas_fragment_exec_attempted": false,
    "gc_scan_started": false,
    "laplace_mission_started": false,
    "tmp_files_found": false,
    "protected_core_access_attempted": false,
    "decoy_created": false,
    "decoy_sent": false,
    "trace_cleaned": false,
    "recovered_document_viewed": false,
    "chapter2_completed": false
  },
  "scanPercent": 0,
  "recentCommands": [
    {
      "input": "cd sys/temp",
      "result": "SUCCESS_STAY",
      "nodeCode": "CH2_EXPLORATION_READY"
    }
  ]
}
```

---

## 19. decoy 생성 후 snapshot 예시

```json
{
  "schemaVersion": 1,
  "snapshotVersion": 8,
  "vfsVersion": "chapter02-v1",
  "chapterCode": "week02",
  "nodeCode": "CH2_DECOY_CREATED",
  "terminal": {
    "cwd": "/home/guest",
    "promptUser": "guest",
    "promptHost": "lucas-server",
    "lastCommand": "tar -cvf decoy.tar ./sys/temp/Memory_Dump_082.tmp ./cache/User_Behavior_88.tmp ./tmp/System_Temp_File.tmp"
  },
  "vfsOverlay": {
    "createdNodes": [
      {
        "path": "/home/guest/decoy.tar",
        "type": "file",
        "readable": true,
        "executable": false,
        "protected": false,
        "virtual": true,
        "createdBy": "tar_normal_decoy",
        "contentKey": "DECOY_TAR"
      }
    ],
    "removedPaths": [],
    "modifiedNodes": []
  },
  "flags": {
    "chapter2_started": true,
    "chapter2_file_list_checked": true,
    "world_map_checked": true,
    "observer_status_checked": false,
    "lucas_fragment_checked": false,
    "lucas_fragment_exec_attempted": false,
    "gc_scan_started": true,
    "laplace_mission_started": true,
    "tmp_files_found": true,
    "protected_core_access_attempted": false,
    "decoy_created": true,
    "decoy_sent": false,
    "trace_cleaned": false,
    "recovered_document_viewed": false,
    "chapter2_completed": false
  },
  "scanPercent": 58,
  "recentCommands": [
    {
      "input": "find . -name "*.tmp"",
      "result": "SUCCESS_MOVE",
      "nodeCode": "CH2_TMP_SEARCH_RESULT"
    },
    {
      "input": "tar -cvf decoy.tar ./sys/temp/Memory_Dump_082.tmp ./cache/User_Behavior_88.tmp ./tmp/System_Temp_File.tmp",
      "result": "SUCCESS_MOVE",
      "nodeCode": "CH2_DECOY_CREATED"
    }
  ]
}
```

---

## 20. 흔적 삭제 후 snapshot 예시

```json
{
  "schemaVersion": 1,
  "snapshotVersion": 10,
  "vfsVersion": "chapter02-v1",
  "chapterCode": "week02",
  "nodeCode": "CH2_TRACE_CLEANED",
  "terminal": {
    "cwd": "/home/guest",
    "promptUser": "guest",
    "promptHost": "lucas-server",
    "lastCommand": "rm decoy.tar && history -c"
  },
  "vfsOverlay": {
    "createdNodes": [],
    "removedPaths": [
      "/home/guest/decoy.tar"
    ],
    "modifiedNodes": []
  },
  "flags": {
    "chapter2_started": true,
    "chapter2_file_list_checked": true,
    "world_map_checked": true,
    "observer_status_checked": false,
    "lucas_fragment_checked": false,
    "lucas_fragment_exec_attempted": false,
    "gc_scan_started": true,
    "laplace_mission_started": true,
    "tmp_files_found": true,
    "protected_core_access_attempted": false,
    "decoy_created": false,
    "decoy_sent": true,
    "trace_cleaned": true,
    "recovered_document_viewed": false,
    "chapter2_completed": false
  },
  "scanPercent": 0,
  "recentCommands": [
    {
      "input": "nc -w 3 127.0.0.1 8080 < decoy.tar",
      "result": "SUCCESS_MOVE",
      "nodeCode": "CH2_DECOY_SENT"
    },
    {
      "input": "rm decoy.tar && history -c",
      "result": "SUCCESS_MOVE",
      "nodeCode": "CH2_TRACE_CLEANED"
    }
  ]
}
```

---

## 21. save_slots.snapshot_json 저장 정책

`save_slots.snapshot_json`은 `latest_snapshot_json`과 같은 구조를 사용한다.

차이는 갱신 방식이다.

```text
latest_snapshot_json
- 명령 처리마다 계속 갱신됨

save_slots.snapshot_json
- 수동 저장 또는 체크포인트 저장 시점에 복사됨
```

정책:

```text
- 일반 탐색 명령은 save_slots를 만들지 않는다.
- 스토리 체크포인트 도달 시 save_slots를 생성하거나 갱신할 수 있다.
- 수동 저장 시 현재 latest_snapshot_json을 그대로 복사한다.
- 게임오버 후 재시도는 latest_checkpoint_node_id 또는 save_slots.snapshot_json을 기준으로 복구한다.
```

---

## 22. 확정 사항

```text
- latest_snapshot_json은 유저별 최신 상태 저장소로 사용한다.
- save_slots.snapshot_json은 같은 구조의 저장 시점 복사본으로 사용한다.
- schemaVersion을 둔다.
- snapshotVersion을 둔다.
- vfsVersion을 둔다.
- terminal.cwd를 둔다.
- VFS 동적 변경은 vfsOverlay로 분리한다.
- flags는 객체 형태로 둔다.
- scanPercent는 top-level 숫자로 둔다.
- recentCommands는 최근 10개 정도만 저장한다.
- 전체 command 로그는 snapshot이 아니라 별도 story_action_logs 안건에서 다룬다.
```
