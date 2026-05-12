# Chapter 4 진행 정답 정리

기준 문서: `docs/dev/ch04/chapter4_scenario.md`

Chapter 3에서 이미 `execute laplace.qasm`을 시도했고, Chapter 4는 그 요청이 `LAPLACE_PENDING_04`로 `universe-core`에 보류된 상태에서 시작한다.

## 공통 진입 루트

```bash
계속
계속
cat gate_04.trace
nmap 10.2.2.2
nmap -sV -p 22 10.2.2.2
sshnuke 10.2.2.2 -rootpw="Z10N0101"
ssh root@10.2.2.2
hostname
corectl pending
```

`hostname`은 선택에 가깝지만, `root@universe-core`로 들어왔다는 위화감을 확인하는 단계다. 바로 `corectl pending`을 입력해도 진행된다.

## 엔딩 1: Sandbox Cage

루카스가 하라는 대로 pending job을 재개한다.

```bash
resume LAPLACE_PENDING_04
yes
yes
```

결과: 주변 사람만 safe zone에 남고, 전 세계 대부분의 노드가 삭제된다.

## 엔딩 2: Global Rollback

복구 프로토콜을 확인한 뒤 rollback을 실행한다.

```bash
ls -al
cat rollback_protocol.md
systemctl rollback --target global_connect.db
```

대체 입력:

```bash
restore --all
rollback global_connect.db
corectl rollback global_connect.db
```

결과: 루카스가 GC에 회수되고 세계가 복구된다. 단, NEXUS가 모든 선택을 관찰하고 있었다는 로그가 남는다.

## 엔딩 3: Absolute Reboot

먼저 `/minigames/lucas-survival`을 클리어해 fragment `4`를 저장해야 한다.
그 뒤 조사 루트에서 `lucas_route.sh`를 실행해 비밀 프로그램을 만든 뒤, 그 프로그램을 실행한다.

```bash
ls -al
file lucas_route.sh
sh lucas_route.sh
run /home/guest/.route_cache/lucas_authority_patch.bin
```

대체 입력:

```bash
execute /home/guest/.route_cache/lucas_authority_patch.bin
chmod +x /home/guest/.route_cache/lucas_authority_patch.bin
/home/guest/.route_cache/lucas_authority_patch.bin
```

결과: 루카스 권한이 강화되고 safe zone과 observer 예외까지 무시한 전체 초기화가 시작된다.

## 엔딩 4: Clean Rollback

먼저 `/minigames/lucas-survival`을 클리어해 fragment `4`를 저장해야 한다.
그 뒤 `lucas_route.sh` 보상 파일을 실행하지 않고 삭제한다.

```bash
ls -al
file lucas_route.sh
sh lucas_route.sh
rm /home/guest/.route_cache/lucas_authority_patch.bin
```

대체 입력:

```bash
shred /home/guest/.route_cache/lucas_authority_patch.bin
unlink /home/guest/.route_cache/lucas_authority_patch.bin
```

결과: 루카스의 마지막 권한 경로가 제거되고 자동 rollback이 시작된다. 엔딩 2보다 NEXUS 흑막 로그가 더 명확하게 노출된다.
