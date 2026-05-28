# Kubernetes 설정 공유 문서

이 문서는 현재 디렉토리에 있는 Kubernetes 설정 파일을 팀원들이 함께 이해하고 운영할 수 있도록 정리한 문서입니다. Kubernetes를 처음 접하는 팀원도 흐름을 따라갈 수 있도록, 먼저 전체 구조를 보고 그 다음 각 YAML 파일의 역할과 배포 순서를 설명합니다.

## 1. 전체 구조

현재 구성은 크게 `frontend`, `backend`, `Service`, `Ingress`, `Secret`, `HPA`, `PDB`로 나뉩니다.

```text
사용자 브라우저
  |
  | https://find.find.me.kr
  | https://api.find.me.kr
  v
AWS ALB
  |
  | Ingress가 host/path 규칙으로 라우팅
  v
Kubernetes Service
  |
  | label selector로 알맞은 Pod 선택
  v
Deployment가 관리하는 Pod들
  |
  | backend Pod는 DB, Redis, S3 등 외부 자원 사용
  v
외부 인프라
```

핵심 흐름은 다음과 같습니다.

1. 사용자가 도메인으로 요청합니다.
2. DNS가 AWS ALB로 요청을 보냅니다.
3. ALB는 Kubernetes `Ingress` 규칙을 보고 요청을 `frontend` 또는 `backend` Service로 보냅니다.
4. Service는 `app: frontend` 또는 `app: backend` 라벨을 가진 Pod로 요청을 전달합니다.
5. Pod는 실제 컨테이너를 실행합니다.

## 2. 현재 디렉토리의 주요 파일

| 파일 | Kubernetes 리소스 | 역할 |
| --- | --- | --- |
| `backend-deployment.yaml` | Deployment | 백엔드 애플리케이션 Pod를 실행하고 복제본 수, 배포 전략, 헬스체크, 리소스 제한을 관리합니다. |
| `frontend-deployment.yaml` | Deployment | 프론트엔드 애플리케이션 Pod를 실행하고 복제본 수, 배포 전략, 헬스체크, 리소스 제한을 관리합니다. |
| `backend-service.yaml` | Service | 백엔드 Pod들을 하나의 고정된 네트워크 이름과 포트로 묶습니다. |
| `frontend-service.yaml` | Service | 프론트엔드 Pod들을 하나의 고정된 네트워크 이름과 포트로 묶습니다. |
| `app-ingress.yaml` | Ingress | `find.find.me.kr`, `api.find.me.kr` 도메인을 ALB로 받아 Service에 연결합니다. |
| `ingress-https.yaml` | Ingress | `find.me.kr`, `api.find.me.kr` 도메인을 ALB로 받아 Service에 연결하는 다른 버전의 Ingress입니다. |
| `backend-hpa.yaml` | HorizontalPodAutoscaler | 백엔드 CPU 사용률에 따라 Pod 수를 자동 조절합니다. |
| `frontend-hpa.yaml` | HorizontalPodAutoscaler | 프론트엔드 CPU 사용률에 따라 Pod 수를 자동 조절합니다. |
| `app-pdb.yaml` | PodDisruptionBudget | 노드 점검 등으로 Pod가 중단될 때 최소 가용 Pod 수를 보장합니다. |
| `backend-secret.env` | Secret 생성용 env 파일 | 백엔드에 필요한 민감 설정값을 Secret으로 만들 때 사용합니다. |
| `frontend-secret.env` | Secret 생성용 env 파일 | 프론트엔드에 필요한 환경변수를 Secret으로 만들 때 사용합니다. |

주의할 점은 `backend-secret.env`, `frontend-secret.env`는 Kubernetes YAML이 아닙니다. `kubectl apply -f backend-secret.env`처럼 적용하는 파일이 아니라, `kubectl create secret ... --from-env-file=...` 명령으로 Secret을 만들 때 쓰는 입력 파일입니다.

## 3. Kubernetes 기본 개념

### Cluster

Kubernetes가 동작하는 전체 환경입니다. 여러 대의 서버 또는 VM이 하나의 Cluster를 구성합니다.

### Node

Cluster 안에서 실제 컨테이너가 실행되는 서버입니다. AWS EKS를 사용한다면 EC2 인스턴스가 Node 역할을 하는 경우가 많습니다.

### Pod

Kubernetes에서 배포되는 가장 작은 실행 단위입니다. 보통 하나의 애플리케이션 컨테이너 하나가 하나의 Pod 안에서 실행됩니다.

