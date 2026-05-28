# Kubernetes HPA 자동 확장 가이드

이 문서는 현재 프로젝트의 `Deployment`가 하는 일과, 부하가 올라갔을 때 Pod 수를 자동으로 늘리는 `HorizontalPodAutoscaler(HPA)` 설정 방법을 설명합니다.

## 1. 지금 설정이 하는 일

현재 백엔드 Deployment에 이런 설정이 있습니다.

```yaml
spec:
  replicas: 2
```

이 뜻은 `backend` Pod를 항상 2개 유지하라는 의미입니다.

```text
Pod 2개 실행 중
  |
  | Pod 하나 죽음
  v
Kubernetes가 새 Pod를 만들어 다시 2개로 맞춤
```

이 기능은 자동 복구입니다. 애플리케이션이 힘들어할 때 Pod를 3개, 4개로 늘리는 기능은 아닙니다.

## 2. HPA가 하는 일

HPA는 CPU, 메모리 같은 지표를 보고 Deployment의 `replicas` 값을 자동으로 조절합니다.

예를 들어 백엔드 HPA를 이렇게 설정할 수 있습니다.

```text
최소 Pod 수: 2
최대 Pod 수: 6
CPU 평균 사용률 목표: 70%
```

그러면 흐름은 이렇게 됩니다.

```text
backend Pod 2개
  |
  | CPU 평균 사용률이 70%보다 높음
  v
HPA가 replicas를 3, 4, 5, 6까지 증가
  |
  | CPU 사용률이 안정되고 시간이 지남
  v
HPA가 다시 replicas를 줄임
```

정리하면 다음과 같습니다.

| 설정 | 역할 |
| --- | --- |
| `replicas: 2` | Pod가 죽으면 다시 만들어 항상 2개 유지 |
| `HPA minReplicas: 2` | 최소 2개는 유지 |
| `HPA maxReplicas: 6` | 부하가 커져도 최대 6개까지만 증가 |
| `resources.requests.cpu` | HPA가 CPU 사용률을 계산할 기준 |

## 3. HPA 사용 전 필요한 조건

HPA가 CPU 기준으로 동작하려면 세 가지가 필요합니다.

1. 클러스터에 metrics-server가 있어야 합니다.
2. Deployment에 `resources.requests.cpu`가 있어야 합니다.
3. HPA가 정확한 Deployment 이름을 바라봐야 합니다.

metrics-server 확인:

```bash
kubectl top nodes
kubectl top pods -n prod
```

정상이라면 CPU, MEMORY 값이 출력됩니다.

HPA 확인:

```bash
kubectl get hpa -n prod
```

## 4. Deployment에 resources 추가

현재 예시 Deployment에는 `resources`가 없습니다. CPU 사용률 기반 HPA를 쓰려면 컨테이너에 `resources.requests.cpu`를 넣어야 합니다.

예시:

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: backend-deploy
spec:
  replicas: 2
  selector:
    matchLabels:
      app: backend
  template:
    metadata:
      labels:
        app: backend
    spec:
      containers:
      - name: backend
        image: shyunnnn/find-me-backend:96-dev
        ports:
        - containerPort: 8080
        - containerPort: 18081
        envFrom:
        - secretRef:
            name: backend-secrets
        resources:
          requests:
            cpu: 250m
            memory: 512Mi
          limits:
            cpu: "1"
            memory: 1Gi
      nodeSelector:
        env: dev
```

`requests.cpu: 250m`은 이 Pod가 기본적으로 CPU 0.25개 정도를 필요로 한다는 뜻입니다.

HPA의 `averageUtilization: 70`은 이 request 값을 기준으로 계산됩니다.

```text
requests.cpu = 250m
target = 70%

Pod 하나가 평균 175m 정도 CPU를 쓰면 목표치에 도달
```

## 5. Backend HPA 예시

파일 예시: `backend-hpa.yaml`

```yaml
apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
metadata:
  name: backend-hpa
spec:
  scaleTargetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: backend-deploy
  minReplicas: 2
  maxReplicas: 6
  metrics:
    - type: Resource
      resource:
        name: cpu
        target:
          type: Utilization
          averageUtilization: 70
  behavior:
    scaleUp:
      stabilizationWindowSeconds: 0
      policies:
        - type: Pods
          value: 2
          periodSeconds: 60
    scaleDown:
      stabilizationWindowSeconds: 300
      policies:
        - type: Pods
          value: 1
          periodSeconds: 60
