# 백엔드 개발 일관성 가이드

## 1. 패키지 구조

단일 서버 기준으로 최상위 패키지는 `com.[project]`를 기본으로 한다.

멀티 서버나 마이크로서비스가 아니라면 `com.[project].[service]`까지 깊게 나눌 필요는 없다. 서비스명이 곧 프로젝트명인 단일 애플리케이션 구조로 유지한다. 기존 구조/컨벤션 문서의 도메인형 패키지 구조 원칙을 그대로 적용하되, 최상위 depth만 단일 서버 기준으로 단순화한다.

```
com.[project]
├── global
│   ├── config
│   ├── dto
│   ├── exception
│   ├── handler
│   ├── util
│   └── security
├── auth
│   ├── controller
│   ├── service
│   ├── repository
│   ├── entity
│   └── dto
├── user
│   ├── controller
│   ├── service
│   ├── repository
│   ├── entity
│   └── dto
├── chapter
├── story
├── progress
├── save
├── ending
├── fragment
├── log
└── hint
```

### 패키지 규칙

- 도메인형 패키지 구조를 기본으로 한다.
- 각 도메인 내부는 `controller`, `service`, `repository`, `entity`, `dto` 계층으로 나눈다.
- 공통 설정, 응답, 예외, 보안, 유틸리티는 `global` 아래에 둔다.
- `controller`, `service`, `repository`를 최상위에 따로 빼는 계층형 전체 구조는 사용하지 않는다.
- `dto`는 도메인 내부에 두고 `request`, `response` 하위 패키지로 세분화한다.

---

## 2. 계층별 책임

### Controller

- 요청을 받고 응답을 반환하는 역할만 담당한다.
- `@Valid`를 통한 입력 검증만 수행한다.
- 비즈니스 로직은 Service에 위임한다.
- 반환 타입은 `ResponseEntity<?>`를 기본으로 사용한다.
- Entity를 직접 파라미터나 응답으로 사용하지 않는다.

### Service

- 핵심 비즈니스 로직과 트랜잭션 경계를 담당한다.
- 조회성 클래스 또는 메서드는 `@Transactional(readOnly = true)`를 기본으로 한다.
- 생성, 수정, 삭제는 쓰기 트랜잭션을 명시한다.
- 여러 Repository 호출 조합, 도메인 규칙 검증, 예외 발생을 담당한다.

### Repository

- DB 접근의 유일한 창구로 사용한다.
- 기본 CRUD는 Spring Data JPA를 사용한다.
- 복잡한 조회는 QueryDSL 또는 Query Repository로 분리한다.

### DTO

- 계층 간 데이터 전달만 담당한다.
- 입력 검증 어노테이션은 Request DTO에 선언한다.
- 응답은 Response DTO로만 반환한다.
- Entity ↔ DTO 변환은 `from()`, `toEntity()` 또는 별도 Mapper를 사용한다.

### Entity

- `@Setter`를 사용하지 않는다.
- `@Data`를 사용하지 않는다.
- `@Getter`, `@NoArgsConstructor(access = PROTECTED)`, `@Builder` 중심으로 작성한다.
- 상태 변경은 비즈니스 메서드로만 수행한다.

---

## 3. 클래스 및 메서드 명명 규칙

### 클래스

- Controller: `{Domain}Controller`
- Service Interface: `{Domain}Service`
- Service Implementation: `{Domain}ServiceImpl`
- Repository: `{Domain}Repository`
- Request DTO: `{Action}{Domain}RequestDto`
- Response DTO: `{Action}{Domain}ResponseDto`
- Entity: `{Domain}`

### 메서드

- 단건 조회: `find...`, `get...`
- 목록 조회: `find...List`, `search...`
- 존재 확인: `exists...`
- 생성: `create...`, `save...`, `add...`
- 수정: `update...`, `modify...`
- 삭제: `delete...`, `remove...`

---

