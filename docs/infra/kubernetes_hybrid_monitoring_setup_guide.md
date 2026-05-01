# Hybrid Kubernetes 모니터링 구축 가이드 (Prometheus, Loki, Grafana)

본 문서는 AWS EC2와 외부 온프레미스 서버가 Tailscale VPN으로 묶인 하이브리드 환경에서 중앙 집중형 모니터링 시스템을 구축하는 방법을 설명합니다.

---

## 1. 시스템 아키텍처
- **중앙 제어 (K8s)**: Prometheus, Loki, Grafana가 클러스터 내부에서 실행되며 모든 데이터를 수집 및 저장합니다.
- **로그 수집 (Loki)**:
    - **내부**: Promtail이 DaemonSet으로 실행되어 모든 파드 로그를 자동 수집합니다.
    - **외부**: 외부 서버의 Promtail이 K8s Loki의 NodePort(31000)를 통해 로그를 전송합니다.
- **메트릭 수집 (Prometheus)**:
    - **내부**: Service Discovery를 통해 K8s 파드/노드 메트릭을 자동 수집합니다.
    - **외부**: `static_configs`에 등록된 외부 IP를 통해 엑스포터 데이터를 직접 긁어옵니다.

---

## 2. 사전 준비 사항

1.  **AWS IAM 설정**:
    - Loki 전용 IAM 사용자 생성 및 **S3 접근 권한** 부여.
    - Access Key/Secret Key 발급 필수.
2.  **보안 그룹(Security Group) 설정**:
    - K8s 마스터 노드: **31000(Loki)**, **3000(Grafana)**, **6443(API Server)** 포트 개방.
    - 외부 서버: **9100(node-exporter)** 등 메트릭 포트 개방.
    - *참고: Tailscale IP를 통한 통신 시 OS 방화벽(UFW) 설정이 더 중요할 수 있습니다.*

---

## 3. Step 1: 중앙 모니터링 스택 배포 (K8s)

### 3-1. 하이브리드 네트워크 최적화 (핵심)
Tailscale과 CNI(Calico)가 공존하는 환경에서는 다음 설정이 필수입니다.

- **hostNetwork: true**: Promtail이 CNI 가상망을 통하지 않고 호스트 네트워크(Tailscale 포함)를 직접 쓰게 하여 통신 병목을 제거합니다.
- **Root 권한 부여**: `/var/log/pods` 폴더는 보통 root 소유입니다. Promtail 컨테이너에 `securityContext: runAsUser: 0`을 설정해야 합니다.
- **Localhost 라우팅**: 워커 노드에서 로그 전송 시 마스터 IP 대신 `http://localhost:31000`을 사용하면 K8s 인프라가 알아서 최적의 경로로 배달합니다.

### 3-2. 환경변수 및 배포 실행
```bash
# 1. 환경변수 설정 (.env 파일)
cp logging/.env.example logging/.env
vi logging/.env

# 2. 배포 실행 (envsubst 활용)
export $(grep -v '^#' logging/.env | xargs)
for file in logging/*.yaml; do
  envsubst < "$file" | kubectl apply -f -
done

# 3. 강제 재시작 (설정 변경 시)
kubectl rollout restart ds promtail -n monitoring
```

---

## 4. 트러블슈팅 (Troubleshooting)

### 4-1. Loki에 로그가 안 보일 때 (Explore 메뉴)
- **Path 매칭 확인**: 파드 로그 폴더 이름이 `namespace_pod_uid` 형식인 경우, ConfigMap에서 정규식(`regex`)을 통해 `__path__`를 조립해야 합니다.
- **Tailing 확인**: `kubectl logs -n monitoring -l app=promtail` 명령어로 `tail routine: started` 로그가 올라오는지 확인하세요.
- **수동 테스트**: 마스터 노드에서 `curl` 명령어로 Loki에게 로그 한 줄을 직접 쏴서 데이터베이스가 살아있는지 확인합니다.

### 4-2. 네트워크 타임아웃
- 마스터 노드의 `ufw status`를 확인하여 31000 포트가 `ALLOW` 상태인지 체크하세요.
- `hostNetwork` 모드에서는 K8s 내부 DNS(`svc.cluster.local`)가 안 풀릴 수 있으므로, API 서버 주소를 직접 IP로 지정해야 합니다.

---

## 5. 유지보수
- **로그 보관 기간**: `loki-config.yml`의 `retention_period`에서 설정합니다. (기본값 보통 168h)
- **대시보드**: Grafana에서 ID `1860`(Node Exporter) 대시보드를 가져오면 즉시 모니터링이 가능합니다.