현재 구성에서는 예를 들어 백엔드 Pod 하나 안에 `wcharibo/find-me-backend:2-dev` 이미지로 만든 컨테이너가 실행됩니다.

### Deployment

Pod를 직접 만들고 관리하는 대신, 운영자가 원하는 상태를 선언하는 리소스입니다.

예를 들어 `replicas: 2`라고 선언하면 Kubernetes는 백엔드 Pod가 항상 2개 떠 있도록 유지하려고 합니다. Pod 하나가 죽으면 새 Pod를 다시 만듭니다.

### ReplicaSet

Deployment가 내부적으로 사용하는 리소스입니다. 특정 버전의 Pod 복제본 수를 맞추는 역할을 합니다. 보통 직접 수정하지 않고 Deployment를 통해 관리합니다.

### Service

Pod는 재시작되면 IP가 바뀔 수 있습니다. 그래서 다른 리소스가 Pod IP를 직접 바라보면 운영이 불안정해집니다.

Service는 여러 Pod 앞에 붙는 고정된 네트워크 진입점입니다. Service는 라벨 셀렉터를 통해 어떤 Pod에 트래픽을 보낼지 결정합니다.

예를 들어 `backend-service.yaml`은 `app: backend` 라벨이 붙은 Pod로 요청을 보냅니다.

### Ingress

외부 HTTP/HTTPS 요청을 Kubernetes 내부 Service로 연결하는 라우팅 규칙입니다.

현재 프로젝트에서는 AWS Load Balancer Controller가 Ingress를 보고 AWS ALB를 생성하거나 설정합니다.

### Secret

DB 비밀번호, OAuth secret, JWT secret, AWS key처럼 코드나 YAML에 직접 넣기 어려운 민감 정보를 저장하는 리소스입니다.

현재 Deployment는 `envFrom.secretRef`로 `backend-secret`, `frontend-secret`을 컨테이너 환경변수로 주입합니다.

### Probe

Kubernetes가 애플리케이션 상태를 확인하기 위해 사용하는 헬스체크입니다.

| Probe | 의미 |
| --- | --- |
| `startupProbe` | 애플리케이션이 처음 뜨는 중인지 확인합니다. 기동이 오래 걸리는 앱에서 유용합니다. |
| `readinessProbe` | 이 Pod가 지금 트래픽을 받아도 되는지 확인합니다. 실패하면 Service 트래픽 대상에서 제외됩니다. |
| `livenessProbe` | 애플리케이션이 살아있는지 확인합니다. 실패하면 컨테이너를 재시작합니다. |

### Resource requests/limits

컨테이너가 사용할 CPU와 메모리 기준을 정합니다.

| 항목 | 의미 |
| --- | --- |
| `requests` | 이 정도 리소스는 필요하다고 Kubernetes 스케줄러에게 알려주는 값입니다. |
| `limits` | 컨테이너가 사용할 수 있는 최대 리소스입니다. |

### HPA

HorizontalPodAutoscaler의 약자입니다. CPU 사용률 같은 지표를 보고 Pod 개수를 자동으로 늘리거나 줄입니다.

### PDB

PodDisruptionBudget의 약자입니다. 노드 교체, 드레인, 점검처럼 계획된 중단 상황에서 최소 몇 개의 Pod는 살아있어야 하는지 보장합니다.

## 4. Namespace

현재 주요 리소스는 모두 `default` namespace에 배포되도록 설정되어 있습니다.

```yaml
metadata:
  namespace: default
```

Kubernetes 명령어를 실행할 때는 namespace를 명확히 지정하는 습관이 좋습니다.

```bash
kubectl get pods -n default
kubectl get svc -n default
kubectl get ingress -n default
```

## 5. Backend Deployment

파일: `backend-deployment.yaml`

### 현재 설정 요약

| 항목 | 값 |
| --- | --- |
| 리소스 이름 | `backend` |
| Namespace | `default` |
| 복제본 수 | `2` |
| 컨테이너 이미지 | `wcharibo/find-me-backend:2-dev` |
| 컨테이너 포트 | `8080` |
| Secret | `backend-secret` |
| 배포 전략 | RollingUpdate |
| CPU request | `250m` |
| CPU limit | `1` |
| Memory request | `512Mi` |
| Memory limit | `1Gi` |

### replicas

```yaml
replicas: 2
```

백엔드 Pod를 기본적으로 2개 실행합니다. 하나가 죽어도 나머지 하나가 요청을 받을 수 있고, Kubernetes가 죽은 Pod를 새로 만들어 다시 2개로 맞춥니다.

