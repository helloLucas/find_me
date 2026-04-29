# Chapter 2 결정 사항 1: VFS 관리 방식

## 결론

Chapter 2의 VFS 기본 구조는 **JSON 파일로 관리**한다.

유저별 현재 위치, 생성 파일, 삭제 파일, 진행 플래그, GC 스캔율 같은 동적 상태는 JSON 파일에 저장하지 않고, DB의 `user_story_progress.latest_snapshot_json`에 저장한다.

세이브 슬롯에 저장되는 시점 상태는 `save_slots.snapshot_json`에 저장한다.

```text
VFS 기본 구조
→ resources/story/chapter02/vfs.json

유저별 현재 위치 / 생성 파일 / 삭제 파일 / 진행 상태
→ user_story_progress.latest_snapshot_json

세이브 시점 상태
→ save_slots.snapshot_json
```

---

## 결정 이유

Chapter 2의 가상 파일 시스템은 고정된 퍼즐 맵에 가깝다.

```text
/home/guest
├── world_map.map
├── observer_status.log
├── lucas_fragment_01.sh
├── laplace_fragment_01.sh
├── trash/
├── sys/
├── cache/
├── tmp/
└── root/
```

이 구조는 유저마다 달라지는 데이터가 아니라 모든 유저에게 동일하게 제공되는 정적 구조다.

따라서 현재 단계에서는 별도의 RDB 테이블로 정규화하기보다, 챕터별 JSON 리소스로 관리하는 방식이 더 적합하다.

---

## JSON 파일로 관리하는 항목

```text
- 가상 루트 경로
- 기본 현재 위치
- 파일/디렉토리 경로
- 파일/디렉토리 타입
- 읽기 가능 여부
- 실행 가능 여부
- 보호 영역 여부
- storyKey
- contentKey
- VFS 버전
```

---

## DB snapshot으로 관리하는 항목

```text
- 유저별 현재 디렉토리 위치(cwd)
- 유저별 생성 파일 목록
- 유저별 삭제 파일 목록
- 유저별 진행 flag
- 유저별 GC scanPercent
- 유저별 마지막 입력 명령
- 유저별 snapshotVersion
```

---

## 동적 파일 처리

`decoy.tar` 같은 파일은 기본 VFS JSON에 넣지 않는다.

이 파일은 특정 유저가 미션 중 생성하는 동적 파일이므로, 유저별 snapshot overlay로 관리한다.

```text
effectiveVfs = baseVfsJson + createdFiles - removedFiles
```

예시:

```json
{
  "terminal": {
    "createdFiles": [
      {
        "path": "/home/guest/decoy.tar",
        "type": "file",
        "readable": true,
        "executable": false,
        "virtual": true,
        "createdBy": "tar_normal_decoy"
      }
    ],
    "removedFiles": []
  }
}
```

---

## 프론트 노출 정책

VFS JSON은 백엔드 전용 리소스다.

프론트로 전체 VFS JSON을 내려보내지 않는다.

프론트는 사용자가 입력한 명령을 백엔드로 보내고, 백엔드가 반환한 터미널 출력 결과만 렌더링한다.

---

## RDB 테이블화는 언제 고려할지

아래 조건이 생기면 VFS를 RDB 테이블로 전환하는 것을 검토한다.

```text
- 관리자 페이지에서 VFS 구조를 수정해야 할 때
- 운영 중 배포 없이 파일 구조를 변경해야 할 때
- 챕터 수가 많아져 VFS를 콘텐츠 데이터처럼 관리해야 할 때
- 특정 파일/경로를 DB 쿼리로 검색하고 분석해야 할 때
```

현재 Chapter 2 구현 단계에서는 RDB 테이블화는 과설계에 가깝다.

---

## 최종 확정

```text
VFS 기본 구조 = JSON 파일
유저별 상태 = user_story_progress.latest_snapshot_json
세이브 상태 = save_slots.snapshot_json
동적 파일 = snapshot overlay
프론트 노출 = 금지
```
