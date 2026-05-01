# Chapter 2 결정 문서 06: story_transitions.validator_config 포맷 및 구현 확장

## 1. 결정 요약

Chapter 2에서는 `story_transitions.validator_config`를 적극적으로 사용한다.

다만 현재 코드 기준으로는 `validator_config`가 거의 반영되지 않는다.

현재 구현 상태는 다음과 같다.

```text
exact
= request.inputValue.equals(expected_input)

regex
= request.inputValue.matches(expected_input)

server_rule
= validator_config.trigger == "auto" && inputValue == "auto"인 경우만 true
```

따라서 Chapter 2의 VFS, snapshot, flags, parsed command 기반 검증을 위해서는 `validator_config` 포맷 확정과 함께 validator 구현 확장이 필요하다.

최종 정책은 다음과 같다.

```text
- validator_type은 exact / regex / server_rule 3개를 유지한다.
- exact와 regex에도 공통 정규화 옵션을 적용한다.
- regex는 validator_config.pattern을 우선 사용한다.
- server_rule은 validator_config.rule 값을 기준으로 세부 검증 로직을 분기한다.
- Chapter 2의 VFS / snapshot / flags / parsed command 기반 검증은 server_rule로 처리한다.
- priority DESC 매칭은 유지한다.
- 특수 실패 분기는 정상 성공 전이보다 높은 priority를 가진다.
```

---

## 2. validator_type 역할 정의

`story_transitions.validator_type`은 현재 schema 기준으로 다음 세 값만 사용한다.

```text
exact
regex
server_rule
```

각 역할은 다음과 같이 확정한다.

| validator_type | 역할 |
| --- | --- |
| `exact` | 단순 고정 입력 검증 |
| `regex` | 정규식 기반 입력 검증 |
| `server_rule` | VFS, snapshot, flags, parsed command를 함께 보는 복합 검증 |

---

## 3. 공통 validator_config 옵션

모든 validator는 다음 공통 옵션을 지원할 수 있다.

```json
{
  "trim": true,
  "caseInsensitive": false,
  "normalizeWhitespace": true,
  "requiredFlags": [],
  "forbiddenFlags": []
}
```

### 필드 정의

| 필드 | 타입 | 설명 |
| --- | --- | --- |
| `trim` | boolean | 입력값 앞뒤 공백 제거 여부 |
| `caseInsensitive` | boolean | 대소문자 무시 여부 |
| `normalizeWhitespace` | boolean | 연속 공백을 하나의 공백으로 정규화할지 여부 |
| `requiredFlags` | array | 통과에 필요한 snapshot flag 목록 |
| `forbiddenFlags` | array | true이면 통과할 수 없는 snapshot flag 목록 |

### 공통 전처리 순서

```text
1. raw input 수신
2. trim이 true이면 앞뒤 공백 제거
3. normalizeWhitespace가 true이면 연속 공백을 하나로 정규화
4. caseInsensitive가 true이면 비교 시 대소문자 무시
5. requiredFlags 검사
6. forbiddenFlags 검사
7. validator_type별 세부 검증 수행
```

---

## 4. exact validator

## 4-1. 사용처

`exact`는 단순 고정 입력에 사용한다.

예:

```text
connect_core()
YES
view_recovered_document
complete_chapter
```

## 4-2. validator_config 예시

```json
{
  "trim": true,
  "caseInsensitive": false,
  "normalizeWhitespace": true
}
```

## 4-3. 검증 기준

```text
normalize(input) == normalize(expected_input)
```

## 4-4. Chapter 1 예시

`connect_core()`:

```json
{
  "trim": true,
  "caseInsensitive": false,
  "normalizeWhitespace": true
}
```

`YES`:

```json
{
  "trim": true,
  "caseInsensitive": true,
  "normalizeWhitespace": true
}
```

`YES`의 경우 사용자가 `yes`, `YES`, ` Yes `를 입력해도 통과할 수 있다.

---

## 5. regex validator

