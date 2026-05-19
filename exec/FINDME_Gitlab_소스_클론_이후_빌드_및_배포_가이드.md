# Gitlab 소스 클론 이후 빌드 및 배포할 수 있도록 정리한 문서

---

## 1. 요약

| 영역 | 런타임 | 핵심 프레임워크/서버 | 포트 | 배포 형태 | 주요 정의 파일 |
|---|---|---|---|---|---|
| Backend | Java 21 | Spring Boot 3.5.13 (내장 WAS: Tomcat 계열) | 8080, 18081 | Docker/K8s(Service: NodePort) | `backend/build.gradle`, `backend/Dockerfile`, `k8s/backend.yaml`, `backend/src/main/resources/application.yml` |
| Frontend | Node 24 (build), Nginx(stable-alpine, serve) | React 19 + Vite 8 | 80 | Docker/K8s(Service: NodePort) | `frontend/package.json`, `frontend/Dockerfile`, `k8s/frontend.yaml`, `frontend/vite.config.ts` |
| Hint Orchestrator | Python 3.12 | FastAPI + Uvicorn | 8201 | Docker/K8s(ClusterIP) | `ai/hint-orchestrator/Dockerfile`, `ai/hint-orchestrator/docker-compose.yml`, `k8s/orchestrator.yml` |
| Embedding Service | Python 3.11 | FastAPI + Uvicorn | 8101 | Docker Compose(서비스 분리) | `ai/embedding-service/Dockerfile`, `ai/embedding-service/docker-compose.yml` |
| DB | PostgreSQL(+pgvector) | - | 5432 | 외부 DB 또는 로컬 컨테이너 | `backend/.env.example`, `backend/docker-compose.local.yml`, `backend/src/main/resources/application.yml` |
| Cache | Redis 7 | - | 6379 | 외부 Redis 또는 로컬 컨테이너 | `backend/.env.example`, `backend/docker-compose.local.yml` |

---

## 2. 사용한 JVM/웹서버/WAS 상세

## 2-1. Backend

| 항목 | 값 | 정의 파일 |
|---|---|---|
| Language/JVM | Java 21 (`toolchain`) | `backend/build.gradle` |
| Spring Boot | 3.5.13 | `backend/build.gradle` |
| Dependency Mgmt | io.spring.dependency-management 1.1.7 | `backend/build.gradle` |
| Build Tool | Gradle Wrapper 8.14.4 | `backend/gradle/wrapper/gradle-wrapper.properties` |
| WAS | Spring Boot 내장 WAS(Tomcat 계열, Boot BOM 관리) | `spring-boot-starter-web` 사용 (`backend/build.gradle`) |
| Runtime Image | `amazoncorretto:21-alpine` | `backend/Dockerfile` |
| App Port | 8080 | `application.yml`, `Dockerfile`, `k8s/backend.yaml` |
| Monitoring Port | 18081(Actuator) | `application.yml`, `k8s/backend.yaml` |
| Timezone | `Asia/Seoul` | `backend/Dockerfile` ENTRYPOINT |
| 주요 보안/연동 의존성 | Security, OAuth2 Client, JWT, Redis, JPA, Validation | `backend/build.gradle` |

핵심 의존성
- `spring-boot-starter-web`
- `spring-boot-starter-data-jpa`
- `spring-boot-starter-security`
- `spring-boot-starter-validation`
- `spring-boot-starter-data-redis`
- `spring-boot-starter-oauth2-client`
- `spring-boot-starter-actuator`
- `micrometer-registry-prometheus`
- `software.amazon.awssdk:s3`
- `spring-boot-starter-mail`

## 2-2. Frontend

| 항목 | 값 | 정의 파일 |
|---|---|---|
| React | 19.2.4 | `frontend/package.json` |
| TypeScript | ~6.0.2 | `frontend/package.json` |
| Vite | ^8.0.4 | `frontend/package.json` |
| Build Image | `node:24-alpine` | `frontend/Dockerfile` |
| Serve Image(Web Server) | `nginx:stable-alpine` | `frontend/Dockerfile` |
| Serve Port | 80 | `frontend/Dockerfile`, `k8s/frontend.yaml` |
| Dev Server Port | `VITE_APP_PORT`(기본 4173) | `frontend/vite.config.ts` |