```

중요한 부분은 `scaleTargetRef.name`입니다.

현재 백엔드 Deployment 이름이 다음과 같다면:

```yaml
metadata:
  name: backend-deploy
```

HPA도 반드시 이렇게 바라봐야 합니다.

```yaml
scaleTargetRef:
  name: backend-deploy
```

## 6. Frontend HPA 예시

파일 예시: `frontend-hpa.yaml`

```yaml
apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
metadata:
  name: frontend-hpa
spec:
  scaleTargetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: frontend-deploy
  minReplicas: 1
  maxReplicas: 4
  metrics:
    - type: Resource
      resource:
        name: cpu
        target:
          type: Utilization
          averageUtilization: 70
```

프론트엔드는 정적 파일 서빙이면 백엔드보다 CPU 부하가 낮은 경우가 많습니다. 처음에는 `maxReplicas: 4` 정도로 작게 시작하고, 실제 부하를 보면서 늘리는 편이 안전합니다.

## 7. 적용 방법

prod에 적용:

```bash
kubectl apply -n prod -f backend.yaml
kubectl apply -n prod -f frontend.yaml
kubectl apply -n prod -f backend-hpa.yaml
kubectl apply -n prod -f frontend-hpa.yaml
```

dev에 적용:

```bash
kubectl apply -n dev -f backend.yaml
kubectl apply -n dev -f frontend.yaml
kubectl apply -n dev -f backend-hpa.yaml
kubectl apply -n dev -f frontend-hpa.yaml
```

YAML에 `metadata.namespace`를 직접 쓰지 않고 Jenkins에서 `-n ${ENV_TAG}`로 적용한다면, HPA YAML에도 namespace를 빼는 편이 좋습니다.

```yaml
metadata:
  name: backend-hpa
```

이렇게 두면 Jenkins의 `-n prod`, `-n dev`가 적용됩니다.

## 8. Jenkins에 넣는 방법

현재 Jenkins가 `k8s` 디렉터리에서 Deployment와 Service를 적용하고 있다면, HPA 파일도 같은 위치에 두고 같이 적용하면 됩니다.

```groovy
dir('k8s') {
    sh "kubectl apply -f frontend.yaml -n ${ENV_TAG}"
    sh "kubectl apply -f backend.yaml -n ${ENV_TAG}"
    sh "kubectl apply -f frontend-hpa.yaml -n ${ENV_TAG}"
    sh "kubectl apply -f backend-hpa.yaml -n ${ENV_TAG}"
}
```

단, HPA YAML의 `scaleTargetRef.name`은 Jenkins가 적용하는 Deployment 이름과 같아야 합니다.

```text
backend.yaml Deployment name  -> backend-deploy
backend-hpa.yaml target name  -> backend-deploy

frontend.yaml Deployment name -> frontend-deploy
frontend-hpa.yaml target name -> frontend-deploy
```

## 9. 적용 후 확인

HPA 상태 확인:

```bash
kubectl get hpa -n prod
```

예상 출력 형태:

```text
NAME           REFERENCE                    TARGETS   MINPODS   MAXPODS   REPLICAS
backend-hpa    Deployment/backend-deploy    35%/70%   2         6         2
frontend-hpa   Deployment/frontend-deploy   10%/70%   1         4         1
```

Deployment와 Pod 수 확인:

```bash
kubectl get deploy,pod -n prod
```

실시간으로 보기:

```bash
kubectl get hpa,pod -n prod -w
```

Pod 리소스 사용량 확인:

```bash
kubectl top pods -n prod
```

## 10. 테스트 방법

간단히 부하를 줘서 HPA가 반응하는지 볼 수 있습니다.

예시:

```bash
kubectl run load-test -n prod --rm -it --image=busybox -- /bin/sh
```

컨테이너 안에서:

```sh
while true; do wget -q -O- http://backend:8080/api/health; done
```

서비스 경로나 health endpoint는 실제 백엔드 API에 맞게 바꿔야 합니다.

부하 테스트 중 다른 터미널에서 확인:

```bash
kubectl get hpa,pod -n prod -w
```

## 11. 지금 클러스터에서 특히 중요한 점

현재 노드 라벨은 다음 기준으로 정리되어 있습니다.

```text
worker1        env=prod
worker-*****   env=dev
```

Deployment에 이런 설정이 있으면:

```yaml
nodeSelector:
  env: prod