### RollingUpdate

```yaml
strategy:
  type: RollingUpdate
  rollingUpdate:
    maxUnavailable: 0
    maxSurge: 1
```

새 버전을 배포할 때 기존 Pod를 한꺼번에 내리지 않고 순차적으로 교체합니다.

| 설정 | 의미 |
| --- | --- |
| `maxUnavailable: 0` | 배포 중에도 사용 가능한 기존 Pod 수를 줄이지 않습니다. |
| `maxSurge: 1` | 배포 중 임시로 Pod를 1개 더 만들 수 있습니다. |

즉, 백엔드가 2개 떠 있다면 새 버전 배포 중 잠깐 3개까지 늘었다가, 새 Pod가 준비되면 기존 Pod를 하나씩 줄이는 방식입니다.

### minReadySeconds

```yaml
minReadySeconds: 10
```

Pod가 Ready 상태가 된 뒤 최소 10초 동안 안정적으로 유지되어야 배포가 성공적으로 진행됩니다.

### envFrom.secretRef

```yaml
envFrom:
  - secretRef:
      name: backend-secret
```

`backend-secret`에 들어있는 값들이 컨테이너 환경변수로 들어갑니다. 예를 들어 DB URL, DB 계정, Redis 정보, JWT secret 등이 여기에 들어갑니다.

### 직접 지정된 env

```yaml
env:
  - name: SERVER_PORT
    value: "8080"
  - name: MANAGEMENT_SERVER_PORT
    value: "8081"
  - name: SPRING_DATASOURCE_DRIVER_CLASS_NAME
    value: org.postgresql.Driver
  - name: SPRING_JPA_PROPERTIES_HIBERNATE_DIALECT
    value: org.hibernate.dialect.PostgreSQLDialect
```

Secret이 아니라 Deployment 안에 직접 들어가도 되는 일반 설정값입니다.

### Probe

백엔드는 TCP 방식으로 `8080` 포트가 열려 있는지 확인합니다.

```yaml
startupProbe:
  tcpSocket:
    port: http
  failureThreshold: 30
  periodSeconds: 10
```

`startupProbe`는 최대 약 300초 동안 기동을 기다릴 수 있습니다. `failureThreshold: 30`, `periodSeconds: 10`이므로 10초마다 확인하고 30번 실패하면 기동 실패로 판단합니다.

```yaml
readinessProbe:
  tcpSocket:
    port: http
```

`readinessProbe`가 실패하면 해당 Pod는 Service의 트래픽 대상에서 빠집니다. 애플리케이션은 살아있지만 아직 요청을 받을 준비가 안 된 상태를 표현할 때 중요합니다.

```yaml
livenessProbe:
  tcpSocket:
    port: http
```

`livenessProbe`가 계속 실패하면 Kubernetes가 컨테이너를 재시작합니다.

### Pod Anti-Affinity

```yaml
affinity:
  podAntiAffinity:
    preferredDuringSchedulingIgnoredDuringExecution:
      - weight: 100
        podAffinityTerm:
          labelSelector:
            matchLabels:
              app: backend
          topologyKey: kubernetes.io/hostname
```

가능하면 백엔드 Pod들이 서로 다른 Node에 배치되도록 유도합니다. Node 하나에 장애가 나도 모든 백엔드 Pod가 동시에 죽는 상황을 줄이기 위한 설정입니다.

`preferredDuringSchedulingIgnoredDuringExecution`이므로 강제는 아닙니다. Node 수나 리소스가 부족하면 같은 Node에 배치될 수도 있습니다.

## 6. Frontend Deployment

파일: `frontend-deployment.yaml`

### 현재 설정 요약

| 항목 | 값 |
| --- | --- |
| 리소스 이름 | `frontend` |
| Namespace | `default` |
| 복제본 수 | `2` |
| 컨테이너 이미지 | `shyunnnn/find-me-frontend:29-dev` |
| 컨테이너 포트 | `80` |
| Secret | `frontend-secret` |
| 배포 전략 | RollingUpdate |
| CPU request | `100m` |
| CPU limit | `500m` |
| Memory request | `128Mi` |
| Memory limit | `256Mi` |

프론트엔드도 백엔드와 마찬가지로 Pod 2개를 유지하고 RollingUpdate 방식으로 배포됩니다.

### imagePullPolicy

```yaml
imagePullPolicy: Always
```

