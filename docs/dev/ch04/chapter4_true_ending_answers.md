# Chapter 4 진행 정답 정리

기준 문서: `docs/dev/ch04/chapter4_scenario.md`

Chapter 3에서 이미 `execute laplace.qasm`을 시도했고, Chapter 4는 그 요청이 `universe-core`에 보류된 상태에서 시작한다. 플레이어 진행은 `systemctl status` 확인을 강제하지 않고, `lucas-server`를 마운트한 뒤 `sha256sum`으로 `laplace.qasm` 무결성을 root 권한에서 다시 확인하고 `execute`로 실행 확인 플로우에 진입하는 흐름이다.

## 공통 진입 루트

```bash
cat gate_04.trace
nmap 10.2.2.2
nmap -sV -p 22 10.2.2.2
sshnuke 10.2.2.2 -rootpw="my-rootpw"
ssh root@10.2.2.2
my-rootpw
mount lucas-server:/home/guest /mnt/lucas-server
```

`-rootpw` 값은 예시다. 플레이어가 설정한 값을 SSH password prompt에 그대로 입력하면 된다. SSH 접속 후에는 `universe-core`의 별도 서버 세션이므로, hosts에 잡힌 `lucas-server` 별칭의 `/home/guest`를 `/mnt/lucas-server`에 붙인다.

허용되는 마운트 대체 입력:

```bash
mount lucas-server:~/ /mnt/lucas-server
mount guest@lucas-server:/home/guest /mnt/lucas-server
mount -t 9p lucas-server:/home/guest /mnt/lucas-server
mount /mnt/lucas-server
mount -a
```

## 엔딩 1: Sandbox Cage

루카스가 하라는 대로 `laplace.qasm`의 무결성을 root 권한으로 확인한 뒤, 파일 이름은 그대로 둔 채 execute를 실행한다.

```bash
sha256sum /mnt/lucas-server/laplace.qasm
execute /mnt/lucas-server/laplace.qasm
yes
yes
```

결과: 주변 사람만 safe zone에 남고, 전 세계 대부분의 노드가 삭제된다.

1차 확인에서 취소했다가 다시 진입하는 흐름:

```bash
sha256sum /mnt/lucas-server/laplace.qasm
execute /mnt/lucas-server/laplace.qasm
no
ls
execute /mnt/lucas-server/laplace.qasm
yes
yes
```

`no`는 execute 이후 1차 확인에서만 취소로 처리된다. 취소 후에는 검증 상태가 유지되므로 `execute /mnt/lucas-server/laplace.qasm`으로 바로 재진입할 수 있고, 원하면 `sha256sum /mnt/lucas-server/laplace.qasm` 재검증도 가능하다. 최종 확인은 기존 3차 확인처럼 `yes` 외 입력을 잘못된 입력으로 유지한다.

## 엔딩 2: Global Rollback

복구 프로토콜을 확인한 뒤 rollback을 실행한다.

```bash
ls -al
cat rollback_protocol.md
systemctl start global-rollback.service
```

대체 입력:

```bash
systemctl start rollback@global_connect.service
systemctl isolate rollback.target
```

결과: `CH4_ROLLBACK_SEQUENCE`에서 루카스의 root 세션 결속이 끊기고 GC 회수 전조가 출력된다. 별도 `계속` 버튼 없이 약 5초 뒤 `CH4_ROLLBACK_ENDING`으로 자동 이동해 세계 복구 영상과 엔딩 오버레이가 재생된다. 단, NEXUS가 모든 선택을 관찰하고 있었다는 로그가 남는다.

## 엔딩 3: Absolute Reboot

히든 조건은 Chapter 1~4의 미니게임 fragment `1`, `2`, `3`, `4`가 모두 저장된 상태다.
Chapter 4에서는 조사 루트에서 `lucas_route.sh`를 실행해 Lucas Route를 클리어하면 비밀 프로그램이 생성된다.

```bash
ls -al
sh lucas_route.sh
/root/.route_cache/lucas_authority_patch.bin
```

대체 입력:

```bash
./.route_cache/lucas_authority_patch.bin
```

결과: `CH4_REBOOT_SEQUENCE`에서 루카스 권한 강화와 observer 예외 무시 로그가 출력된 뒤, 약 6초 뒤 전체 초기화 엔딩으로 자동 진입한다.

## 엔딩 4: Clean Rollback

히든 조건은 Chapter 1~4의 미니게임 fragment `1`, `2`, `3`, `4`가 모두 저장된 상태다.
Chapter 4에서는 `lucas_route.sh` 보상 파일을 실행하지 않고 삭제한다.

```bash
ls -al
sh lucas_route.sh
rm /root/.route_cache/lucas_authority_patch.bin
```

대체 입력:

```bash
shred /root/.route_cache/lucas_authority_patch.bin
unlink /root/.route_cache/lucas_authority_patch.bin
```

결과: `CH4_CLEAN_ROLLBACK_SEQUENCE`에서 루카스의 마지막 권한 경로가 제거되는 로그가 출력된 뒤, 약 5초 뒤 clean rollback 엔딩으로 자동 진입한다. 엔딩 2보다 NEXUS 흑막 로그가 더 명확하게 노출된다.
