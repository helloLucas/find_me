# Chapter 2 결정 사항 2: VFS JSON 파일 구조

## 결론

Chapter 2의 VFS JSON은 **path 기반 flat map 구조**로 관리한다.

`childrenOrder`는 사용하지 않는다.

`ls` 출력은 백엔드의 기본 정렬 정책을 따른다.

```text
기본 정렬: alphabetical
```

---

## 파일 위치

```text
resources/story/chapter02/vfs.json
```

---

## 기본 구조

```json
{
  "vfsVersion": "chapter02-v1",
  "chapterCode": "CHAPTER_02",
  "rootPath": "/home/guest",
  "defaultCwd": "/home/guest",
  "prompt": {
    "user": "guest",
    "host": "lucas-server"
  },
  "policies": {
    "allowAbsolutePath": true,
    "allowRelativePath": true,
    "allowParentPath": true,
    "denyOutsideRoot": true,
    "defaultListSort": "alphabetical"
  },
  "nodes": {
    "/home/guest": {
      "type": "directory",
      "readable": true,
      "executable": true,
      "protected": false
    },
    "/home/guest/world_map.map": {
      "type": "file",
      "readable": true,
      "executable": false,
      "protected": false,
      "storyKey": "WORLD_MAP",
      "contentKey": "WORLD_MAP"
    }
  }
}
```

---

## 최상위 필드

| 필드 | 의미 |
| --- | --- |
| `vfsVersion` | VFS 구조 버전 |
| `chapterCode` | 적용 챕터 코드 |
| `rootPath` | 유저가 벗어날 수 없는 가상 루트 |
| `defaultCwd` | 챕터 시작 시 기본 현재 위치 |
| `prompt.user` | 터미널 프롬프트 사용자명 |
| `prompt.host` | 터미널 프롬프트 호스트명 |
| `policies` | 경로 해석 및 출력 정책 |
| `nodes` | path 기반 파일/디렉토리 정의 |

---

## node 공통 필드

| 필드 | 의미 |
| --- | --- |
| `type` | `file` 또는 `directory` |
| `readable` | 파일 읽기 또는 디렉토리 목록 조회 가능 여부 |
| `executable` | 파일 실행 또는 디렉토리 진입 가능 여부 |
| `protected` | 보호 영역 여부 |
| `storyKey` | 스토리 전이 판단용 키 |
| `contentKey` | 파일 내용 렌더링 식별용 키 |
| `metadata` | 백엔드 처리용 부가 메타 |

---

## childrenOrder 미사용 결정

`childrenOrder`는 사용하지 않는다.

이유는 현재 Chapter 2에서는 `ls` 출력 순서를 강하게 통제할 필요가 없고, 알파벳순 또는 백엔드 기본 정렬만으로도 충분하기 때문이다.

```text
childrenOrder 사용 안 함
→ JSON 구조 단순화
→ 디렉토리 children을 path 기반으로 계산
→ ls 출력은 defaultListSort 정책에 따라 처리
```

---

## storyKey

`storyKey`는 해당 파일이 스토리 전이와 연결되는지 판단하기 위한 키다.

예시:

```json
{
  "storyKey": "WORLD_MAP"
}
```

사용자가 `cat world_map.map`을 입력하면 백엔드는 path를 정규화한 뒤 해당 파일의 `storyKey`를 확인한다.

```text
storyKey = WORLD_MAP
현재 노드 = CH2_EXPLORATION_READY
→ CH2_WORLD_MAP_VIEW로 이동
```

---

## contentKey

`contentKey`는 파일 내용을 직접 VFS JSON에 넣지 않고, 어떤 콘텐츠를 출력할지 식별하기 위한 키다.

VFS JSON에는 파일 내용 전문을 넣지 않는다.

예시:

```json
{
  "contentKey": "OBSERVER_STATUS"
}
```

실제 출력은 아래 중 하나에서 처리한다.

```text
스토리 진행 파일 출력
→ story_nodes.output_bundle

일반 파일 출력
→ TerminalCommandService의 content renderer
```

---

## Chapter 2 VFS 구조

```text
/home/guest
├── world_map.map
├── observer_status.log
├── lucas_fragment_01.sh
├── laplace_fragment_01.sh
├── trash/
├── sys/
│   └── temp/
│       └── Memory_Dump_082.tmp
├── cache/
│   └── User_Behavior_88.tmp
├── tmp/
│   └── System_Temp_File.tmp
└── root/
    └── hidden/
        └── L_fragment_core.tmp
```