프론트엔드는 Pod가 시작될 때마다 이미지를 다시 확인합니다. 같은 태그라도 레지스트리에 새 이미지가 있으면 가져오려고 합니다.

백엔드는 `IfNotPresent`입니다. 같은 태그를 계속 재사용하면 Node에 이미 있는 오래된 이미지가 사용될 수 있습니다. 운영에서는 가능하면 `2-dev`, `29-dev`처럼 바뀌는 태그보다 커밋 SHA나 빌드 번호가 들어간 고유 태그를 사용하는 편이 안전합니다.

### Probe

프론트엔드는 HTTP GET `/` 요청으로 상태를 확인합니다.

```yaml
readinessProbe:
  httpGet:
    path: /
    port: http
```

프론트엔드 서버가 `/` 경로에 응답하면 준비된 것으로 봅니다.

## 7. Service

파일:

- `backend-service.yaml`
- `frontend-service.yaml`

Service는 Pod 앞에 붙는 고정 주소 역할을 합니다.

### Backend Service

```yaml
metadata:
  name: backend
spec:
  type: NodePort
  selector:
    app: backend
  ports:
    - name: http
      port: 8080
      targetPort: http
```

의미는 다음과 같습니다.

| 항목 | 의미 |
| --- | --- |
| `name: backend` | 클러스터 내부에서 `backend`라는 Service 이름으로 접근할 수 있습니다. |
| `type: NodePort` | 각 Node에 외부 접근용 포트를 열 수 있는 Service 타입입니다. |
| `selector: app: backend` | `app=backend` 라벨이 붙은 Pod로 트래픽을 보냅니다. |
| `port: 8080` | Service가 노출하는 포트입니다. |
| `targetPort: http` | Pod의 `ports.name: http`에 해당하는 포트로 보냅니다. 현재 backend Pod의 `http`는 8080입니다. |

### Frontend Service

```yaml
metadata:
  name: frontend
spec:
  type: NodePort
  selector:
    app: frontend
  ports:
    - name: http
      port: 80
      targetPort: http
```

`app=frontend` 라벨이 붙은 Pod의 80번 포트로 요청을 보냅니다.

### Service와 Deployment의 연결 방식

Service는 Pod 이름을 보고 연결하지 않습니다. 라벨을 보고 연결합니다.

Deployment의 Pod 템플릿에 다음 라벨이 있습니다.

```yaml
labels:
  app: backend
```

Service에는 다음 selector가 있습니다.

```yaml
selector:
  app: backend
```

이 둘이 맞아야 Service가 Pod를 찾을 수 있습니다. 라벨이 어긋나면 Service는 존재하지만 실제로 요청을 보낼 Pod가 없는 상태가 됩니다.

## 8. Ingress와 ALB

파일:

- `app-ingress.yaml`
- `ingress-https.yaml`

둘 다 AWS ALB를 사용하는 Ingress 설정입니다. 다만 도메인과 ALB target 방식이 다릅니다.

### app-ingress.yaml

| 항목 | 값 |
| --- | --- |
| Ingress 이름 | `app-alb-v2` |
| Namespace | `default` |
| Ingress class | `alb` |
| ALB scheme | `internet-facing` |
| Target type | `instance` |
| HTTP | 80 |
| HTTPS | 443 |
| Frontend host | `find.find.me.kr` |
| Backend host | `api.find.me.kr` |

라우팅 규칙은 다음과 같습니다.

| Host | Path | 연결되는 Service |
| --- | --- | --- |
| `find.find.me.kr` | `/` | `frontend:80` |
| `api.find.me.kr` | `/` | `backend:8080` |

### ingress-https.yaml

| 항목 | 값 |
| --- | --- |
| Ingress 이름 | `app-alb` |
| Namespace | `default` |
| Ingress class | `alb` |
| ALB scheme | `internet-facing` |
| Target type | `ip` |
| HTTP | 80 |
| HTTPS | 443 |
| Frontend host | `find.me.kr` |
| Backend host | `api.find.me.kr` |

라우팅 규칙은 다음과 같습니다.

| Host | Path | 연결되는 Service |
| --- | --- | --- |
| `find.me.kr` | `/` | `frontend:80` |
| `api.find.me.kr` | `/` | `backend:8080` |

### 두 Ingress 파일을 동시에 적용할 때 주의할 점

두 파일 모두 `api.find.me.kr`을 backend로 라우팅합니다. 둘을 동시에 적용하면 ALB가 2개 생기거나 같은 도메인을 여러 Ingress가 처리하는 구조가 될 수 있습니다.