## 4. 코딩 스타일

- Google Java Style을 기본으로 한다.
- 들여쓰기는 4 spaces를 사용한다.
- `.editorconfig`를 적용한다.
- Spotless, Checkstyle을 통해 자동 포맷팅과 규칙 검사를 유지한다.
- 생성자 주입을 원칙으로 하며, `@RequiredArgsConstructor`를 사용한다.
- 필드 주입(`@Autowired`)은 사용하지 않는다.
- `System.out.println`은 금지하고 `@Slf4j`를 사용한다.

---

## 5. API 설계 규칙

### URI 규칙

- `/api/v1/...` 형태로 버저닝한다.
- URI는 소문자만 사용한다.
- 리소스는 복수형 명사로 표현한다.
- 단어 구분은 하이픈()을 사용한다.
- URI에 동사를 넣지 않는다.
- 확장자 `.json`, `.xml`은 사용하지 않는다.

### HTTP Method 규칙

- `GET`: 조회
- `POST`: 생성 또는 프로세스 실행
- `PUT`: 전체 수정
- `PATCH`: 부분 수정
- `DELETE`: 삭제

### 상태 코드 규칙

- `200 OK`: 조회, 수정, 삭제 성공
- `201 Created`: 생성 성공
- `400 Bad Request`: 요청값 검증 실패
- `401 Unauthorized`: 인증 실패
- `403 Forbidden`: 권한 없음
- `404 Not Found`: 리소스 없음
- `409 Conflict`: 중복/충돌
- `500 Internal Server Error`: 서버 내부 오류

### 목록 조회 규칙

- 쿼리 파라미터로 filtering, sorting, pagination을 지원한다.
- pagination은 `page`, `size`를 기본으로 한다.
- sorting은 `sort` 파라미터를 사용한다.

---

## 6. 인증 및 인가 규칙

- 인증 정보는 보안 계층에서 처리한다.
- 현재 유저 정보는 게이트웨이 또는 보안 계층 검증 후 Controller로 전달한다.
- 필요 시 `X-USER-ID` 헤더 기반 사용자 식별 방식을 사용한다.
- 인증 실패는 `401`, 권한 부족은 `403`으로 구분한다.
- role 기반 접근 제어를 적용한다.
- 게스트/일반 사용자/관리자 권한 차이는 서버에서 강제한다.

---

## 7. 응답 규칙

성공 응답은 기존 팀 규칙에 맞춰 `BaseResponse<T>` 포맷을 사용한다.

```json
{
  "code": null,
  "message": "조회 성공",
  "data": {
    "id": 1
  }
}
```

### 성공 응답 규칙

- 조회 성공: `ResponseEntity.ok(BaseResponse.success("조회 성공", data))`
- 데이터 없는 성공: `ResponseEntity.ok(BaseResponse.success("삭제 성공"))`
- 생성 성공: `201 Created`와 함께 `BaseResponse.success(...)`를 반환하고 필요 시 `Location` 헤더를 포함한다.

---

## 8. 예외 및 에러 코드 규칙

## 8-1. 에러 코드 구조

에러 코드는 다음 형식을 따른다.

- 형식: `[대문자 접두사 1자리][숫자 4자리]`
- 예시: `H1000`, `E3001`, `A2001`, `G1000`, `Q1001`

### 접두사 규칙

- `H`: HTTP/Common
- `E`: Entity/Auth
- `A`: Application/Business
- `G`: General/System
- `Q`: Query/Request

### 번호 대역 규칙

- `0000`: 정상 처리 또는 예외적 성공 코드
- `1000` ~ `1999`: 범용 공통 에러
- `2000` 이상: 도메인/기능별 세부 에러

---

## 8-2. 에러 응답 포맷

에러 응답은 `BaseResponse`가 아니라 **RFC 9457 Problem Details** 형식을 기본으로 사용하고, 서비스 전용 코드 `code`를 확장 필드로 포함한다.

