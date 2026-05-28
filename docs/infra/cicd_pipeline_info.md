# 🚀 프로젝트 CI/CD 구축 가이드

이 문서는 ***** GitLab, Jenkins, ArgoCD를 연동하여 구현한 프로젝트의 자동 빌드 및 배포 파이프라인 설정을 정리한 문서입니다.

## 1. 파이프라인 아키텍처

본 프로젝트는 **GitOps** 패턴을 따르며, 코드 변경부터 운영 환경 배포까지의 흐름은 다음과 같습니다.

1.  **CI (Jenkins):** 코드 빌드, 도커 이미지 생성 및 Push, K8s 매니페스트 업데이트.
2.  **Versioning:** `semantic-release`를 통한 자동 버전 관리(v1.x.x).
3.  **CD (ArgoCD):** 변경된 매니페스트를 감지하여 K8s 클러스터에 자동 배포.



## 2. 기술 스택 및 환경
- **Source Control:** ***** GitLab (`lab.*****.com`)
- **CI Tool:** Jenkins (NodeJS 플러그인 포함)
- **CD Tool:** ArgoCD (Argo Project)
- **Image Registry:** Docker Hub
- **Infrastructure:** Kubernetes (Master x1, Worker x2)
- **Database/Storage:** 별도 EC2 기반 Redis, RDS, S3

## 3. 상세 설정 내용

### 3.1 Jenkins 설정
- **Global Tool Configuration:** NodeJS(이름: `node`) 설치. `semantic-release` 구동에 필수.
- **Credentials:**
  - `gitlab-auth`: GitLab Push/Pull용 Access Token.
  - `docker-hub-auth`: 도커 허브 이미지 푸시용 계정 정보.
  - `frontend-env-dev/prod`: 프론트엔드 빌드용 `.env` 시크릿 파일.
  - `backend-env-dev/prod`: 백엔드 실행용 `.env` 시크릿 파일.

### 3.2 Semantic Release (자동 버전 관리)
`main` 브랜치에 머지될 때만 실행되며, **Angular Commit Convention**(`feat:`, `fix:`)에 따라 버전을 자동 생성합니다.
- **설정 파일:** `.releaserc` (프로젝트 루트 위치)
- **역할:** 정식 버전 Git Tag 생성 및 릴리즈 노트 자동 작성.

### 3.3 ArgoCD 설정 (GitOps)
브랜치와 환경(Namespace)을 분리하여 두 개의 Application으로 운영합니다.
- **`find-me-dev` 앱:** `develop` 브랜치 감시 -> `dev` 네임스페이스 배포.
- **`find-me-prod` 앱:** `main` 브랜치 감시 -> `prod` 네임스페이스 배포.



## 4. 브랜치 전략 및 배포 정책

| 구분 | develop (개발 브랜치) | main (운영 브랜치) |
| :--- | :--- | :--- |
| **빌드 트리거** | Merge Request / Push | develop -> main 머지 |
| **이미지 태그** | `{Build_Number}-dev` | `vX.Y.Z` (정식 버전) |
| **Secret 동기화** | `backend-secrets` (dev용) | `backend-secrets` (prod용) |
| **배포 타겟** | 개발용 서버 (Worker Node 1) | 운영용 서버 (Worker Node 2) |

## 5. 외부 서비스 연동: Redis
- **구성:** 별도 독립 EC2 인스턴스 사용.
- **설정 방식:** 젠킨스 `.env` 파일에 Redis 호스트(Private IP) 정보를 저장하고, 젠킨스 빌드 시 `kubectl create secret` 명령을 통해 K8s 내부로 주입.
- **주의 사항:** Redis EC2의 보안 그룹에서 K8s 노드 IP들에 대해 **6379 포트** 허용 필요.

## 6. 주요 명령어 및 조치 사항
- **젠킨스 빌드 실패 시:** `Console Output`에서 `Invalid refspec` 발생 시 Branch Specifier 확인.
- **도구 에러 발생 시:** Jenkins 관리 -> Tools에서 NodeJS 이름이 `node`로 되어있는지 확인.
- **수동 배포 필요 시:** ArgoCD UI에서 `SYNC` 버튼 클릭.

---
