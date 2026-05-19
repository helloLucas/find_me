# 프로젝트에서 사용하는 외부 서비스 정보를 정리한 문서

---

## 1. 한눈에 보는 외부 서비스 목록

| 서비스 | 분류 | 가입 필요 | 프로젝트 내 용도 | 핵심 설정 키/값 |
|---|---|---|---|---|
| Google OAuth | 소셜 인증 | 필요 | 사용자 로그인 | `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET` |
| SSAFY OAuth | 소셜 인증 | 필요 | 사용자 로그인 | `SSAFY_CLIENT_ID`, `SSAFY_CLIENT_SECRET` |
| GMS Gateway | AI 게이트웨이 | 필요 | 힌트 LLM/라우터/임베딩 호출 | `GMS_BASE_URL`, `GMS_KEY`, `GMS_*_MODEL` |
| OpenAI/Gemini (GMS 경유) | AI 모델 공급자 | 필요(운영 정책에 따름) | GMS 업스트림 모델 실행 | GMS 내부 라우팅 경로/키 정책 |
| AWS S3 | 객체 스토리지 | 필요 | 파일 업로드/저장 | `AWS_ACCESS_KEY`, `AWS_SECRET_KEY`, `AWS_REGION`, `AWS_S3_BUCKET` |
| AWS CloudFront | CDN | 필요 | 정적 자산 배포 | `AWS_CDN_URL`, `VITE_CDN_URL` |
| AWS ACM + ALB | HTTPS/Ingress | 필요 | 도메인 TLS 종단, 외부 진입 | Ingress annotation(`certificate-arn`, `ssl-redirect`) |
| Calico | Kubernetes CNI | 필요 | Pod 네트워크/네트워크 정책 | `calico-system` 네임스페이스 리소스, CNI 설정 |
| Tailscale | 관리용 사설 네트워크(VPN) | 운영 정책에 따름 | 운영자 접속(SSH/관리 트래픽) | Tailscale 노드/키/ACL 정책 |
| Zoho SMTP | 메일 | 필요 | 메일 발송 | `MAIL_USERNAME`, `MAIL_PASSWORD`, `smtp.zoho.com:587` |
| Elasticsearch | 로그/분석 | 필요 | Hint Worker 분석/집계 | `ELASTICSEARCH_URL` |
| Mattermost Webhook | 알림 | 필요 | 일일 힌트/리포트 발송 | `MATTERMOST_WEBHOOK_URL`, `MATTERMOST_REPORT_WEBHOOK_URL` |
| GA4 | 웹 분석 | 선택 | 프론트 사용량 분석 | `VITE_GA4_MEASUREMENT_ID` |
| Microsoft Clarity | 웹 분석 | 선택 | 사용자 행동 분석 | `VITE_CLARITY_PROJECT_ID` |
| PostgreSQL(외부) | 데이터 저장소 | 필요 | 백엔드/오케스트레이터 메인 DB | `SPRING_DATASOURCE_*`, `PG_*` |
| Redis(외부) | 캐시/세션 | 필요 | 세션/상태/카운터 저장 | `REDIS_HOST`, `REDIS_PORT`, `REDIS_PASSWORD` |

---

## 2. 서비스별 가입 및 준비 항목

## 2-1. Google OAuth

- 준비
  - Google Cloud 프로젝트 생성
  - OAuth 동의화면 설정
  - Web Client 발급
- 필수 입력값
  - `GOOGLE_CLIENT_ID`
  - `GOOGLE_CLIENT_SECRET`

## 2-2. SSAFY OAuth

- 준비
  - SSAFY OAuth 애플리케이션 등록
  - Redirect URI 등록
- 필수 입력값
  - `SSAFY_CLIENT_ID`
  - `SSAFY_CLIENT_SECRET`
- 관련 설정
  - `backend/src/main/resources/application.yml` 내 provider URI

## 2-3. GMS Gateway (LLM/임베딩)

- 준비
  - GMS 접근 권한/키 발급
  - 사용 모델 정책 확정(`gpt-5-mini`, `gemini-embedding-001` 등)
- 필수 입력값
  - `GMS_BASE_URL` (기본: `https://gms.ssafy.io/gmsapi`)
  - `GMS_KEY`
  - `GMS_LLM_MODEL`, `GMS_ROUTER_MODEL`, `GMS_EMBEDDING_MODEL`