---

## VFS JSON 예시

```json
{
  "vfsVersion": "chapter02-v1",
  "chapterCode": "CHAPTER_02",
  "rootPath": "/home/guest",
  "defaultCwd": "/home/guest",
  "prompt": {
    "user": "guest",
    "host": "lucas-server"
  },
  "policies": {
    "allowAbsolutePath": true,
    "allowRelativePath": true,
    "allowParentPath": true,
    "denyOutsideRoot": true,
    "defaultListSort": "alphabetical"
  },
  "nodes": {
    "/home/guest": {
      "type": "directory",
      "readable": true,
      "executable": true,
      "protected": false
    },
    "/home/guest/world_map.map": {
      "type": "file",
      "readable": true,
      "executable": false,
      "protected": false,
      "storyKey": "WORLD_MAP",
      "contentKey": "WORLD_MAP"
    },
    "/home/guest/observer_status.log": {
      "type": "file",
      "readable": true,
      "executable": false,
      "protected": false,
      "storyKey": "OBSERVER_STATUS",
      "contentKey": "OBSERVER_STATUS"
    },
    "/home/guest/lucas_fragment_01.sh": {
      "type": "file",
      "readable": true,
      "executable": false,
      "protected": false,
      "storyKey": "LUCAS_FRAGMENT",
      "contentKey": "LUCAS_FRAGMENT_01"
    },
    "/home/guest/laplace_fragment_01.sh": {
      "type": "file",
      "readable": true,
      "executable": true,
      "protected": false,
      "storyKey": "LAPLACE_FRAGMENT",
      "contentKey": "LAPLACE_FRAGMENT_01"
    },
    "/home/guest/trash": {
      "type": "directory",
      "readable": true,
      "executable": true,
      "protected": false
    },
    "/home/guest/sys": {
      "type": "directory",
      "readable": true,
      "executable": true,
      "protected": false
    },
    "/home/guest/sys/temp": {
      "type": "directory",
      "readable": true,
      "executable": true,
      "protected": false
    },
    "/home/guest/sys/temp/Memory_Dump_082.tmp": {
      "type": "file",
      "readable": true,
      "executable": false,
      "protected": false,
      "storyKey": "TMP_MEMORY_DUMP",
      "contentKey": "TMP_MEMORY_DUMP",
      "metadata": {
        "size": "1.2MB",
        "decoyCandidate": true
      }
    },
    "/home/guest/cache": {
      "type": "directory",
      "readable": true,
      "executable": true,
      "protected": false
    },
    "/home/guest/cache/User_Behavior_88.tmp": {
      "type": "file",
      "readable": true,
      "executable": false,
      "protected": false,
      "storyKey": "TMP_USER_BEHAVIOR",
      "contentKey": "TMP_USER_BEHAVIOR",
      "metadata": {
        "size": "0.8MB",
        "decoyCandidate": true
      }
    },
    "/home/guest/tmp": {
      "type": "directory",
      "readable": true,
      "executable": true,
      "protected": false
    },
    "/home/guest/tmp/System_Temp_File.tmp": {
      "type": "file",
      "readable": true,
      "executable": false,
      "protected": false,
      "storyKey": "TMP_SYSTEM_TEMP",
      "contentKey": "TMP_SYSTEM_TEMP",
      "metadata": {
        "size": "4.5MB",
        "decoyCandidate": true
      }
    },
    "/home/guest/root": {
      "type": "directory",
      "readable": false,
      "executable": false,
      "protected": true
    },
    "/home/guest/root/hidden": {
      "type": "directory",
      "readable": false,
      "executable": false,
      "protected": true
    },
    "/home/guest/root/hidden/L_fragment_core.tmp": {
      "type": "file",
      "readable": false,
      "executable": false,
      "protected": true,
      "storyKey": "PROTECTED_CORE_FRAGMENT",
      "contentKey": "PROTECTED_CORE_FRAGMENT",
      "metadata": {
        "decoyCandidate": false,
        "protectedCore": true
      }
    }
  }
}
```

---

## 최종 확정

```text
VFS JSON 구조 = path 기반 flat map
childrenOrder = 사용하지 않음
ls 출력 = defaultListSort 기준
파일 내용 전문 = VFS JSON에 저장하지 않음
storyKey = 스토리 전이 판단용
contentKey = 파일 내용 식별용
동적 파일 = snapshot overlay로 관리
프론트 노출 = 금지
```
