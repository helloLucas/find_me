# 🚀 K8s 모니터링 고도화 퓨처 플랜 (Future Plan)

현재 인프라가 Docker Compose에서 **Kubernetes(K8s) + containerd** 환경으로 전환됨에 따라, 모니터링 시스템(Prometheus & Grafana)도 이에 맞춰 진화해야 합니다. 

이 문서는 당장의 마이그레이션 이후, 향후 K8s 환경에 완벽히 호환되고 확장 가능한 모니터링 시스템을 구축하기 위한 로드맵을 정의합니다.

---

## 1. 현재 구조의 한계점 (NodePort 방식)

현재는 K8s 클러스터 외부에 있는 로깅 서버가 K8s 워커 노드의 `NodePort`(예: 18081)를 찔러서 메트릭을 수집하는 구조입니다.

*   **지표 혼합 (Round-Robin 딜레마):** K8s Service(`NodePort`)는 기본적으로 여러 개의 파드(Pod)로 트래픽을 분산시킵니다. Prometheus가 15초마다 메트릭을 요청할 때, 파드 A와 파드 B의 응답이 번갈아 오게 되어 Grafana에서 파드별 개별 상태를 정확히 추적하기 어렵습니다.
*   **런타임 호환성 (cAdvisor):** 기존 독립형 `cAdvisor` 컨테이너는 Docker 소켓(`/var/run/docker.sock`)을 기반으로 작동하도록 설정되어 있습니다. K8s의 기본 런타임이 `containerd`로 변경되면 기존 방식으로는 컨테이너(파드) 리소스를 제대로 읽어올 수 없습니다.

---

## 2. 향후 개선 목표 (Native K8s Monitoring)

### Phase 1: Service Discovery 적용 (파드 개별 모니터링)
정적인 IP와 포트를 지정하는 `static_configs` 방식에서 벗어나, K8s API 서버와 통신하여 동적으로 파드를 찾아내는 **서비스 디스커버리(Service Discovery)**를 도입합니다.

*   **설정 변경:** `prometheus.yml`에 `kubernetes_sd_configs`를 추가합니다.
*   **효과:** Prometheus가 K8s 내부에 뜨고 지는 파드들의 IP를 자동으로 감지하고 직접 수집합니다. 이를 통해 Scale-out(스케일 아웃) 시에도 별도의 설정 변경 없이 모든 파드의 메트릭을 개별적으로 모니터링할 수 있습니다.

### Phase 2: containerd 완벽 대응 (Kubelet & Kube-state-metrics)
독립형 cAdvisor를 폐기하고, 쿠버네티스의 표준 모니터링 방식을 도입합니다.

*   **Kubelet 내장 cAdvisor:** 쿠버네티스의 각 노드에 설치된 Kubelet은 이미 cAdvisor를 내장하고 있습니다. Prometheus가 Kubelet의 포트(보통 10250)를 직접 긁어오도록 설정합니다.
*   **Kube-state-metrics (KSM) 도입:** 파드의 상태(Running, Pending, CrashLoopBackOff 등), Deployment의 레플리카 수, Node 상태 등 K8s 클러스터 자체의 건강 상태를 수집하기 위해 KSM을 배포합니다.

---

## 3. 최종 추천 아키텍처: Prometheus Operator (Helm)

위의 Phase 1과 Phase 2를 일일이 수동으로 설정하는 것은 유지보수 관점에서 매우 비효율적입니다. 따라서 K8s 생태계의 표준인 **`kube-prometheus-stack` (Helm Chart)** 도입을 최종 목표로 삼습니다.

### 🌟 기대 효과
1.  **설정 자동화:** `ServiceMonitor`라는 커스텀 리소스(CRD)를 생성하기만 하면, Prometheus가 알아서 해당 파드의 메트릭을 수집합니다. (`prometheus.yml`을 수동으로 편집할 필요가 없어집니다.)
2.  **All-in-One 패키지:** Kube-state-metrics, Node-exporter, Grafana, Alertmanager가 한 번의 명령어로 K8s 클러스터 내부에 최적화된 상태로 설치됩니다.
3.  **K8s 전용 대시보드:** 기본적으로 쿠버네티스 노드, 파드, 네임스페이스별 자원 사용량을 보여주는 아주 훌륭한 Grafana 대시보드들이 수십 개 포함되어 있습니다.

### 📝 마이그레이션 로드맵 요약
1.  **현재 (과도기):** 기존 `docker-compose` 로깅 서버 유지 + `NodePort`로 K8s 워커 노드 찌르기 (작동 확인 위주)
2.  **준비기:** K8s 클러스터 내부에 Helm을 이용하여 `kube-prometheus-stack` 배포 테스트
3.  **완성기:** 기존 외부 로깅 서버의 역할을 K8s 내부 Prometheus/Grafana로 완전히 이관 및 알림(Slack/Discord) 연동