## 5-1. 사용처

`regex`는 단순 패턴 검증에 사용한다.

예:

```text
ssh guest@172.22.4.19
ssh guest@172.22.4.19:22
```

현재 Chapter 1에서는 프론트가 일부 command를 canonical form으로 변환하고 있지만, 장기적으로는 백엔드 validator에서도 regex 옵션을 정확히 처리하는 것이 안전하다.

## 5-2. validator_config 예시

```json
{
  "trim": true,
  "caseInsensitive": true,
  "normalizeWhitespace": true,
  "pattern": "^ssh\s+guest@172\.22\.4\.19(:22)?$"
}
```

## 5-3. 검증 기준

```text
1. validator_config.pattern이 있으면 해당 값을 regex pattern으로 사용한다.
2. validator_config.pattern이 없으면 expected_input을 regex pattern으로 사용한다.
3. caseInsensitive가 true이면 대소문자 무시 옵션을 적용한다.
```

## 5-4. 정책

```text
regex는 validator_config.pattern을 우선 사용한다.
validator_config.pattern이 없을 때만 expected_input을 pattern으로 사용한다.
```

---

## 6. server_rule validator

`server_rule`은 Chapter 2의 핵심 validator다.

단순 문자열 비교가 아니라 다음 정보를 함께 사용한다.

```text
- raw input
- parsed command
- 현재 nodeCode
- latest_snapshot_json
- terminal.cwd
- vfsOverlay
- VFS JSON
- flags
- scanPercent
```

기본 구조는 다음과 같다.

```json
{
  "rule": "VIRTUAL_FS_COMMAND",
  "command": "cat",
  "resolvedPath": "/home/guest/world_map.map",
  "allowRelativePath": true,
  "allowAbsolutePath": true,
  "requiredFlags": [],
  "forbiddenFlags": []
}
```

`server_rule`은 `validator_config.rule` 값을 기준으로 세부 검증 로직을 분기한다.

---

## 7. Chapter 2 server_rule 목록

Chapter 2에서 1차로 사용할 `server_rule`은 다음으로 제한한다.

```text
AUTO_SYSTEM
VIRTUAL_FS_COMMAND
NORMALIZED_COMMAND
PARSED_TAR_COMMAND
NC_SEND_FILE
CHAINED_COMMAND
```

---

## 8. AUTO_SYSTEM

## 8-1. 목적

자동 시스템 전이를 처리한다.

기존 `validator_config.trigger == "auto"` 방식보다 명시적으로 `rule: "AUTO_SYSTEM"`을 사용한다.

## 8-2. 예시

```json
{
  "rule": "AUTO_SYSTEM"
}
```

## 8-3. 검증 기준

```text
action_type = system
inputValue = auto
validator_config.rule = AUTO_SYSTEM
```

## 8-4. 사용 예시

```text
CH2_WORLD_MAP_VIEW
→ system:auto
→ CH2_GC_SCAN_ALERT
```

---

## 9. VIRTUAL_FS_COMMAND

## 9-1. 목적

`cat`, `sh`처럼 특정 파일 경로를 대상으로 하는 명령을 검증한다.

## 9-2. 사용 예시

```text
cat world_map.map
cat ./world_map.map
cat /home/guest/world_map.map

sh laplace_fragment_01.sh
sh ./laplace_fragment_01.sh
sh /home/guest/laplace_fragment_01.sh
```

## 9-3. cat world_map.map 예시

```json
{
  "rule": "VIRTUAL_FS_COMMAND",
  "command": "cat",
  "resolvedPath": "/home/guest/world_map.map",
  "allowRelativePath": true,
  "allowAbsolutePath": true,
  "requiredReadable": true
}
```

## 9-4. sh laplace_fragment_01.sh 예시

```json
{
  "rule": "VIRTUAL_FS_COMMAND",
  "command": "sh",
  "resolvedPath": "/home/guest/laplace_fragment_01.sh",
  "allowRelativePath": true,
  "allowAbsolutePath": true,
  "requiredExecutable": true,
  "requiredFlags": ["gc_scan_started"]
}
```