## 2-4. AWS (S3 / CloudFront / ACM-ALB)

- 준비
  - IAM 사용자/권한(S3 접근)
  - S3 버킷 생성
  - CloudFront 배포
  - ACM 인증서 발급 및 도메인 검증(CNAME)
  - ALB Ingress annotation 연결
- 필수 입력값
  - `AWS_ACCESS_KEY`, `AWS_SECRET_KEY`, `AWS_REGION`, `AWS_S3_BUCKET`
  - `AWS_CDN_URL`, `VITE_CDN_URL`
- 운영 참고
  - TLS 종단은 ALB(ACM)에서 수행
  - DNS의 `@`, `api` CNAME은 ALB DNS를 가리켜야 함
  - ALB Ingress의 `target-type`에 따라 내부 라우팅 방식이 달라짐
    - `instance`: `ALB -> NodeIP:NodePort -> Service/kube-proxy -> Pod`
    - `ip`: `ALB -> PodIP:Port` (NodePort 비경유)
  - 참고: ALB는 ClusterIP Service로 직접 붙지 않고, target group 대상(NodeIP:NodePort 또는 PodIP:Port)으로 전달

### 2-4-1. target-type별 NodePort 경유 여부 정리

| target-type | ALB 타깃 | NodePort 경유 | 설명 |
|---|---|---|---|
| `instance` | Worker Node IP + NodePort | 예 | ALB가 노드 포트로 들어와 Service를 거쳐 Pod로 전달 |
| `ip` | Pod IP + Container Port | 아니오 | ALB가 Pod로 직접 전달, NodePort는 트래픽 경로에서 제외 |

- `target type=instance`이면 NodePort를 경유한다
- `target type=ip`이면 NodePort를 경유하지 않는다

## 2-5. Zoho SMTP

- 준비
  - Zoho 메일 계정/앱 비밀번호
  - 도메인 SPF/DKIM/MX 검증
- 필수 입력값
  - `MAIL_USERNAME`
  - `MAIL_PASSWORD`
- 서버 설정
  - `smtp.zoho.com:587`, STARTTLS

## 2-6. Calico (Kubernetes CNI)

- 준비
  - Kubernetes 클러스터 CNI로 Calico 설치
  - 노드 간 Pod 네트워크 라우팅 확인
  - 필요 시 NetworkPolicy 정책 설계/적용
- 확인 항목
  - `kubectl get ns calico-system`
  - `kubectl get pods -n calico-system`
  - 클러스터 노드 간 Pod 통신 정상 여부

## 2-7. Tailscale (운영자 접근 네트워크)

- 준비
  - 운영자 장비/노드 Tailscale 등록
  - Tailnet ACL 정책 구성(접근 제어)
  - 필요 시 서브넷 라우터/Exit Node 정책 설정
- 용도 범위
  - 운영자 SSH/관리 접속 경로
  - 사용자 서비스 트래픽의 기본 경로로 사용하지 않음

## 2-8. Elasticsearch / Mattermost

- 준비
  - Elasticsearch 인덱스 접근 계정/URL
  - Mattermost Incoming Webhook 생성
- 필수 입력값
  - `ELASTICSEARCH_URL`
  - `MATTERMOST_WEBHOOK_URL`
  - `MATTERMOST_REPORT_WEBHOOK_URL`

## 2-9. 분석 도구(GA4/Clarity)

- 준비
  - GA4 측정 ID 발급
  - Clarity Project ID 발급
- 필수 입력값
  - `VITE_GA4_MEASUREMENT_ID`
  - `VITE_CLARITY_PROJECT_ID`
  - 필요 시 `VITE_ANALYTICS_ENABLED`

---

## 3. 관련 파일 빠른 참조

- 백엔드 설정: `backend/src/main/resources/application.yml`
- 백엔드 env 템플릿: `backend/.env.example`
- 오케스트레이터 env 템플릿: `ai/hint-orchestrator/.env.example`
- 임베딩 env 템플릿: `ai/embedding-service/.env.example`
- 프론트 env 사용 코드: `frontend/src/shared/config/env.ts`
- 힌트 워커 env 사용 코드: `hint-worker/main.py`
- K8s Secret 주입 지점:
  - `k8s/backend.yaml`
  - `k8s/orchestrator.yml`