```json
{
  "type": "https://api.example.com/problems/invalid-player-input",
  "title": "Invalid player input",
  "status": 400,
  "detail": "입력한 명령어 형식이 올바르지 않습니다.",
  "instance": "/api/v1/story/transitions",
  "code": "A1001"
}
```

### 필드 규칙

- `type`: 오류 유형 식별 URI, 없으면 `about:blank`
- `title`: 짧고 명확한 오류 요약
- `status`: HTTP 상태 코드
- `detail`: 사용자 또는 클라이언트가 이해할 수 있는 상세 설명
- `instance`: 요청 URI
- `code`: 서비스 내부 에러 코드

---

## 8-3. 에러 메시지 작성 규칙

- 현상을 명확하게 설명한다.
- 제약 조건 위반 시 허용 조건을 함께 안내한다.
- 시스템 내부 구조, SQL, 스택 트레이스, 외부 연동 상세를 노출하지 않는다.
- 모호한 문구를 피한다.

예:

- `입력하신 이메일 형식이 유효하지 않습니다.`
- `비밀번호는 영문, 숫자 포함 8자리 이상이어야 합니다.`
- `데이터 처리 중 오류가 발생했습니다. (Q1000)`

---

## 8-4. ErrorCode 설계 규칙

ErrorCode는 Enum으로 관리한다.

각 Enum은 최소 아래 정보를 가진다.

- `code`
- `httpStatus`
- `title`
- `detail`
- `type`

예시:

```java
@Getter
@RequiredArgsConstructor
public enum ErrorCode {

    H1000("H1000", HttpStatus.BAD_REQUEST, "Invalid request", "요청 파라미터가 올바르지 않습니다.", "/problems/invalid-request"),
    E1000("E1000", HttpStatus.UNAUTHORIZED, "Unauthorized", "인증이 필요합니다.", "/problems/unauthorized"),
    E1001("E1001", HttpStatus.FORBIDDEN, "Forbidden", "접근 권한이 없습니다.", "/problems/forbidden"),
    E3000("E3000", HttpStatus.NOT_FOUND, "User not found", "사용자를 찾을 수 없습니다.", "/problems/user-not-found"),
    A1000("A1000", HttpStatus.BAD_REQUEST, "Invalid player input", "입력한 명령어 형식이 올바르지 않습니다.", "/problems/invalid-player-input"),
    A1001("A1001", HttpStatus.CONFLICT, "Transition not allowed", "현재 상태에서는 해당 동작을 수행할 수 없습니다.", "/problems/transition-not-allowed"),
    A2000("A2000", HttpStatus.FORBIDDEN, "Guest save not allowed", "게스트 계정은 저장 기능을 사용할 수 없습니다.", "/problems/guest-save-not-allowed"),
    G1000("G1000", HttpStatus.INTERNAL_SERVER_ERROR, "Internal server error", "서버 내부 오류가 발생했습니다.", "/problems/internal-server-error"),
    Q1000("Q1000", HttpStatus.BAD_REQUEST, "Malformed JSON", "요청 본문의 JSON 형식이 올바르지 않습니다.", "/problems/malformed-json");

    private final String code;
    private final HttpStatus httpStatus;
    private final String title;
    private final String detail;
    private final String type;
}
```

---

## 8-5. CustomException 규칙

비즈니스 예외는 `CustomException`으로 통일한다.

스택 트레이스 비용을 줄이기 위해 stackless 예외를 기본으로 사용한다. 기존 가이드의 방식도 동일하다.

```java
@Getter
public class CustomException extends RuntimeException {

    private final ErrorCode errorCode;

    public CustomException(ErrorCode errorCode) {
        super(errorCode.getDetail());
        this.errorCode = errorCode;
    }

    @Override
    public synchronized Throwable fillInStackTrace() {
        return this;
    }
}
```

---

## 8-6. GlobalExceptionHandler 규칙

