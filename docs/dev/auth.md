# 🔐 인증 시스템 설계 문서 (OAuth2 + JWT + Redis)

---

## 1. 개요

OAuth2 기반 로그인과 JWT 인증을 결합한 **Stateless 인증 시스템**을 구현한다.

### 핵심 특징

* OAuth2를 통한 소셜 로그인 (Google)
* JWT 기반 인증 (Access / Refresh Token)
* Redis를 활용한 Refresh Token 관리
* 유저 상태 구분 (GUEST / MEMBER)
* 게스트에서 정식 회원으로의 유연한 전환 (Upgrade)

---

## 2. 전체 아키텍처

```
[Client]
   ↓
인증 요청 (게스트 초기화 또는 소셜 로그인)
   ↓
[Spring Security]
   ↓
Google OAuth 인증 또는 게스트 발급
   ↓
AuthService / OAuth2LoginSuccessHandler
   ↓
JWT 발급 (Access + Refresh)
   ↓
[Client 저장]
   ↓
이후 요청마다 JWT 사용 (Authorization: Bearer {Token})
   ↓
JwtAuthenticationFilter
   ↓
SecurityContext 저장
   ↓
Controller 접근
```

---

## 3. 인증 흐름

### 3.1 OAuth2 로그인 및 승격

1. `/oauth2/authorization/google` 요청
2. Google 로그인 진행
3. 사용자 정보 획득
4. `CustomOAuth2UserService`에서 사용자 매핑
    *   기존 게스트 토큰이 있는 경우: 기존 `GUEST` 레코드를 `MEMBER`로 승격 (Upgrade)
    *   기존 정보가 없는 경우: 신규 `MEMBER` 생성
5. `OAuth2LoginSuccessHandler`에서 최종 `MEMBER` 권한의 JWT 발급

### 3.2 게스트 세션 (Guest Init)

1. `/api/v1/auth/guest-init` 요청
2. `GUEST` 권한의 임시 유저 레코드 생성
3. 임시 닉네임(방랑자_xxxx) 부여
4. `GUEST` 권한의 JWT 발급

---

## 4. JWT 발급 및 구성

### 4.1 Access Token

* 유효기간: 30분
* 포함 정보 (Claims):
    * userId
    * email
    * nickname
    * role (GUEST 또는 MEMBER)

### 4.2 Refresh Token

* 유효기간: 14일
* Redis에 저장 (Key: `refresh_token:{userId}`)
* 토큰 재발급 시 Refresh Token Rotation 적용

---

## 5. 주요 구성 요소

### 5.1 JwtAuthenticationFilter

* 요청 헤더(`Authorization: Bearer ...`)에서 JWT 추출
* 토큰 검증 (만료 여부, 서명 등)
* 사용자 정보 추출 및 `CustomUserPrincipal` 생성
* `SecurityContextHolder`에 인증 정보 저장

### 5.2 CustomUserPrincipal

SecurityContext 내부에 저장되는 인증 주체 객체입니다.

```java
private Long userId;
private String email;
private String nickname;
private UserRole role; // GUEST, MEMBER
```

---

## 6. Refresh Token 관리 (Redis)

### 저장 구조

```
Key: refresh_token:{userId}
Value: refreshToken
TTL: 14일 (60 * 60 * 24 * 14 초)
```

### 동작 흐름

1. 로그인/게스트 초기화 시 Refresh Token 생성 및 Redis 저장
2. `/api/v1/auth/refresh` 요청 시 전달받은 토큰 검증
3. Redis에 저장된 값과 클라이언트가 보낸 값 비교
4. 일치할 경우 새로운 토큰 세트 발급 및 Redis 갱신 (Rotation)

---

## 7. 로그아웃

* Redis에 저장된 해당 유저의 Refresh Token을 삭제하여 이후의 재발급 요청을 차단합니다.

---

## 8. 사용자의 선택적 정보 관리 (닉네임)

### 핵심 원칙
* **분리된 책임**: 닉네임 변경은 단순히 유저 프로필 정보를 업데이트하는 작업입니다.
* **상태 전이 없음**: 닉네임을 설정하거나 변경한다고 해서 유저의 권한(`role`)이 변경되거나 토큰이 재발급되지 않습니다.
* **유연한 접근**: `GUEST`와 `MEMBER` 모두 필요에 따라 닉네임을 수정할 수 있습니다.

---

## 9. 유저 상태 관리 (UserRole)

| 상태 | 설명 | 보안 수준 |
| :--- | :--- | :--- |
| **GUEST** | 소셜 로그인을 하지 않은 임시 상태. 닉네임 수정 및 기본 게임 플레이 가능. | 최저 |
| **MEMBER** | 소셜 로그인이 완료된 정식 상태. 데이터 영구 보존 및 회원 전용 기능 사용 가능. | 보통 |

---

## 10. API 명세서

### 10.1 인증 관련 API (Auth)

#### 1) 게스트 초기화 (Guest Init)
* **URL**: `/api/v1/auth/guest-init`
* **Method**: `GET`
* **Response**:
```json
{
  "code": "COMMON200",
  "message": "게스트 세션이 초기화되었습니다.",
  "data": {
    "accessToken": "string",
    "refreshToken": "string",
    "userId": 1,
    "role": "GUEST",
    "nickname": "방랑자_xxxx"
  }
}
```

#### 2) 토큰 재발급 (Refresh)
* **URL**: `/api/v1/auth/refresh`
* **Method**: `POST`
* **Request Body**:
```json
{
  "refreshToken": "string"
}
```
* **Response**: 새로운 Access/Refresh 토큰 반환

#### 3) 로그아웃 (Logout)
* **URL**: `/api/v1/auth/logout`
* **Method**: `POST`
* **Authentication**: `Bearer AccessToken`

### 10.2 사용자 관련 API (User)

#### 1) 내 정보 조회 (Get My Info)
* **URL**: `/api/v1/users/me`
* **Method**: `GET`
* **Authentication**: `Bearer AccessToken`
* **Response Data**: 유저 고유 ID, 닉네임, 현재 권한(role)

#### 2) 닉네임 수정 (Update Nickname)
* **URL**: `/api/v1/users/nickname`
* **Method**: `PATCH`
* **Authentication**: `Bearer AccessToken` (GUEST, MEMBER 모두 가능)
* **Request Body**:
```json
{
  "nickname": "변경할닉네임"
}
```
* **Response**: 성공 메시지. (별도의 토큰 반환 없음)