운영에서는 보통 하나를 선택해서 적용하는 편이 좋습니다.

- `find.find.me.kr`을 프론트 도메인으로 쓸 경우: `app-ingress.yaml`
- `find.me.kr`을 프론트 도메인으로 쓸 경우: `ingress-https.yaml`

둘 중 무엇이 실제 운영용인지 팀에서 정하고, DNS가 해당 ALB를 바라보도록 맞춰야 합니다.

### 주요 annotation 설명

```yaml
alb.ingress.kubernetes.io/scheme: internet-facing
```

인터넷에서 접근 가능한 ALB를 생성합니다.

```yaml
alb.ingress.kubernetes.io/target-type: instance
```

ALB가 Node를 대상으로 트래픽을 보내는 방식입니다. 이 경우 Service 타입이 `NodePort`인 구성이 자연스럽습니다.

```yaml
alb.ingress.kubernetes.io/target-type: ip
```

ALB가 Pod IP를 대상으로 트래픽을 보내는 방식입니다. 이 방식에서는 보통 Service를 `ClusterIP`로 두는 구성도 많이 사용합니다. 현재 `ingress-https.yaml`은 target type이 `ip`이고 Service는 `NodePort`입니다. 동작 여부는 AWS Load Balancer Controller 설정과 CNI 환경에 따라 확인이 필요합니다.

```yaml
alb.ingress.kubernetes.io/listen-ports: '[{"HTTP":80},{"HTTPS":443}]'
```

ALB가 HTTP 80, HTTPS 443 포트를 받도록 설정합니다.

```yaml
alb.ingress.kubernetes.io/ssl-redirect: '443'
```

HTTP로 들어온 요청을 HTTPS로 리다이렉트합니다.

```yaml
alb.ingress.kubernetes.io/certificate-arn: ...
```

HTTPS에 사용할 ACM 인증서 ARN입니다. 도메인과 인증서가 맞지 않으면 브라우저에서 인증서 오류가 납니다.

```yaml
alb.ingress.kubernetes.io/subnets: subnet-...,subnet-...
```

ALB가 생성될 subnet 목록입니다. public ALB라면 보통 public subnet이어야 합니다.

```yaml
alb.ingress.kubernetes.io/healthcheck-path: /
alb.ingress.kubernetes.io/success-codes: "200-404"
```

ALB가 target 상태를 확인할 때 `/` 경로로 health check를 보냅니다. 응답 코드가 200부터 404 사이면 성공으로 봅니다.

## 9. Secret 생성

Deployment는 다음 Secret이 이미 존재한다고 가정합니다.

- `backend-secret`
- `frontend-secret`

Secret이 없으면 Pod가 뜨지 못하고 `CreateContainerConfigError` 상태가 될 수 있습니다.

### Backend Secret

`backend-secret.env` 파일을 기준으로 생성합니다.

```bash
kubectl create secret generic backend-secret \
  --from-env-file=backend-secret.env \
  -n default \
  --dry-run=client \
  -o yaml | kubectl apply -f -
```

현재 백엔드 Secret에 필요한 주요 값은 다음과 같습니다.

| 변수 | 용도 |
| --- | --- |
| `GOOGLE_CLIENT_ID` | Google OAuth client id |
| `GOOGLE_CLIENT_SECRET` | Google OAuth client secret |
| `*****_CLIENT_ID` | ***** OAuth client id |
| `*****_CLIENT_SECRET` | ***** OAuth client secret |
| `JWT_SECRET` | JWT 서명에 사용할 secret |
| `SPRING_DATASOURCE_URL` | DB 접속 URL |
| `SPRING_DATASOURCE_USERNAME` | DB 사용자명 |
| `SPRING_DATASOURCE_PASSWORD` | DB 비밀번호 |
| `REDIS_HOST` | Redis host |
| `REDIS_PORT` | Redis port |
| `REDIS_PASSWORD` | Redis 비밀번호 |
| `REDIS_TIMEOUT` | Redis timeout |
| `AWS_ACCESS_KEY` | AWS access key |
| `AWS_SECRET_KEY` | AWS secret key |
| `AWS_REGION` | AWS region |
| `AWS_S3_BUCKET` | S3 bucket |
| `CORS_ALLOWED_ORIGINS` | 허용할 CORS origin |
| `SERVER_PORT` | 서버 포트 |
| `FRONTEND_URL` | 프론트엔드 URL |

실제 값은 이 문서에 적지 않습니다. 팀 내 보안 채널이나 secret manager를 통해 공유해야 합니다.