## 9-5. 검증 기준

```text
1. raw input을 command와 args로 파싱한다.
2. command가 validator_config.command와 일치하는지 확인한다.
3. args의 파일 경로를 현재 cwd 기준으로 정규화한다.
4. 정규화된 resolvedPath가 validator_config.resolvedPath와 일치하는지 확인한다.
5. VFS에 해당 path가 존재하는지 확인한다.
6. requiredReadable이 true이면 readable 여부 확인한다.
7. requiredExecutable이 true이면 executable 여부 확인한다.
8. requiredFlags / forbiddenFlags를 확인한다.
```

---

## 10. NORMALIZED_COMMAND

## 10-1. 목적

정해진 명령과 인자가 정확히 맞는지 검증한다.

공백 차이는 허용한다.

## 10-2. 사용 예시

```text
find . -name "*.tmp"
```

## 10-3. validator_config 예시

```json
{
  "rule": "NORMALIZED_COMMAND",
  "command": "find",
  "args": [".", "-name", "*.tmp"],
  "requiredFlags": ["laplace_mission_started"]
}
```

## 10-4. 허용 입력 예시

```bash
find . -name "*.tmp"
find    .   -name   "*.tmp"
```

## 10-5. 검증 기준

```text
1. raw input을 command와 args로 파싱한다.
2. command가 validator_config.command와 일치하는지 확인한다.
3. args 배열이 validator_config.args와 일치하는지 확인한다.
4. normalizeWhitespace가 true이면 공백 차이는 무시한다.
5. requiredFlags / forbiddenFlags를 확인한다.
```

---

## 11. PARSED_TAR_COMMAND

## 11-1. 목적

`tar -cvf decoy.tar ...` 명령을 검증한다.

정상 decoy 생성과 보호 코어 포함 실패 분기를 구분한다.

## 11-2. 정상 decoy 생성 예시

```json
{
  "rule": "PARSED_TAR_COMMAND",
  "outputFile": "decoy.tar",
  "requiredFiles": [
    "/home/guest/sys/temp/Memory_Dump_082.tmp",
    "/home/guest/cache/User_Behavior_88.tmp",
    "/home/guest/tmp/System_Temp_File.tmp"
  ],
  "forbiddenFiles": [
    "/home/guest/root/hidden/L_fragment_core.tmp"
  ],
  "requiredFlags": ["tmp_files_found"]
}
```

## 11-3. 보호 코어 포함 실패 분기 예시

```json
{
  "rule": "PARSED_TAR_COMMAND",
  "outputFile": "decoy.tar",
  "requiredFiles": [
    "/home/guest/sys/temp/Memory_Dump_082.tmp",
    "/home/guest/cache/User_Behavior_88.tmp",
    "/home/guest/tmp/System_Temp_File.tmp"
  ],
  "detectedFiles": [
    "/home/guest/root/hidden/L_fragment_core.tmp"
  ],
  "protectedFileIncluded": true,
  "requiredFlags": ["tmp_files_found"]
}
```

## 11-4. 검증 기준

```text
1. command가 tar인지 확인한다.
2. -cvf 옵션을 허용한다.
3. outputFile이 decoy.tar인지 확인한다.
4. 입력 파일 경로들을 현재 cwd 기준으로 정규화한다.
5. requiredFiles가 모두 포함되어 있는지 확인한다.
6. 정상 decoy 규칙에서는 forbiddenFiles가 포함되어 있으면 실패한다.
7. 보호 코어 실패 규칙에서는 detectedFiles가 포함되어 있으면 통과한다.
8. 파일 순서는 엄격히 보지 않는다.
9. requiredFlags / forbiddenFlags를 확인한다.
```

## 11-5. 파일 순서 정책

파일 순서는 엄격히 보지 않는다.