## 2-3. AI 서비스 상세 표

| 항목 | Hint Orchestrator | Embedding Service |
|---|---|---|
| Language | Python 3.12 | Python 3.11 |
| Framework | FastAPI + Uvicorn | FastAPI + Uvicorn |
| Container Image Base | `python:3.12-slim` | `python:3.11-slim` |
| Service Port | 8201 | 8101 |
| Health Endpoint | `/health` | `/health` |
| Compose 파일 | `ai/hint-orchestrator/docker-compose.yml` | `ai/embedding-service/docker-compose.yml` |

### 2-3-1. RAG 파이프라인 요약

1. 사용자 질문 수신 및 의도 분류(`progress_hint`/`command_usage` 등)
2. 질의 임베딩 생성
3. PostgreSQL(pgvector)에서 유사도 검색
4. 후보 후처리(정렬/필터/정책 반영)
5. evidence를 포함한 프롬프트 구성
6. 힌트 텍스트 생성(JSON 스키마 강제)

### 2-3-2. 단계별 모델 사용

| 단계 | 사용 모델(환경 변수) | 기본값(코드) | 정의 파일 |
|---|---|---|---|
| 의도 분류/라우팅 | `GMS_ROUTER_MODEL` | `gpt-5-mini` | `ai/hint-orchestrator/app/config.py`, `ai/hint-orchestrator/app/gms_client.py` |
| 질의 임베딩 생성 | `GMS_EMBEDDING_MODEL` | `gemini-embedding-001` | `ai/hint-orchestrator/app/config.py`, `ai/hint-orchestrator/app/gms_client.py`, `ai/hint-orchestrator/app/main.py` |
| 벡터 검색 | pgvector 코사인 유사도 | - | `ai/hint-orchestrator/app/vector_search.py` |
| 런타임 패턴 재정렬(옵션) | `GMS_EMBEDDING_MODEL` 재사용 | `gemini-embedding-001` | `ai/hint-orchestrator/app/main.py` |
| 최종 힌트 생성(일반) | `GMS_LLM_MODEL` | `gpt-5-mini` | `ai/hint-orchestrator/app/config.py`, `ai/hint-orchestrator/app/main.py` |
| 최종 힌트 생성(LIGHT) | `GMS_LIGHT_LLM_MODEL` | `gpt-5-mini` | `ai/hint-orchestrator/app/main.py` |
| 최종 힌트 생성(MEDIUM) | `GMS_LLM_MODEL` | `gpt-5` | `ai/hint-orchestrator/app/main.py` |
| 최종 힌트 생성(STRONG) | `GMS_LLM_MODEL` | `gpt-5` | `ai/hint-orchestrator/app/main.py` |
| 최종 힌트 생성(command usage) | `GMS_COMMAND_USAGE_LLM_MODEL` | `gpt-5-mini` | `ai/hint-orchestrator/app/main.py` |


## 2-4. IDE/JDK 기준

| 항목 | 값 | 정의 파일 |
|---|---|---|
| IntelliJ 프로젝트 JDK | `corretto-21` | `.idea/misc.xml` |

---

## 3. 리포지토리 구조 및 역할

| 경로 | 역할 |
|---|---|
| `backend/` | Spring Boot API, 인증/스토리/힌트 통합 |
| `frontend/` | React SPA, 사용자 UI |
| `ai/hint-orchestrator/` | 힌트 라우팅/검색/생성 오케스트레이션 |
| `ai/embedding-service/` | 임베딩 생성 API |
| `hint-worker/` | 백그라운드 워커(알림/집계 연동) |
| `k8s/` | 배포 매니페스트(backend/frontend/orchestrator/hpa) |
| `backend/.env`, `frontend/.env*`, `ai/*/.env` | 도메인 폴더 기준 실제 실행 환경 변수 파일 |

---

