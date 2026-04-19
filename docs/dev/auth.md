# 🔐 인증 시스템 설계 문서 (OAuth2 + JWT + Redis)

---

## 1. 개요

OAuth2 기반 로그인과 JWT 인증을 결합한 **Stateless 인증 시스템**을 구현한다.

### 핵심 특징

* OAuth2를 통한 소셜 로그인 (Google)
* JWT 기반 인증 (Access / Refresh Token)
* Redis를 활용한 Refresh Token 관리
* 닉네임 기반 사용자 온보딩 (GUEST → USER)

---

## 2. 전체 아키텍처

```
[Client]
   ↓
OAuth2 로그인 요청
   ↓
[Spring Security]
   ↓
Google OAuth 인증
   ↓
OAuth2LoginSuccessHandler
   ↓
JWT 발급 (Access + Refresh)
   ↓
[Client 저장]
   ↓
이후 요청마다 JWT 사용
   ↓
JwtAuthenticationFilter
   ↓
SecurityContext 저장
   ↓
Controller 접근
```

---

## 3. 인증 흐름

### 3.1 OAuth2 로그인

1. `/oauth2/authorization/google` 요청
2. Google 로그인 진행
3. 사용자 정보 획득
4. `CustomOAuth2UserService`에서 사용자 매핑
5. `OAuth2LoginSuccessHandler`에서 JWT 발급

---

### 3.2 JWT 발급

#### Access Token

* 유효기간: 30분
* 포함 정보:

    * userId
    * email
    * nickname
    * role

#### Refresh Token

* 유효기간: 14일
* Redis에 저장 (Key: `refresh_token:{userId}`)

---

### 3.3 JWT 인증 흐름

```
Request
 → JwtAuthenticationFilter
 → JWT 검증
 → CustomUserPrincipal 생성
 → SecurityContext 저장
 → Controller
```

---

## 4. 주요 구성 요소

---

### 4.1 JwtAuthenticationFilter

* 요청 헤더에서 JWT 추출
* 토큰 검증
* 사용자 정보 추출
* `SecurityContext`에 인증 정보 저장

---

### 4.2 CustomUserPrincipal

JWT 기반 사용자 객체

```java
private Long userId;
private String email;
private String nickname;
private UserRole role;
```

역할:

* Controller까지 사용자 정보 전달
* 권한 정보 제공 (`getAuthorities()`)

---

### 4.3 SecurityConfig

* 인증 필터 등록
* OAuth2 로그인 설정
* 권한 기반 접근 제어

---

## 5. Refresh Token 관리 (Redis)

### 저장 구조

```
Key: refresh_token:{userId}
Value: refreshToken
TTL: 14일
```

---

### 동작 흐름

1. 로그인 시 Refresh Token 저장
2. `/api/auth/refresh` 요청 시 검증
3. Redis 값과 비교
4. 일치 시 토큰 재발급
5. Refresh Token Rotation 수행

---

## 6. 토큰 재발급 (Refresh)

### 흐름

```
Client → Refresh 요청
 → JWT 유효성 검사
 → Redis 토큰 검증
 → DB에서 사용자 조회
 → 새로운 토큰 생성
 → Redis 갱신
 → 응답 반환
```

---

## 7. 로그아웃

### 동작

* Redis에서 Refresh Token 삭제

```java
redisTemplate.delete("refresh_token:{userId}");
```

---

## 8. 사용자 온보딩 (닉네임 등록)

---

### 8.1 문제 상황

* 최초 로그인 시 nickname 없음
* JWT에도 nickname 없음

---

### 8.2 해결 방식

닉네임 등록 후 **토큰 재발급**

---

### 8.3 흐름

```
닉네임 등록 요청
 → 사용자 조회
 → nickname 저장
 → role: GUEST → USER 변경
 → 새로운 JWT 발급
 → Refresh Token Rotation
```

---

### 8.4 핵심 원칙

* JWT가 아닌 **DB 기준으로 토큰 생성**
* Refresh Token 반드시 교체
* Access Token 단독 재발급 금지

---

## 9. 사용자 상태 관리

| 상태    | 설명              |
| ----- | --------------- |
| GUEST | 최초 로그인 (닉네임 없음) |
| USER  | 닉네임 등록 완료       |

---

## 10. API 명세서

### 10.1 인증 관련 API (Auth)

#### 1) 토큰 재발급 (Refresh)
* **URL**: `/api/auth/refresh`
* **Method**: `POST`
* **Request Body**:
```json
{
  "refreshToken": "string"
}
```
* **Response Data**:
```json
{
  "accessToken": "string",
  "refreshToken": "string"
}
```

#### 2) 로그아웃 (Logout)
* **URL**: `/api/auth/logout`
* **Method**: `POST`
* **Authentication**: `Bearer AccessToken` 필요
* **Response Data**: `null`

### 10.2 사용자 관련 API (User)

#### 1) 닉네임 등록 및 가입 완료 (Register Nickname)
* **URL**: `/api/users/nickname`
* **Method**: `POST`
* **Authentication**: `Bearer AccessToken` 필요 (GUEST 권한 포함)
* **Request Body**:
```json
{
  "nickname": "string" // 최대 50자
}
```
* **Response Data**: 승급된 정보가 반영된 새로운 토큰 세트를 반환합니다.
```json
{
  "accessToken": "string",
  "refreshToken": "string",
  "userId": 1,
  "role": "USER",
  "nickname": "입력한닉네임"
}
```