아래 두 입력은 같은 정상 명령으로 인정할 수 있다.

```bash
tar -cvf decoy.tar ./sys/temp/Memory_Dump_082.tmp ./cache/User_Behavior_88.tmp ./tmp/System_Temp_File.tmp
```

```bash
tar -cvf decoy.tar ./tmp/System_Temp_File.tmp ./sys/temp/Memory_Dump_082.tmp ./cache/User_Behavior_88.tmp
```

---

## 12. NC_SEND_FILE

## 12-1. 목적

`nc -w 3 127.0.0.1 8080 < decoy.tar` 명령을 검증한다.

## 12-2. validator_config 예시

```json
{
  "rule": "NC_SEND_FILE",
  "host": "127.0.0.1",
  "port": 8080,
  "timeoutSeconds": 3,
  "stdinFile": "/home/guest/decoy.tar",
  "requiredFlags": ["decoy_created"],
  "requiredCreatedFiles": ["/home/guest/decoy.tar"]
}
```

## 12-3. 검증 기준

```text
1. command가 nc인지 확인한다.
2. -w 옵션 값이 timeoutSeconds와 일치하는지 확인한다.
3. host가 validator_config.host와 일치하는지 확인한다.
4. port가 validator_config.port와 일치하는지 확인한다.
5. redirection input file이 stdinFile과 일치하는지 확인한다.
6. stdinFile이 effectiveVfs에 존재하는지 확인한다.
7. requiredCreatedFiles가 vfsOverlay.createdNodes에 존재하는지 확인한다.
8. requiredFlags / forbiddenFlags를 확인한다.
```

---

## 13. CHAINED_COMMAND

## 13-1. 목적

`rm decoy.tar && history -c`처럼 여러 명령이 연결된 경우를 검증한다.

## 13-2. validator_config 예시

```json
{
  "rule": "CHAINED_COMMAND",
  "operator": "&&",
  "commands": [
    {
      "command": "rm",
      "resolvedPath": "/home/guest/decoy.tar"
    },
    {
      "command": "history",
      "args": ["-c"]
    }
  ],
  "requiredFlags": ["decoy_sent"],
  "requiredCreatedFiles": ["/home/guest/decoy.tar"]
}
```

## 13-3. 검증 기준

```text
1. raw input을 chained command로 파싱한다.
2. operator가 validator_config.operator와 일치하는지 확인한다.
3. commands 개수와 순서가 일치하는지 확인한다.
4. rm 대상 경로를 cwd 기준으로 정규화한다.
5. 정규화된 경로가 validator_config.commands[0].resolvedPath와 일치하는지 확인한다.
6. history -c가 두 번째 명령으로 존재하는지 확인한다.
7. requiredCreatedFiles가 vfsOverlay.createdNodes에 존재하는지 확인한다.
8. requiredFlags / forbiddenFlags를 확인한다.
```

---

## 14. priority 정책

현재 코드처럼 priority DESC 매칭은 유지한다.

```text
1. 현재 latestNode 기준 transition 목록 조회
2. priority DESC 정렬
3. 각 transition의 validator_type에 따라 검증
4. 가장 먼저 통과한 transition 선택
```

Chapter 2에서는 특수 실패 분기가 정상 전이보다 먼저 잡혀야 한다.

예:

```text
tar_with_protected_core priority = 110
tar_normal_decoy priority = 100
```

이렇게 해야 보호 코어가 포함된 입력이 정상 tar 전이로 잘못 매칭되는 일을 막을 수 있다.

---

## 15. 구현 구조

검증 로직은 `StoryServiceImpl` 내부에 직접 몰아넣지 않는다.

다음 구조로 분리한다.

```text
TransitionValidator
├── ExactTransitionValidator
├── RegexTransitionValidator
└── ServerRuleTransitionValidator
    ├── AutoSystemRule
    ├── VirtualFsCommandRule
    ├── NormalizedCommandRule
    ├── ParsedTarCommandRule
    ├── NcSendFileRule
    └── ChainedCommandRule
```