## 4. 사전 준비물

## 4-1. 로컬 개발용 필수 도구

| 도구 | 권장 |
|---|---|
| Git | 2.4x 이상 |
| Docker Desktop / Docker Engine | 최신 안정 버전 |
| Node.js | 24 계열 권장(프론트 Docker와 일치) |
| npm | Node 동봉 버전 사용 |
| Java | 21 |
| Python | 3.11/3.12 둘 다 필요 가능(AI 서비스별) |
| kubectl | 클러스터 버전(현재 v1.30.x) 호환 |

## 4-2. 클론

```bash
git clone https://lab.ssafy.com/s14-final/S14P31B102.git
cd S14P31B102
```

---

## 5. 환경 변수 체계

## 5-1. 환경 변수 파일 위치 맵

| 용도 | 파일 |
|---|---|
| Backend (Docker Compose) | `backend/.env` |
| Frontend (Vite) | `frontend/.env`, `frontend/.env.local` |
| Orchestrator (Docker Compose) | `ai/hint-orchestrator/.env` |
| Embedding Service (Docker Compose) | `ai/embedding-service/.env` |
| Hint Worker (standalone) | `hint-worker/.env` |
| Backend 예시 템플릿 | `backend/.env.example` |
| Frontend 예시 템플릿 | `frontend/.env.example` |
| Orchestrator 예시 템플릿 | `ai/hint-orchestrator/.env.example` |
| Embedding 예시 템플릿 | `ai/embedding-service/.env.example` |
| Hint Worker 예시 템플릿 | `hint-worker/.env.example` |

## 5-2. Backend 환경 변수 사전

- `backend/.env`

| 키 | 의미 |
|---|---|
| `SPRING_DATASOURCE_URL` | PostgreSQL 접속 URL |
| `SPRING_DATASOURCE_USERNAME` | DB 계정 |
| `SPRING_DATASOURCE_PASSWORD` | DB 비밀번호 |
| `REDIS_HOST` / `REDIS_PORT` / `REDIS_PASSWORD` | Redis 접속 정보 |
| `SERVER_PORT` | 앱 포트(기본 8080) |
| `CORS_ALLOWED_ORIGINS` | CORS 허용 오리진 |
| `FRONTEND_URL` | 프론트 URL |
| `GOOGLE_CLIENT_ID/SECRET` | Google OAuth |
| `SSAFY_CLIENT_ID/SECRET` | SSAFY OAuth |
| `JWT_SECRET` | JWT 서명키 |
| `AWS_ACCESS_KEY` / `AWS_SECRET_KEY` / `AWS_REGION` / `AWS_S3_BUCKET` / `AWS_CDN_URL` | S3/CDN 연동 |
| `MAIL_USERNAME` / `MAIL_PASSWORD` | SMTP 메일 전송 |
| `HINT_ORCHESTRATOR_SERVICE_URL` | 백엔드 -> 오케스트레이터 호출 주소 |
| `HINT_*` (검색/유사도/타임아웃) | 힌트 정책 파라미터 |

## 5-3. Frontend 환경 변수 사전

- `frontend/.env`
- `frontend/.env.local` (로컬 오버라이드)

| 키 | 의미 |
|---|---|
| `VITE_API_BASE_URL` | API base URL |
| `VITE_CDN_URL` | 정적자산 CDN URL |
| `VITE_DEV_MODE` | 개발 모드 토글 |
| `VITE_ANALYTICS_ENABLED` | 분석 기능 토글 |
| `VITE_GA4_MEASUREMENT_ID` | GA4 |
| `VITE_CLARITY_PROJECT_ID` | Clarity |
| `VITE_APP_PORT` | Vite dev 서버 포트 |
| `VITE_HMR_HOST/PROTOCOL/CLIENT_PORT` | HMR 통신 파라미터 |
| `VITE_DEV_PROXY_TARGET` | 로컬 프록시 백엔드 주소 |

## 5-4. Hint Orchestrator 환경 변수 사전

- `ai/hint-orchestrator/.env`