### Frontend Secret

`frontend-secret.env` 파일을 기준으로 생성합니다.

```bash
kubectl create secret generic frontend-secret \
  --from-env-file=frontend-secret.env \
  -n default \
  --dry-run=client \
  -o yaml | kubectl apply -f -
```

현재 프론트엔드 Secret에 필요한 값은 다음과 같습니다.

| 변수 | 용도 |
| --- | --- |
| `VITE_API_BASE_URL` | 브라우저에서 호출할 백엔드 API base URL |
| `VITE_CDN_URL` | CDN URL |

Vite 기반 정적 프론트엔드는 보통 빌드 시점에 `VITE_*` 값이 번들에 들어갑니다. 컨테이너 실행 시점에 Secret을 주입해도 자동으로 브라우저 JS에 반영되지 않을 수 있습니다. 현재 프론트엔드 이미지가 런타임 환경변수 주입을 지원하는 구조인지 확인이 필요합니다.

## 10. 배포 순서

현재 디렉토리에는 백업 YAML과 여러 Ingress 버전이 함께 있으므로 `kubectl apply -f .`는 권장하지 않습니다. 원하지 않는 파일까지 같이 적용될 수 있습니다.

아래처럼 순서를 명확히 나눠서 적용하는 것이 안전합니다.

### 1단계: 현재 cluster 확인

```bash
kubectl config current-context
kubectl get nodes
```

실수로 다른 cluster에 배포하지 않기 위한 확인 단계입니다.

### 2단계: Secret 생성 또는 갱신

```bash
kubectl create secret generic backend-secret \
  --from-env-file=backend-secret.env \
  -n default \
  --dry-run=client \
  -o yaml | kubectl apply -f -

kubectl create secret generic frontend-secret \
  --from-env-file=frontend-secret.env \
  -n default \
  --dry-run=client \
  -o yaml | kubectl apply -f -
```

### 3단계: Deployment 적용

```bash
kubectl apply -f backend-deployment.yaml
kubectl apply -f frontend-deployment.yaml
```

### 4단계: Service 적용

```bash
kubectl apply -f backend-service.yaml
kubectl apply -f frontend-service.yaml
```

### 5단계: PDB 적용

```bash
kubectl apply -f app-pdb.yaml
```

### 6단계: HPA 적용

```bash
kubectl apply -f backend-hpa.yaml
kubectl apply -f frontend-hpa.yaml
```

HPA가 정상 동작하려면 metrics-server가 필요합니다. 다음 명령이 동작해야 합니다.

```bash
kubectl top pods -n default
kubectl top nodes
```

### 7단계: Ingress 적용

둘 중 운영에 사용할 Ingress 하나를 선택합니다.

```bash
kubectl apply -f app-ingress.yaml
```

또는:

```bash
kubectl apply -f ingress-https.yaml
```

Ingress 적용 후 ALB가 생성되기까지 시간이 걸릴 수 있습니다.

```bash
kubectl get ingress -n default
kubectl describe ingress app-alb-v2 -n default
```

## 11. 배포 후 확인 명령어

### 전체 리소스 확인

```bash
kubectl get pods,svc,ingress,hpa,pdb -n default
```

### Pod 상태 확인

```bash
kubectl get pods -n default -o wide
```

확인할 점:

- `STATUS`가 `Running`인지
- `READY`가 `1/1`인지
- Pod가 여러 Node에 나뉘어 떠 있는지
- 재시작 횟수인 `RESTARTS`가 계속 증가하지 않는지

### 배포 상태 확인

```bash
kubectl rollout status deployment/backend -n default
kubectl rollout status deployment/frontend -n default
```

### 로그 확인

```bash
kubectl logs deployment/backend -n default
kubectl logs deployment/frontend -n default
```

최근 로그만 보고 싶으면:

```bash
kubectl logs deployment/backend -n default --tail=100
```

실시간 로그를 보고 싶으면:

```bash
kubectl logs deployment/backend -n default -f
```

### Service endpoint 확인

```bash
kubectl get endpoints backend -n default
kubectl get endpoints frontend -n default
```

Endpoint가 비어 있으면 Service가 연결할 Pod를 찾지 못하고 있다는 뜻입니다. 이 경우 Deployment의 Pod 라벨과 Service selector가 일치하는지 확인합니다.

### Ingress 확인

```bash
kubectl get ingress -n default
kubectl describe ingress app-alb-v2 -n default
```

