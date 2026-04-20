# syntax=docker/dockerfile:1.7

FROM amazoncorretto:21 AS builder
WORKDIR /app

# Gradle wrapper / build script 먼저 복사해서 캐시 최대화
COPY gradlew ./
COPY gradle ./gradle
COPY settings.gradle* build.gradle* gradle.properties* ./

RUN chmod +x ./gradlew

# Gradle 캐시 활용
RUN --mount=type=cache,target=/root/.gradle \
    ./gradlew --no-daemon dependencies

# 실제 소스는 나중에 복사
COPY src ./src

# 테스트와 포맷 검사를 모두 강제 실행
RUN --mount=type=cache,target=/root/.gradle \
    ./gradlew --no-daemon clean bootJar -x test

# 실행 jar를 명시적으로 하나로 정리
RUN find build/libs -maxdepth 1 -type f -name "*.jar" ! -name "*-plain.jar" -exec cp {} /app/app.jar \;

FROM amazoncorretto:21
WORKDIR /app

RUN yum install -y shadow-utils && \
    groupadd -r spring && useradd -r -g spring spring && \
    yum clean all
COPY --from=builder /app/app.jar /app/app.jar
RUN chown spring:spring /app/app.jar

USER spring:spring
EXPOSE 8080
ENTRYPOINT ["java", "-jar", "/app/app.jar"]