| 키 그룹 | 의미 |
|---|---|
| `SERVICE_NAME`, `APP_ENV`, `APP_HOST`, `APP_PORT` | 서비스 런타임 |
| `PG_HOST`, `PG_PORT`, `PG_DB`, `PG_USER`, `PG_PASSWORD` | PostgreSQL 접속 |
| `REDIS_HOST`, `REDIS_PORT`, `REDIS_PASSWORD` | Redis 접속 |
| `GMS_BASE_URL`, `GMS_KEY`, `GMS_LLM_MODEL`, `GMS_ROUTER_MODEL`, `GMS_OPENAI_CHAT_PATH`, `GMS_EMBEDDING_MODEL`, `GMS_EMBEDDING_OUTPUT_DIMENSIONALITY` | LLM/임베딩 호출 |
| `RETRIEVE_DEFAULT_*` | 검색 기본값 |
| `HINT_LEVEL_*`, `HINT_REPEAT_*`, `HINT_COMMAND_USAGE_*` | 힌트 레벨 정책 및 라우팅 |
| `VECTOR_SOURCE_FILTER`, `VECTOR_KNOWLEDGE_KIND_FILTER` | 벡터 메타 필터 |

## 5-5. Embedding Service 환경 변수 사전

- `ai/embedding-service/.env`

| 키 | 의미 |
|---|---|
| `SERVICE_NAME`, `APP_ENV`, `APP_HOST`, `APP_PORT` | 서비스 런타임 |
| `GMS_BASE_URL`, `GMS_KEY`, `GMS_EMBEDDING_MODEL`, `GMS_TIMEOUT_SECONDS` | 임베딩 API 호출 |
| `EMBED_MAX_BATCH_SIZE`, `EMBED_MAX_CONCURRENCY` | 배치 처리량 제어 |

## 5-6. 보안/주입 원칙

- 로컬: `.env` 파일 기반
- K8s: `envFrom.secretRef` 기반
  - backend -> `backend-secrets`
  - hint-orchestrator -> `orchestrator-secrets`
- 따라서 운영 서버 기준 반영의 최종 기준은 **Git 파일이 아니라 Kubernetes Secret 값**이다.

---

## 6. GitLab 클론 후 로컬 실행 절차

## 6-1. 백엔드 + DB/Redis 도커, 프론트 로컬

1) Backend/DB/Redis 기동

```bash
cd backend
cp .env.example .env
docker compose -f docker-compose.local.yml up -d --build
```

2) Frontend 기동

```bash
cd ../frontend
npm install
npm run build
npm run preview
```

3) 확인

```bash
curl http://127.0.0.1:8888/actuator/health

# 이후 http://127.0.0.1:4173/ 접속
```

## 6-2. AI RAG 힌트용 오케스트레이터  

```bash
# orchestrator
cd ai/hint-orchestrator
cp .env.example .env
docker compose up -d --build
curl http://localhost:8201/health
```

---

## 7. K8s 배포 절차

## 7-1. 배포 파일

| 파일 | 역할 |
|---|---|
| `k8s/backend.yaml` | backend Deployment + Service(NodePort) |
| `k8s/frontend.yaml` | frontend Deployment + Service(NodePort) |
| `k8s/orchestrator.yml` | orchestrator Deployment + Service(ClusterIP) |
| `k8s/backend-hpa.yaml` | backend HPA(cpu 70%, min2 max6) |

## 7-2. 기본 배포

```bash
kubectl apply -f k8s/backend.yaml
kubectl apply -f k8s/frontend.yaml
kubectl apply -f k8s/orchestrator.yml
kubectl apply -f k8s/backend-hpa.yaml
```

## 7-3. 검증 명령어

```bash
kubectl get nodes --show-labels
kubectl get pods -n prod -o wide
kubectl get svc -n prod -o wide
kubectl get ingress -n prod -o wide
kubectl get endpoints -n prod
kubectl get hpa -n prod
```

---

## 8. 배포 시 특이사항

1. `k8s/*.yaml` 기본값은 `nodeSelector: env=dev` 기준인데, 운영 클러스터는 `env=prod` 노드(예: worker1)에 스케줄링된다.  