`ADDRESS`에 ALB 주소가 표시되어야 외부 접근 준비가 된 상태입니다.

### 도메인 접근 확인

`app-ingress.yaml`을 사용한다면:

```bash
curl -I https://find.find.me.kr
curl -I https://api.find.me.kr
```

`ingress-https.yaml`을 사용한다면:

```bash
curl -I https://find.me.kr
curl -I https://api.find.me.kr
```

백엔드 루트 경로가 404를 반환할 수 있어도 ALB health check는 현재 `200-404`를 성공으로 봅니다. 실제 API health endpoint가 있다면 그 경로로 확인하는 편이 더 명확합니다.

## 12. 자주 하는 운영 작업

### 이미지 태그 변경 배포

YAML의 `image` 값을 수정한 뒤 적용합니다.

```bash
kubectl apply -f backend-deployment.yaml
kubectl rollout status deployment/backend -n default
```

명령어로 바로 바꿀 수도 있습니다.

```bash
kubectl set image deployment/backend backend=wcharibo/find-me-backend:<new-tag> -n default
kubectl rollout status deployment/backend -n default
```

프론트엔드는:

```bash
kubectl set image deployment/frontend frontend=shyunnnn/find-me-frontend:<new-tag> -n default
kubectl rollout status deployment/frontend -n default
```

### 이전 버전으로 롤백

```bash
kubectl rollout undo deployment/backend -n default
kubectl rollout undo deployment/frontend -n default
```

롤백 이력은 `revisionHistoryLimit: 5`로 최대 5개까지 보관됩니다.

### 수동 스케일링

HPA가 없는 상황에서 임시로 Pod 수를 늘릴 수 있습니다.

```bash
kubectl scale deployment/backend --replicas=3 -n default
kubectl scale deployment/frontend --replicas=3 -n default
```

단, HPA가 적용되어 있으면 HPA가 다시 min/max 범위와 CPU 지표에 따라 replicas를 조정할 수 있습니다.

### Secret 수정 후 반영

Secret을 다시 적용합니다.

```bash
kubectl create secret generic backend-secret \
  --from-env-file=backend-secret.env \
  -n default \
  --dry-run=client \
  -o yaml | kubectl apply -f -
```

이미 떠 있는 Pod는 Secret 변경을 자동으로 환경변수에 다시 로드하지 않습니다. Deployment를 재시작해야 새 환경변수가 반영됩니다.

```bash
kubectl rollout restart deployment/backend -n default
kubectl rollout status deployment/backend -n default
```

프론트엔드도 동일합니다.

```bash
kubectl rollout restart deployment/frontend -n default
kubectl rollout status deployment/frontend -n default
```

## 13. HPA 설정

파일:

- `backend-hpa.yaml`
- `frontend-hpa.yaml`

### Backend HPA

| 항목 | 값 |
| --- | --- |
| 대상 | `Deployment/backend` |
| 최소 Pod 수 | `2` |
| 최대 Pod 수 | `6` |
| 기준 지표 | CPU 평균 사용률 |
| 목표 CPU 사용률 | `70%` |

CPU 평균 사용률이 70%를 넘으면 Pod 수를 늘리고, 낮아지면 줄입니다.

Scale up 정책:

- 60초마다 최대 100% 증가 가능
- 또는 60초마다 최대 2개 Pod 증가 가능
- 둘 중 더 크게 늘릴 수 있는 정책을 선택

Scale down 정책:

- 300초 안정화 시간을 둡니다.
- 갑자기 트래픽이 줄었다고 바로 줄이지 않아 출렁임을 줄입니다.

### Frontend HPA

| 항목 | 값 |
| --- | --- |
| 대상 | `Deployment/frontend` |
| 최소 Pod 수 | `2` |
| 최대 Pod 수 | `8` |
| 기준 지표 | CPU 평균 사용률 |
| 목표 CPU 사용률 | `70%` |

프론트엔드는 최대 8개까지 늘어날 수 있습니다.

### HPA 확인

```bash
kubectl get hpa -n default
kubectl describe hpa backend -n default
kubectl describe hpa frontend -n default
```

`TARGETS`가 `<unknown>`으로 나오면 metrics-server 문제일 가능성이 큽니다.

## 14. PDB 설정

파일: `app-pdb.yaml`

현재 설정은 다음과 같습니다.

```yaml
minAvailable: 1
```

백엔드와 프론트엔드 각각 최소 1개 Pod는 사용 가능한 상태로 유지되도록 합니다.