전역 예외 처리는 `@RestControllerAdvice`로 일원화한다.

비즈니스 예외, 유효성 검증 예외, JSON 파싱 예외, 예상치 못한 시스템 예외를 모두 여기서 처리한다. 기존 팀 가이드도 중앙 집중형 예외 처리를 표준으로 둔다.

권장 구조:

```java
@RestControllerAdvice
@Slf4j
public class GlobalExceptionHandler {

    @ExceptionHandler(CustomException.class)
    public ResponseEntity<ProblemDetail> handleCustomException(
            CustomException e,
            HttpServletRequest request
    ) {
        ErrorCode errorCode = e.getErrorCode();
        ProblemDetail problemDetail = ProblemDetail.forStatusAndDetail(
                errorCode.getHttpStatus(),
                errorCode.getDetail()
        );
        problemDetail.setTitle(errorCode.getTitle());
        problemDetail.setType(URI.create(errorCode.getType()));
        problemDetail.setInstance(URI.create(request.getRequestURI()));
        problemDetail.setProperty("code", errorCode.getCode());

        return ResponseEntity
                .status(errorCode.getHttpStatus())
                .body(problemDetail);
    }

    @ExceptionHandler(MethodArgumentNotValidException.class)
    public ResponseEntity<ProblemDetail> handleValidationException(
            MethodArgumentNotValidException e,
            HttpServletRequest request
    ) {
        ProblemDetail problemDetail = ProblemDetail.forStatusAndDetail(
                HttpStatus.BAD_REQUEST,
                "요청값 검증에 실패했습니다."
        );
        problemDetail.setTitle("Invalid request");
        problemDetail.setType(URI.create("/problems/invalid-request"));
        problemDetail.setInstance(URI.create(request.getRequestURI()));
        problemDetail.setProperty("code", "H1000");
        problemDetail.setProperty(
                "errors",
                e.getBindingResult().getFieldErrors().stream()
                        .map(error -> Map.of(
                                "field", error.getField(),
                                "message", error.getDefaultMessage()
                        ))
                        .toList()
        );

        return ResponseEntity.badRequest().body(problemDetail);
    }

    @ExceptionHandler(HttpMessageNotReadableException.class)
    public ResponseEntity<ProblemDetail> handleHttpMessageNotReadableException(
            HttpMessageNotReadableException e,
            HttpServletRequest request
    ) {
        ProblemDetail problemDetail = ProblemDetail.forStatusAndDetail(
                HttpStatus.BAD_REQUEST,
                "요청 본문의 JSON 형식이 올바르지 않습니다."
        );
        problemDetail.setTitle("Malformed JSON");
        problemDetail.setType(URI.create("/problems/malformed-json"));
        problemDetail.setInstance(URI.create(request.getRequestURI()));
        problemDetail.setProperty("code", "Q1000");

        return ResponseEntity.badRequest().body(problemDetail);
    }

    @ExceptionHandler(Exception.class)
    public ResponseEntity<ProblemDetail> handleException(
            Exception e,
            HttpServletRequest request
    ) {
        log.error("Unhandled exception", e);

        ProblemDetail problemDetail = ProblemDetail.forStatusAndDetail(
                HttpStatus.INTERNAL_SERVER_ERROR,
                "서버 내부 오류가 발생했습니다."
        );
        problemDetail.setTitle("Internal server error");
        problemDetail.setType(URI.create("/problems/internal-server-error"));
        problemDetail.setInstance(URI.create(request.getRequestURI()));
        problemDetail.setProperty("code", "G1000");

        return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(problemDetail);
    }
}
```

---

## 8-7. 예외 발생 규칙

- Service 계층에서만 비즈니스 예외를 발생시킨다.
- Controller에서 예외를 직접 처리하지 않는다.
- `try-catch`로 비즈니스 예외를 삼키지 않는다.
- 예상 가능한 도메인 실패는 반드시 `CustomException` + `ErrorCode`로 표현한다.

