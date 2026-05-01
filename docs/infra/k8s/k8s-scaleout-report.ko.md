# Kubernetes 스케일아웃 인프라 보고서

## 요약

`/home/ubuntu`에 있는 manifest들을 업데이트하여 frontend와 backend가 node-level 트래픽 노출에 의존하지 않고, 더 표준적인 Kubernetes 패턴으로 scale out할 수 있게 했습니다.

새 baseline은 다음을 사용합니다.

- multi-replica `Deployment`
- `ClusterIP` Service
- `target-type: ip`를 사용하는 AWS ALB Ingress
- `HorizontalPodAutoscaler`
- `PodDisruptionBudget`
- startup, readiness, liveness probe
- CPU와 memory request/limit

## 적용된 설계

### Frontend와 backend 배포 모델

이제 애플리케이션은 다음 경로를 따릅니다.

`ALB -> Ingress -> ClusterIP Service -> multiple pods`

이 구성은 `NodePort` 기반 ingress routing 필요성을 없애고 scale-out 동작을 더 예측 가능하게 만듭니다.

### Backend deployment 업데이트

파일: [backend-deployment.yaml](/home/ubuntu/backend-deployment.yaml)

- replica를 `1`에서 `2`로 증가
- `Recreate`를 `RollingUpdate`로 교체
- 가능하면 replica가 여러 node에 분산되도록 anti-affinity preference 추가
- `startupProbe`, `readinessProbe`, `livenessProbe` 추가
- resource request와 limit 추가
- 기본 container security context 추가

파일: [backend-service.yaml](/home/ubuntu/backend-service.yaml)

- Service type을 `NodePort`에서 `ClusterIP`로 변경
- named target port 사용으로 전환

### Frontend deployment 업데이트

파일: [frontend-deployment.yaml](/home/ubuntu/frontend-deployment.yaml)

- baseline replica `2` 유지
- rolling update 설정 추가
- anti-affinity preference 추가
- HTTP readiness/liveness probe 추가
- resource request와 limit 추가
- 기본 container security context 추가

파일: [frontend-service.yaml](/home/ubuntu/frontend-service.yaml)

- Service type을 `NodePort`에서 `ClusterIP`로 변경

### Ingress 업데이트

파일:

- [app-ingress.yaml](/home/ubuntu/app-ingress.yaml)
- [ingress-https.yaml](/home/ubuntu/ingress-https.yaml)

두 파일 모두 동일한 의도한 ingress 설계를 반영합니다.

- `find.me.kr -> frontend`
- `api.find.me.kr -> backend`
- ALB `target-type`을 `instance`에서 `ip`로 변경

backend에 ALB health check용 HTTP health endpoint가 아직 확인되지 않았기 때문에, 임시 호환 조치로 ALB success code 범위를 `200-404`로 넓혔습니다.

## 추가된 파일

- [backend-hpa.yaml](/home/ubuntu/backend-hpa.yaml)
- [frontend-hpa.yaml](/home/ubuntu/frontend-hpa.yaml)
- [app-pdb.yaml](/home/ubuntu/app-pdb.yaml)

## 이 구성이 스케일아웃에 더 나은 이유

- 여러 replica가 같은 Service 뒤에서 트래픽을 처리할 수 있습니다.
- rolling deployment가 더 이상 전체 교체 downtime을 필요로 하지 않습니다.
- ALB가 node port 대신 pod IP로 직접 라우팅할 수 있습니다.
- PDB가 drain 또는 maintenance 중에도 최소 하나의 pod가 사용 가능하도록 돕습니다.
- HPA가 scale 기준으로 사용할 resource request를 갖게 됩니다.

## 중요한 주의사항

### 1. HPA는 즉시 동작하지 않습니다

현재 `kubectl top nodes`는 `Metrics API not available`을 반환합니다.

즉, cluster에서 `metrics-server`가 준비되지 않았으므로 HPA manifest는 준비되어 있지만 metrics를 사용할 수 있을 때까지 동작하지 않습니다.

### 2. Backend DB 연결은 여전히 blocker입니다

이전 `dev` backend의 `CrashLoopBackOff`는 Spring Boot startup 중 database connection 실패 때문에 발생했습니다.

이번 infrastructure 변경은 rollout과 scale-out을 개선하지만, 잘못된 RDS endpoint, credential 문제, 또는 pod-to-RDS 경로 문제를 해결하지는 않습니다.

### 3. Backend health API는 여전히 추가하는 것이 좋습니다

rollout을 막지 않기 위해 backend probe는 `tcpSocket`으로 구현했습니다.

권장 다음 단계:

- `/actuator/health` 또는 그에 준하는 endpoint 추가
- backend probe를 `httpGet`으로 전환
- ALB health success code를 다시 `200`으로 좁히기

## 권장 적용 순서

```bash
kubectl apply -f backend-deployment.yaml
kubectl apply -f backend-service.yaml
kubectl apply -f frontend-deployment.yaml
kubectl apply -f frontend-service.yaml
kubectl apply -f ingress-https.yaml
kubectl apply -f app-pdb.yaml
kubectl apply -f backend-hpa.yaml
kubectl apply -f frontend-hpa.yaml
```

## 기대 결과

DB 연결이 수정되고 `metrics-server`가 설치된 뒤에는 다음을 기대할 수 있습니다.

- frontend가 ALB 뒤에서 horizontal scale 가능
- backend가 ALB 뒤에서 horizontal scale 가능
- rollout이 더 안전하고 disruption이 줄어듦
- node maintenance가 전체 service 중단으로 이어질 가능성이 낮아짐