이 설정은 장애로 Pod가 갑자기 죽는 것을 막는 설정은 아닙니다. 대신 노드 점검, drain, cluster autoscaler의 노드 제거처럼 Kubernetes가 계획적으로 Pod를 내리는 상황에서 최소 가용성을 지키도록 도와줍니다.

## 15. 장애 상황별 확인 포인트

### Pod가 Pending 상태

가능한 원인:

- Node 리소스 부족
- CPU/memory request를 만족하는 Node가 없음
- Affinity 조건 때문에 배치가 어려움

확인 명령:

```bash
kubectl describe pod <pod-name> -n default
```

### ImagePullBackOff

가능한 원인:

- 이미지 태그가 없음
- private registry 인증 문제
- 이미지 이름 오타

확인 명령:

```bash
kubectl describe pod <pod-name> -n default
```

### CreateContainerConfigError

가능한 원인:

- Secret이 없음
- Secret key가 누락됨
- ConfigMap 또는 volume 참조 오류

확인 명령:

```bash
kubectl get secret -n default
kubectl describe pod <pod-name> -n default
```

### CrashLoopBackOff

가능한 원인:

- 애플리케이션 실행 중 예외 발생
- DB, Redis 등 외부 자원 연결 실패
- 필수 환경변수 누락
- 포트 설정 불일치

확인 명령:

```bash
kubectl logs <pod-name> -n default --previous
kubectl describe pod <pod-name> -n default
```

### Service는 있는데 접속이 안 됨

확인할 점:

- Service selector와 Pod label이 일치하는지
- Endpoint가 비어 있지 않은지
- Pod readinessProbe가 실패하고 있지 않은지

명령:

```bash
kubectl get svc backend -n default
kubectl get endpoints backend -n default
kubectl get pods -n default --show-labels
```

### Ingress ADDRESS가 비어 있음

가능한 원인:

- AWS Load Balancer Controller가 설치되어 있지 않음
- IngressClass `alb`가 없음
- subnet annotation 오류
- 인증서 ARN 오류
- IAM 권한 문제

확인 명령:

```bash
kubectl get ingressclass
kubectl describe ingress app-alb-v2 -n default
kubectl get pods -n kube-system
```

AWS Load Balancer Controller가 별도 namespace에 설치되어 있다면 해당 namespace의 로그를 확인해야 합니다.

### HTTPS 인증서 오류

확인할 점:

- ACM 인증서가 같은 region에 있는지
- 인증서가 해당 도메인을 포함하는지
- DNS가 올바른 ALB를 바라보는지
- Ingress annotation의 certificate ARN이 맞는지

## 16. 팀 운영 체크리스트

배포 전:

- `kubectl config current-context`로 cluster 확인
- 운영에 사용할 Ingress 파일 하나만 선택
- Secret 값이 최신인지 확인
- 이미지 태그가 의도한 버전인지 확인
- `namespace: default` 기준인지 확인

배포 중:

- Secret 적용
- Deployment 적용
- Service 적용
- HPA/PDB 적용
- Ingress 적용
- `rollout status` 확인

배포 후:

- Pod `READY` 확인
- Service endpoint 확인
- Ingress `ADDRESS` 확인
- 도메인 HTTPS 접근 확인
- 백엔드 로그에서 DB/Redis/S3 연결 오류 확인
- HPA `TARGETS`가 정상적으로 표시되는지 확인

## 17. 현재 설정에서 꼭 기억할 점

1. 모든 주요 리소스는 현재 `default` namespace 기준입니다.
2. `backend-secret`, `frontend-secret`이 먼저 있어야 Deployment가 정상 기동합니다.
3. `app-ingress.yaml`과 `ingress-https.yaml`은 둘 다 Ingress입니다. 운영에서는 어떤 도메인을 쓸지 정하고 하나를 선택하는 편이 좋습니다.
4. Service는 Pod 이름이 아니라 라벨로 Pod를 찾습니다. `selector`와 Pod `labels`가 맞아야 합니다.
5. HPA는 metrics-server가 있어야 제대로 동작합니다.
6. Secret을 바꾼 뒤에는 Deployment 재시작이 필요합니다.
7. 같은 이미지 태그를 재사용하면 실제 배포 버전 추적이 어려워집니다. 가능하면 빌드 번호나 commit SHA 기반 태그를 쓰는 것이 좋습니다.
8. 프론트엔드의 `VITE_*` 값은 빌드 시점 주입인지 런타임 주입인지 이미지 구조를 확인해야 합니다.