2. backend 서비스는 2개 포트를 노출한다.
   - `8080`: 사용자 API
   - `18081`: 모니터링/관리(Actuator)

3. orchestrator 서비스는 `ClusterIP`다.
   - 외부 ALB로 직접 진입하지 않는다.
   - backend 내부 호출 경로에서만 사용한다.
   - `prod`, `dev` 네임스페이스에 함께 띄워짐.

4. Ingress는 리포지토리 `k8s/`에 manifest가 없고, 클러스터에서 운용 중인 리소스(`app-alb-v1`)가 기준이다.

5. HTTPS는 ALB 레벨에서 종료하고, 내부는 HTTP 전달 구조다.

---

## 9. DB/Redis/S3/CDN 및 주요 프로퍼티 정의 파일

## 9-1. DB 관련 핵심 파일 목록

| 구분 | 파일 | 설명 |
|---|---|---|
| Spring DB 설정 | `backend/src/main/resources/application.yml` | datasource 키 참조 |
| Backend env 템플릿 | `backend/.env.example` | DB URL/USER/PASSWORD 키 정의 |
| Compose 실행값 | `backend/.env` | Docker Compose 변수/DB 접속값 관리 |
| K8s 주입 | `k8s/backend.yaml` + `backend-secrets` | 운영 DB 값 주입 경로 |
| AI 측 DB 설정 | `ai/hint-orchestrator/.env.example` | PG_HOST/PG_PORT/PG_DB/PG_USER/PG_PASSWORD |

## 9-2. Redis 관련 핵심 파일 목록

| 구분 | 파일 | 설명 |
|---|---|---|
| Spring Redis 설정 | `backend/src/main/resources/application.yml` | `REDIS_HOST/PORT/PASSWORD` 참조 |
| Backend env 템플릿 | `backend/.env.example` | Redis 키 정의 |
| Orchestrator 설정 | `ai/hint-orchestrator/app/config.py` | Redis 접속 필드 |
| 로컬 Redis 컨테이너 | `backend/docker-compose.local.yml` | `redis:7-alpine`, AOF 설정 |

## 9-3. S3/CDN 관련 핵심 파일 목록

| 구분 | 파일 | 설명 |
|---|---|---|
| S3 SDK 의존성 | `backend/build.gradle` | `software.amazon.awssdk:s3` |
| S3 설정키 | `backend/src/main/resources/application.yml` | `cloud.aws.*` |
| CDN 설정키 | `backend/src/main/resources/application.yml` / `frontend/src/shared/config/env.ts` | `AWS_CDN_URL`, `VITE_CDN_URL` |

---

## 10. DNS / ALB / Ingress / Service / Pod 최종 흐름

### 10-1. Ingress 설정 요약

| 항목 | 값 |
|---|---|
| Namespace | `prod` |
| Ingress Name | `app-alb-v1` |
| Ingress Class | `alb` |
| Hosts | `find.me.kr`, `api.find.me.kr` |
| ALB DNS | `k8s-prod-appalbv1-c62e9eb803-407929110.ap-northeast-2.elb.amazonaws.com` |
| Listener | 80, 443 |
| TLS/인증서 | ACM ARN annotation 설정 |
| SSL Redirect | `alb.ingress.kubernetes.io/ssl-redirect: "443"` |
| Target Type | `instance` |
| Target Node Labels | `env=prod` |

### 10-2. Ingress 라우팅 규칙

| Host | Path | Backend Service |
|---|---|---|
| `find.me.kr` | `/api` | `backend:8080` |
| `find.me.kr` | `/` | `frontend:80` |
| `api.find.me.kr` | `/` | `backend:8080` |

### 10-3. Service/Endpoint 기준값

| Service | Type | ClusterIP | Endpoint |
|---|---|---|---|
| backend | NodePort | `10.99.229.220` | `192.168.235.139:8080`, `192.168.235.161:8080` |
| frontend | NodePort | `10.100.180.135` | `192.168.235.158:80` |
| hint-orchestrator | ClusterIP | `10.110.122.87` | `192.168.235.147:8201` |