예:

```java
if (saveOwnerIsGuest) {
    throw new CustomException(ErrorCode.A2000);
}
```

---

## 9. API 문서화 규칙

- 모든 API는 Swagger로 문서화한다.
- Controller에는 `@Tag`, `@Operation`을 작성한다.
- DTO에는 `@Schema`를 작성한다.
- 별도 명세 문서에는 아래 항목을 포함한다.
    - API 개요
    - Request Headers
    - Path Variables / Query Parameters
    - Request Body
    - Success Response
    - Error Response
    - 비즈니스 에러 코드 목록

---

## 10. 테스트 규칙

- Service 계층 비즈니스 로직은 JUnit5 + Mockito로 테스트한다.
- 핵심 유스케이스는 통합 테스트를 추가한다.
- `./gradlew clean build -x test` 관행은 지양하고 테스트 포함 빌드를 기본으로 한다.
- Jacoco 도입 시 라인 커버리지 70% 이상을 권장한다.

### 우선 테스트 대상

- 인증/인가
- role 기반 접근 제한
- 저장/수정/삭제 유스케이스
- Story 전이 성공/실패
- 예외 코드 매핑
- GlobalExceptionHandler 응답 포맷
- JSON 파싱 실패 처리
- Validation 실패 처리

---

## 11. 협업 규칙

- 브랜치 전략은 `main`, `develop`, `feature` 구조를 따른다.
- 커밋 메시지는 `feat`, `fix`, `docs`, `style`, `refactor`, `env`, `chore`, `rename` 규칙을 따른다.
- PR은 리뷰 후 머지한다.
- 백엔드 작업 브랜치는 `be/...` 네이밍 규칙을 유지할 수 있으나, 실제 리포지토리 구조에 맞춰 단일 서버 프로젝트용으로 단순화해도 된다.

---

## 12. 이번 프로젝트 도메인 적용 규칙

이번 프로젝트는 일반 CRUD보다 `story`, `progress`, `save`, `ending`, `fragment`, `log` 도메인이 핵심이다.

따라서 아래를 기본 도메인으로 둔다.

- `auth`
- `user`
- `chapter`
- `story`
- `progress`
- `save`
- `ending`
- `fragment`
- `log`
- `hint`

### Story 도메인 규칙

- `story`는 노드 조회, 입력 검증, 전이, 효과 계산의 중심 도메인이다.
- 게임 입력 판정은 서버가 담당한다.
- 현재 상태에서 가능한 전이를 계산하고 다음 노드를 결정한다.
- 잘못된 입력, 불가능한 전이, 권한 부족, 저장 불가 등은 모두 정의된 에러 코드로 반환한다.

### Save / Progress 규칙

- 진행도와 저장 슬롯은 별도 책임으로 분리한다.
- 진행도는 현재 상태, 저장 슬롯은 명시적 복원 지점으로 다룬다.
- 게스트는 저장 기능을 사용할 수 없으며 `A` 대역 비즈니스 에러로 처리한다.

### Log 규칙

- 게임 내 사용자 입력과 결과는 구조화하여 저장한다.
- 시스템 로그와 게임 로그를 구분한다.
- 자유 입력 원문 저장은 필요 최소한으로 제한한다.

---

## 13. 금지 사항

- 최상위 계층형 패키지 구조 사용
- Entity 직접 반환
- Controller에서 비즈니스 로직 수행
- `@Setter`, `@Data` 사용
- 필드 주입 사용
- `System.out.println` 사용
- 모든 실패를 200 OK로 응답
- 비즈니스 예외를 문자열 메시지로만 처리
- ErrorCode 없이 예외를 던지는 방식
- GlobalExceptionHandler 밖에서 제각각 오류 응답 생성
- 내부 시스템 정보 노출
- SQL, stack trace, 민감한 토큰값을 `detail`에 노출