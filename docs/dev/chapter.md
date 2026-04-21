# Chapter Progress API 명세 및 비즈니스 로직

## 1. 개요
사용자의 챕터(week01 ~ week04) 진행 상태와 시스템의 챕터 배포 상태를 조합하여, 프론트엔드 '챕터 선택 화면'을 렌더링하기 위한 데이터를 제공하는 API입니다.

## 2. API 명세서

### **GET /api/v1/chapters**

- **설명**: 현재 로그인(또는 게스트) 유저의 챕터 권한 상태, 챕터 존재 여부를 연산하여 챕터 리스트를 반환합니다.
- **인증**: `Bearer Token` (Header - `Authorization`)

#### **Request**
별도의 파라미터나 바디 없이 토큰을 통해 유저 정보를 식별합니다.

#### **Response**
```json
{
  "code": null,
  "message": "챕터 목록 조회가 완료되었습니다.",
  "data": [
    {
      "code": "week01",
      "title": "Welcome to Lucas",
      "status": "COMPLETED"
    },
    {
      "code": "week02",
      "title": "Basic Commands",
      "status": "UNLOCKED"
    },
    {
      "code": "week03",
      "title": "Advanced Usage",
      "status": "LOCKED"
    },
    {
      "code": "week04",
      "title": "Unknown",
      "status": "DISABLED"
    }
  ]
}
```

#### **Status (챕터 상태) 속성 안내**
- `DISABLED` : 현재 시스템(DB)에 해당 챕터가 배포되지 않은 상태 (비활성화)
- `LOCKED` : 배포는 완료되었으나, 유저가 이전 챕터를 클리어하지 않아 접근이 불가한 상태 (비활성화)
- `UNLOCKED` : 유저가 접근하여 플레이할 수 있는 해금된 상태 (활성화)
- `COMPLETED` : 유저가 이미 해당 챕터를 클리어한 상태 (활성화)

---

## 3. 핵심 비즈니스 로직

### 3.1. 고정 노출 (Fixed Layout)
- 챕터는 항상 `week01`, `week02`, `week03`, `week04` 총 4개의 요소가 순차적으로 응답됩니다.
- DB에 정보가 누락되어 있더라도(`DISABLED`), UI 레이아웃의 통일성을 위해 배열에 포함됩니다.

### 3.2. 상태 평가(Status Evaluation) 흐름도
각 챕터를 순회하며 다음 과정을 거쳐 상태가 결정됩니다.

1. **배포 확인**
   - DB `chapters` 테이블에 해당 `code`(예: week01)가 존재하지 않는다면 무조건 `DISABLED`를 반환합니다.
   
2. **진행 이력 검증**
   - DB `user_chapter_progress` 테이블에 해당 유저와 챕터의 기록이 **존재할 경우**, 저장된 진행 상태(`UNLOCKED`, `COMPLETED`)를 그대로 매핑합니다.
   - 기록이 **존재하지 않을 경우**, 이전 챕터의 클리어 여부를 체크합니다.

3. **연쇄 해금(Chain Unlock) 로직**
   - 직전 챕터를 방금 클리어 했으나 아직 다음 챕터에 한 번도 진입하지 않아 DB 진행 기록이 없는 경우:
     - 챕터 입장 권한이 부여되었다고 판단하여 `UNLOCKED` 상태를 부여하고, 버튼을 활성화합니다.
     - 특히 **week01**의 경우, 이전 챕터 조건이 필요 없으므로 초기 진입 시 무조건 `UNLOCKED` 상태가 됩니다.
   - 이전 챕터를 클리어하지 않은 상태라면, 접근 권한이 없으므로 `LOCKED`를 반환합니다.