## 15-1. TransitionValidator

공통 인터페이스 예시:

```java
public interface TransitionValidator {
    boolean supports(String validatorType);
    boolean matches(TransitionContext context, StoryTransition transition);
}
```

## 15-2. TransitionContext

`TransitionContext`에는 검증에 필요한 정보를 모은다.

```java
public class TransitionContext {
    private String rawInput;
    private String actionType;
    private StoryNode currentNode;
    private JsonNode latestSnapshot;
    private ParsedCommand parsedCommand;
    private EffectiveVfs effectiveVfs;
}
```

## 15-3. ServerRuleTransitionValidator

`server_rule`의 경우 `validator_config.rule`을 읽고 세부 rule로 위임한다.

```text
rule = AUTO_SYSTEM
→ AutoSystemRule

rule = VIRTUAL_FS_COMMAND
→ VirtualFsCommandRule

rule = NORMALIZED_COMMAND
→ NormalizedCommandRule

rule = PARSED_TAR_COMMAND
→ ParsedTarCommandRule

rule = NC_SEND_FILE
→ NcSendFileRule

rule = CHAINED_COMMAND
→ ChainedCommandRule
```

---

## 16. Chapter 1 호환성 정책

Chapter 1 기존 동작은 깨지지 않아야 한다.

기존 Chapter 1은 다음 입력을 중심으로 동작한다.

```text
connect_core()
ssh guest@172.22.4.19
YES
system:auto
```

호환성 정책:

```text
- exact 기본 동작은 유지한다.
- regex의 expected_input 기반 fallback을 유지한다.
- 기존 validator_config.trigger == "auto"도 당분간 지원한다.
- 신규 방식은 rule: AUTO_SYSTEM을 권장한다.
```

즉, 기존 seed가 `trigger: "auto"`를 사용하고 있어도 바로 깨지지 않게 한다.

다만 신규 Chapter 2 seed부터는 `rule: "AUTO_SYSTEM"`을 사용한다.

---

## 17. fail_node_id 관련 정책

현재 코드 분석 결과, `fail_node_id`는 엔티티와 컬럼에 존재하지만 실제 로직에서는 사용되지 않고 있다.

현재 실패 판정은 `nextNode.code.contains("_FAIL_")`에 의존한다.

Chapter 2에서는 실패 분기를 명시적으로 관리해야 하므로 다음 정책이 필요하다.

```text
1. 우선은 실패 분기도 명시적인 story_transition row로 만든다.
2. 즉, 보호 코어 포함 tar는 CH2_PROTECTED_CORE_DENIED로 가는 별도 transition을 둔다.
3. fail_node_id에 의존하지 않는다.
4. fail_node_id 사용 여부는 추후 리팩터링 안건으로 분리한다.
```

이렇게 하면 현재 코드 구조와 충돌을 줄일 수 있다.

---

## 18. effect_bundle 관련 정책

현재 코드 분석 결과, `effect_bundle`의 `setFlags`, `markCheckpoint`, `glitchLevel` 등은 snapshot에 병합되지 않는다.

Chapter 2에서는 반드시 effect_bundle 병합이 필요하다.

그러나 effect_bundle 처리 확장은 snapshot 병합 정책과 연결되므로 별도 구현 작업에서 다룬다.

6번 안건에서는 validator_config 검증 포맷만 확정한다.

정책:

```text
- validator_config는 입력 통과 여부를 판단한다.
- effect_bundle은 통과 후 상태 변화를 정의한다.
- 두 역할을 섞지 않는다.
```

---

## 19. 예시 transition 정의

## 19-1. cat world_map.map

```json
{
  "from": "CH2_EXPLORATION_READY",
  "to": "CH2_WORLD_MAP_VIEW",
  "action_type": "command",
  "expected_input": "cat /home/guest/world_map.map",
  "validator_type": "server_rule",
  "validator_config": {
    "rule": "VIRTUAL_FS_COMMAND",
    "command": "cat",
    "resolvedPath": "/home/guest/world_map.map",
    "allowRelativePath": true,
    "allowAbsolutePath": true,
    "requiredReadable": true
  },
  "priority": 100
}
```