### 10-4. 노드 라벨/역할

| 노드 | 역할 | 라벨 요약 |
|---|---|---|
| master | control-plane | `node-role.kubernetes.io/control-plane` |
| worker-ssafy | worker | `env=dev` |
| worker1 | worker | `env=prod` |

### 10-5. DNS 레코드

| 레코드 | 호스트 | 값/위치 | 의미 |
|---|---|---|---|
| CNAME | `@` | `k8s-prod-appalbv1-...elb.amazonaws.com` | 루트 도메인을 ALB로 연결 |
| CNAME | `api` | `k8s-prod-appalbv1-...elb.amazonaws.com` | API 서브도메인을 ALB로 연결 |
| CNAME | 다수(랜덤 prefix) | `*.acm-validations.aws` | ACM DNS 검증용 |
| A | `dev` | `100.114.155.48` | dev 환경 진입점 |
| A | `dev.api` | `100.114.155.48` | dev API 진입점 |
| TXT | `_acme-challenge.dev*` | 토큰값 | ACME/Certbot 계열 검증 흔적 |
| MX/TXT | `@`, `zmail._domainkey` 등 | Zoho 관련 값 | 메일 송수신/SPF/DKIM |

### 11-6. HTTPS 종단 위치

`find.me.kr` 접속 시 보안(HTTPS)은 ALB까지만 적용된다.

브라우저와 ALB 사이에서는 ACM 인증서로 TLS가 걸리고, ALB에서 암호를 푼 뒤 클러스터 내부로는 HTTP로 전달된다.

즉 “인터넷 구간은 HTTPS, 클러스터 내부 구간은 HTTP”라는 뜻.

---

## 12. 최종 네트워크 플로우

시나리오 A: `https://find.me.kr` 접속

1. DNS 조회 -> ALB DNS 반환`r`n2. ALB 443 수신(ACM 인증서)`r`n3. ALB listener rule 매칭(`find.me.kr` + `/`)`r`n4. frontend target group 선택`r`n5. ALB가 Worker Node(NodePort)로 전달`r`n6. Service를 통해 frontend Pod(`192.168.235.158:80`)로 전달

시나리오 B: `https://find.me.kr/api/...` 호출

1. DNS -> ALB`r`n2. ALB listener rule 매칭(`find.me.kr` + `/api`)`r`n3. backend target group 선택`r`n4. ALB가 Worker Node(NodePort)로 전달`r`n5. Service를 통해 backend Pod 중 1개로 전달

시나리오 C: `https://api.find.me.kr/...` 호출

1. DNS -> ALB`r`n2. ALB listener rule 매칭(`api.find.me.kr` + `/`)`r`n3. backend target group 선택`r`n4. ALB가 Worker Node(NodePort)로 전달`r`n5. Service를 통해 backend Pod로 전달

시나리오 D: backend가 hint-orchestrator 호출

1. backend Pod -> cluster DNS(Service Name) 조회
2. `hint-orchestrator` ClusterIP(`10.110.122.87:8201`) 호출
3. orchestrator Pod(`192.168.235.147:8201`) 처리
4. 외부 ALB 미경유

최종 한 줄 요약:

`DNS -> ALB(HTTPS 종료) -> Ingress(host/path) -> NodeIP:NodePort -> Service -> Pod Endpoint (target-type: instance)`

---

## 13. 배포시에 체크리스트 

## 13-1. 라우팅/인증서

- [ ] `kubectl get ingress -n prod -o wide`에서 ALB ADDRESS 노출 확인
- [ ] `find.me.kr`, `api.find.me.kr` host rule 확인
- [ ] `ssl-redirect: 443` annotation 확인
- [ ] `certificate-arn` annotation 확인

## 13-2. 서비스/엔드포인트

- [ ] Ingress annotation의 `target-type`(`ip` 또는 `instance`) 확인
- [ ] `target-type: instance`일 때: target group이 NodeIP:NodePort를 대상으로 잡히는지 확인
- [ ] backend endpoint 2개 이상 Ready 확인
- [ ] orchestrator endpoint Ready 확인

