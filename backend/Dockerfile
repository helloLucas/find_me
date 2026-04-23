# 1단계: 빌드 단계 (Build Stage)
# 젠킨스 서버 환경에 상관없이 도커 내부에서 Java 21로 빌드합니다.
FROM amazoncorretto:21 AS builder
WORKDIR /app

# 1-1. Gradle 래퍼와 설정 파일들을 먼저 복사하여 종속성 캐시 활용
# 소스 코드가 바뀌어도 라이브러리가 그대로면 이 단계는 건너뜁니다 (빌드 속도 향상)
COPY gradlew .
COPY gradle gradle
COPY build.gradle settings.gradle ./

# 가독성을 위해 실행 권한 부여 및 의존성 사전 다운로드
RUN chmod +x ./gradlew
RUN ./gradlew dependencies --no-daemon

# 1-2. 소스 코드 복사 및 실제 빌드 진행
COPY src src
# 테스트는 제외하고 JAR 파일만 생성 (빌드 시간 단축)
RUN ./gradlew clean bootJar -x test --no-daemon

# 2단계: 실행 단계 (Run Stage)
# 빌드 도구는 버리고 실행에 필요한 가벼운 환경만 남깁니다.
FROM amazoncorretto:21-alpine
WORKDIR /app

# 보안을 위해 'spring'이라는 일반 사용자 계정을 생성하여 실행
# root 권한으로 실행되는 것을 방지합니다.
RUN addgroup -S spring && adduser -S spring -G spring
USER spring:spring

# 빌드 단계에서 생성된 최신 JAR 파일만 복사
# (build.gradle 설정에 따라 파일명이 다를 수 있으므로 와일드카드 사용)
COPY --from=builder /app/build/libs/*.jar app.jar

# 타임존 설정 및 실행 명령어
# -Duser.timezone=Asia/Seoul 설정을 통해 로그 시간을 한국 시간으로 맞춥니다.
ENTRYPOINT ["java", "-Duser.timezone=Asia/Seoul", "-jar", "app.jar"]

# 백엔드 기본 포트 노출
EXPOSE 8080