---

## 19-2. sh laplace_fragment_01.sh

```json
{
  "from": "CH2_GC_SCAN_ALERT",
  "to": "CH2_LAPLACE_MISSION_READY",
  "action_type": "command",
  "expected_input": "sh /home/guest/laplace_fragment_01.sh",
  "validator_type": "server_rule",
  "validator_config": {
    "rule": "VIRTUAL_FS_COMMAND",
    "command": "sh",
    "resolvedPath": "/home/guest/laplace_fragment_01.sh",
    "allowRelativePath": true,
    "allowAbsolutePath": true,
    "requiredExecutable": true,
    "requiredFlags": ["gc_scan_started"]
  },
  "priority": 100
}
```

---

## 19-3. find . -name "*.tmp"

```json
{
  "from": "CH2_LAPLACE_MISSION_READY",
  "to": "CH2_TMP_SEARCH_RESULT",
  "action_type": "command",
  "expected_input": "find . -name "*.tmp"",
  "validator_type": "server_rule",
  "validator_config": {
    "rule": "NORMALIZED_COMMAND",
    "command": "find",
    "args": [".", "-name", "*.tmp"],
    "requiredFlags": ["laplace_mission_started"]
  },
  "priority": 100
}
```

---

## 19-4. 정상 tar

```json
{
  "from": "CH2_TMP_SEARCH_RESULT",
  "to": "CH2_DECOY_CREATED",
  "action_type": "command",
  "expected_input": "tar_normal_decoy",
  "validator_type": "server_rule",
  "validator_config": {
    "rule": "PARSED_TAR_COMMAND",
    "outputFile": "decoy.tar",
    "requiredFiles": [
      "/home/guest/sys/temp/Memory_Dump_082.tmp",
      "/home/guest/cache/User_Behavior_88.tmp",
      "/home/guest/tmp/System_Temp_File.tmp"
    ],
    "forbiddenFiles": [
      "/home/guest/root/hidden/L_fragment_core.tmp"
    ],
    "requiredFlags": ["tmp_files_found"]
  },
  "priority": 100
}
```

---

## 19-5. 보호 코어 포함 tar

```json
{
  "from": "CH2_TMP_SEARCH_RESULT",
  "to": "CH2_PROTECTED_CORE_DENIED",
  "action_type": "command",
  "expected_input": "tar_with_protected_core",
  "validator_type": "server_rule",
  "validator_config": {
    "rule": "PARSED_TAR_COMMAND",
    "outputFile": "decoy.tar",
    "requiredFiles": [
      "/home/guest/sys/temp/Memory_Dump_082.tmp",
      "/home/guest/cache/User_Behavior_88.tmp",
      "/home/guest/tmp/System_Temp_File.tmp"
    ],
    "detectedFiles": [
      "/home/guest/root/hidden/L_fragment_core.tmp"
    ],
    "protectedFileIncluded": true,
    "requiredFlags": ["tmp_files_found"]
  },
  "priority": 110
}
```

---

## 19-6. nc 전송

```json
{
  "from": "CH2_DECOY_CREATED",
  "to": "CH2_DECOY_SENT",
  "action_type": "command",
  "expected_input": "nc_send_decoy",
  "validator_type": "server_rule",
  "validator_config": {
    "rule": "NC_SEND_FILE",
    "host": "127.0.0.1",
    "port": 8080,
    "timeoutSeconds": 3,
    "stdinFile": "/home/guest/decoy.tar",
    "requiredFlags": ["decoy_created"],
    "requiredCreatedFiles": ["/home/guest/decoy.tar"]
  },
  "priority": 100
}
```

---

## 19-7. 흔적 삭제