## 13-3. 노드 라벨/스케줄링

- [ ] `env=prod` 노드 존재 확인
- [ ] 실제 Pod가 의도한 노드에 스케줄링 되었는지 확인
- [ ] HPA min/max 및 current utilization 확인

## 13-4. 앱 헬스

- [ ] backend health
- [ ] orchestrator health
- [ ] frontend 정적 파일 정상 응답

---

## 15. 포팅 절차(체크박스 버전)

## 15-1. 소스/도구 준비

- [ ] Git clone 완료
- [ ] Docker/Node/Java/Python/kubectl 설치
- [ ] 로컬 `.env` 파일 생성

## 15-2. 로컬 기능 검증

- [ ] backend + db + redis 기동
- [ ] frontend 기동
- [ ] orchestrator/embedding 기동
- [ ] 기본 API/health 확인

## 15-3. 운영 배포 준비

- [ ] `backend-secrets`, `orchestrator-secrets` 최신값 준비
- [ ] 이미지 태그/레지스트리 점검
- [ ] node label(`env=prod`) 확인
- [ ] Ingress 룰/도메인 규칙 사전 검토

## 15-4. 운영 배포 실행

- [ ] `kubectl apply` 순차 적용
- [ ] pod/service/ingress/endpoints 점검
- [ ] 외부 도메인 실제 접속 테스트
- [ ] 힌트/인증/OAuth/정적자산 확인

---

## 16. 부록 A: 파일별 “무엇을 바꿔야 하는지”

| 파일 | 변경 목적 | 주의점 |
|---|---|---|
| `backend/.env` | backend 접속/외부연동 값(Compose 기준) | 비밀값, Git 직접 커밋 금지 |
| `frontend/.env`, `frontend/.env.local` | frontend API/CDN/분석값 | API base URL 도메인 일치 필요 |
| `ai/hint-orchestrator/.env` | 오케스트레이터 모델/DB/Redis/GMS | 임베딩 차원/모델 일관성 유지 |
| `ai/embedding-service/.env` | 임베딩 서비스 모델/GMS/배치 설정 | 오케스트레이터와 임베딩 차원 정합성 확인 |
| `k8s/backend.yaml` | backend 리소스/포트/nodeSelector | prod 라벨과 맞는지 확인 |
| `k8s/frontend.yaml` | frontend 리소스/포트/nodeSelector | NodePort 노출 정책 확인 |
| `k8s/orchestrator.yml` | orchestrator 리소스/probe/secret | ClusterIP 유지 권장 |
| `k8s/backend-hpa.yaml` | backend 자동 스케일 | 트래픽 패턴에 맞춰 min/max 조정 |
| Ingress 리소스(`app-alb-v1`) | 도메인/path/TLS 라우팅 | 클러스터 실체 기준 관리 필요 |

---

## 17. 부록 B: 운영 구성 정보

### 17-1. Ingress 요약

- Name: `app-alb-v1` (namespace `prod`)
- Hosts: `find.me.kr`, `api.find.me.kr`
- ALB DNS: `k8s-prod-appalbv1-c62e9eb803-407929110.ap-northeast-2.elb.amazonaws.com`
- Ports: 80/443
- Ingress annotation: `alb.ingress.kubernetes.io/target-type: instance`
- `target-node-labels: env=prod`

### 17-2. Service 요약

- backend: Service port `8080`, `18081` (type: NodePort)
- frontend: Service port `80` (type: NodePort)
- hint-orchestrator: ClusterIP `8201`

### 17-3. Endpoint 요약

- backend pod endpoints:
  - `192.168.235.139:8080`
  - `192.168.235.161:8080`
- frontend pod endpoint:
  - `192.168.235.158:80`
- orchestrator pod endpoint:
  - `192.168.235.147:8201`

### 17-4. Node 요약

- master: control-plane
- worker-ssafy: `env=dev`
- worker1: `env=prod`

---