```

prod Pod는 `worker1`에만 뜹니다.

이 상태에서 HPA가 Pod를 늘려도 새 Pod는 전부 `worker1`에만 뜹니다. 즉 HPA는 Pod 수만 늘릴 뿐, 노드 수를 늘리지는 않습니다.

```text
HPA
  -> Pod 2개를 4개로 늘림

nodeSelector env=prod
  -> 늘어난 Pod도 worker1에만 배치
```

만약 `worker1`의 CPU나 메모리가 부족하면 새 Pod는 `Pending` 상태가 될 수 있습니다.

노드 자체를 자동으로 늘리고 싶다면 HPA와 별도로 Cluster Autoscaler 또는 Karpenter 같은 노드 오토스케일링 구성이 필요합니다.

## 12. 자주 헷갈리는 부분

### replicas와 HPA는 다른가?

다릅니다.

```text
replicas
  -> 기본으로 몇 개를 유지할지

HPA
  -> 부하에 따라 replicas 값을 자동으로 바꿀지
```

HPA가 있더라도 Deployment의 `replicas`를 지워야 하는 것은 아닙니다. 다만 HPA가 동작하면 이후 실제 replica 수는 HPA가 조절합니다.

### Pod 하나가 죽으면 HPA가 살리나?

아닙니다. Pod가 죽었을 때 다시 만드는 것은 Deployment와 ReplicaSet의 역할입니다.

HPA는 부하를 보고 개수를 늘리고 줄이는 역할입니다.

### CPU 기준 HPA가 안 움직이는 이유는?

주로 다음 원인입니다.

```text
metrics-server가 없음
kubectl top pods가 안 됨
Deployment에 resources.requests.cpu가 없음
HPA target Deployment 이름이 틀림
Pod가 이미 maxReplicas까지 늘어남
노드 자원이 부족해서 새 Pod가 Pending 상태
```

### Service도 수정해야 하나?

대부분 수정할 필요 없습니다.

Service는 `selector`로 Pod를 찾습니다.

```yaml
selector:
  app: backend
```

HPA가 Pod를 2개에서 6개로 늘려도 새 Pod에 `app: backend` 라벨이 붙어 있으면 Service가 자동으로 트래픽 대상에 포함합니다.

## 13. 권장 시작값

처음에는 너무 크게 잡지 말고 작게 시작하는 것이 좋습니다.

Backend:

```text
minReplicas: 2
maxReplicas: 6
averageUtilization: 70
requests.cpu: 250m
requests.memory: 512Mi
```

Frontend:

```text
minReplicas: 1
maxReplicas: 4
averageUtilization: 70
requests.cpu: 100m
requests.memory: 128Mi
```

운영하면서 다음 값을 보고 조정합니다.

```bash
kubectl top pods -n prod
kubectl describe hpa backend-hpa -n prod
kubectl describe hpa frontend-hpa -n prod
kubectl get events -n prod --sort-by=.lastTimestamp
```

## 14. 최종 체크리스트

HPA 적용 전:

- metrics-server가 동작한다.
- `kubectl top pods -n prod`가 된다.
- Deployment에 `resources.requests.cpu`가 있다.
- HPA의 `scaleTargetRef.name`이 Deployment 이름과 같다.
- prod Pod가 `env=prod` 노드에 뜬다.
- prod Ingress의 `target-node-labels`도 `env=prod`를 본다.

HPA 적용 후:

- `kubectl get hpa -n prod`에서 TARGETS가 `<unknown>`이 아니다.
- 부하가 올라가면 REPLICAS가 증가한다.
- 새 Pod가 `Running` 상태가 된다.
- Service endpoints에 새 Pod IP가 추가된다.

확인 명령:

```bash
kubectl get hpa,deploy,pod,endpoints -n prod
kubectl describe hpa backend-hpa -n prod
kubectl top pods -n prod
```