```json
{
  "from": "CH2_DECOY_SENT",
  "to": "CH2_TRACE_CLEANED",
  "action_type": "command",
  "expected_input": "clean_trace",
  "validator_type": "server_rule",
  "validator_config": {
    "rule": "CHAINED_COMMAND",
    "operator": "&&",
    "commands": [
      {
        "command": "rm",
        "resolvedPath": "/home/guest/decoy.tar"
      },
      {
        "command": "history",
        "args": ["-c"]
      }
    ],
    "requiredFlags": ["decoy_sent"],
    "requiredCreatedFiles": ["/home/guest/decoy.tar"]
  },
  "priority": 100
}
```

---

## 20. 테스트 포인트

## 20-1. exact validator

```text
connect_core()
YES
 yes
 Yes 
```

확인:

```text
- trim 적용 여부
- caseInsensitive 적용 여부
- Chapter 1 기존 동작 유지 여부
```

## 20-2. regex validator

```text
ssh guest@172.22.4.19
ssh guest@172.22.4.19:22
SSH guest@172.22.4.19
```

확인:

```text
- validator_config.pattern 우선 사용 여부
- caseInsensitive 적용 여부
- expected_input fallback 여부
```

## 20-3. VIRTUAL_FS_COMMAND

```text
cat world_map.map
cat ./world_map.map
cat /home/guest/world_map.map
```

확인:

```text
- 세 입력이 같은 resolvedPath로 정규화되는지
- readable 검사 여부
- requiredFlags 검사 여부
```

## 20-4. PARSED_TAR_COMMAND

```text
정상 파일 3개만 포함
파일 순서 변경
보호 코어 포함
필수 파일 누락
```

확인:

```text
- requiredFiles 검사
- forbiddenFiles 검사
- detectedFiles 검사
- priority에 따라 보호 코어 분기가 먼저 잡히는지
```

## 20-5. NC_SEND_FILE

```text
nc -w 3 127.0.0.1 8080 < decoy.tar
nc -w 5 127.0.0.1 8080 < decoy.tar
nc -w 3 127.0.0.1 9090 < decoy.tar
```

확인:

```text
- timeoutSeconds 검사
- host 검사
- port 검사
- stdinFile 검사
- requiredCreatedFiles 검사
```

## 20-6. CHAINED_COMMAND

```text
rm decoy.tar && history -c
history -c && rm decoy.tar
rm decoy.tar
```

확인:

```text
- command 순서 검사
- operator 검사
- requiredCreatedFiles 검사
```

---

## 21. 확정 사항

```text
- validator_type은 exact / regex / server_rule 3개를 유지한다.
- exact와 regex에도 trim, caseInsensitive, normalizeWhitespace를 적용한다.
- regex는 validator_config.pattern을 우선 사용한다.
- validator_config.pattern이 없으면 expected_input을 pattern으로 사용한다.
- server_rule은 validator_config.rule 값으로 세부 validator를 분기한다.
- Chapter 2의 VFS / snapshot / flags / parsed command 기반 검증은 server_rule로 처리한다.
- Chapter 2에서 사용할 server_rule은 AUTO_SYSTEM, VIRTUAL_FS_COMMAND, NORMALIZED_COMMAND, PARSED_TAR_COMMAND, NC_SEND_FILE, CHAINED_COMMAND로 제한한다.
- priority DESC 매칭은 유지한다.
- 보호 코어 포함 tar처럼 특수 실패 분기는 정상 tar보다 priority를 높게 둔다.
- 기존 Chapter 1 호환성을 위해 기존 trigger:auto 방식도 당분간 지원한다.
- 신규 Chapter 2 seed에서는 rule:AUTO_SYSTEM 방식을 사용한다.
- fail_node_id는 현재 구현에서 사용하지 않으므로, Chapter 2 실패 분기는 명시적인 transition row로 관리한다.
- validator_config는 입력 통과 여부만 판단한다.
- effect_bundle은 통과 후 상태 변화에만 사용한다.
```
