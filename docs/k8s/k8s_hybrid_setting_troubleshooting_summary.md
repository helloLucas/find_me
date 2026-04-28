# 하이브리드 쿠버네티스 클러스터 트러블슈팅 상세 기술 보고서

본 문서는 AWS VPC 내부 노드(Master, Worker1)와 외부 EC2 노드(Worker-SSAFY)를 Tailscale VPN으로 연결한 하이브리드 클러스터 환경에서 발생한 주요 장애와 그 해결 과정을 상세히 기록합니다.

---

## 1. 노드 네트워크 및 상태 복구 (Node Connectivity)
### [상황]
외부 EC2 인스턴스를 클러스터에 조인시킨 후, `kubectl get nodes`에서 해당 노드가 `NotReady` 상태이거나 내부 IP가 VPC 사설 IP(`172.x.x.x`)로 잡혀 Tailscale 망을 통한 통신이 불가능한 현상 발생.

### [조치]
1.  **Kubelet IP 강제 지정:** `/etc/default/kubelet` 파일을 수정하여 Kubelet이 Tailscale IP를 노드 IP로 인식하도록 설정.
    ```bash
    KUBELET_EXTRA_ARGS="--node-ip=100.114.155.48"
    ```
2.  **노드 이름 관리:** 리눅스 호스트 네임을 `worker-ssafy`로 변경하여 클러스터 내 식별을 명확히 함.

---

## 2. 데이터베이스 연결성 해결 (RDS Split-Horizon DNS)
### [상황]
백엔드 Pod가 RDS 도메인 주소로 접속 시, AWS 내부망 IP(`172.x.x.x`)로 해석되어 외부 노드에서는 접속이 불가능한 현상(Split-Horizon DNS 문제) 발생.

### [조치]
*   RDS 도메인 대신 고정된 **공인 IP(`3.35.185.159`)**를 사용하도록 `backend-secrets` 설정을 변경하여 네트워크 경계를 넘어선 DB 연결을 확보함.

---

## 3. 서비스 노출 방식 최적화 (Service Exposure)
### [상황]
`LoadBalancer` 타입 서비스를 사용했으나, 외부 클라우드 로드밸런서 연동이 없는 환경이라 `pending` 상태에서 멈춤.

### [조치]
*   **NodePort** 방식으로 전환하여 각 노드의 특정 포트로 직접 서비스를 노출함.
    *   **Frontend:** `80:30116/TCP` (NodePort: 30116)
    *   **Backend:** `8080:30667/TCP`, `18081:18081/TCP`

---

## 4. 쿠버네티스 네트워크(CNI/Calico) 심층 복구 (Core Networking)
### [상황]
Calico가 `Init:CrashLoopBackOff` 상태에 빠져 Pod 간 통신이 전면 차단됨. 이는 하이브리드 클러스터의 가장 핵심적인 장애였음.

### [조치 상세]
1.  **MTU 불일치 해결:**
    *   Tailscale의 MTU(1280)가 Calico의 기본 MTU(1440)보다 작아 패킷 드랍 발생.
    *   Calico MTU를 **1220**으로 하향 조정.
    ```bash
    kubectl patch installation default --type=merge -p '{"spec": {"calicoNetwork": {"mtu": 1220}}}'
    ```
2.  **인터페이스 자동 감지 교정:**
    *   Calico가 VPC 인터페이스(`ens5`)를 우선 참조하는 문제 해결을 위해 `tailscale.*` 인터페이스를 강제 지정.
3.  **API 서버 접속 교착 상태(Chicken-and-Egg) 해결:**
    *   `calico-node`가 부팅 시 API 서버 가상 IP(`10.96.0.1`)에 접속하려 하나, Calico가 안 떠서 해당 주소로의 경로를 모르는 상황.
    *   **IPTABLES NAT 적용:** `10.96.0.1:443`으로 가는 신호를 마스터의 실제 IP(`100.119.163.18:6443`)로 강제 변환(DNAT).
    ```bash
    sudo iptables -t nat -I OUTPUT 1 -d 10.96.0.1 -p tcp --dport 443 -j DNAT --to-destination 100.119.163.18:6443
    sudo iptables -t nat -I POSTROUTING 1 -d 100.119.163.18 -p tcp --dport 6443 -j MASQUERADE
    ```
    *   **DaemonSet 환경변수 강제 주입:** Tigera Operator의 한계를 넘기 위해 `KUBERNETES_SERVICE_HOST`를 직접 마스터 IP로 패치.

---

## 5. 보안 및 접속 편의성 설정 (OS Level)
### [상황]
AWS 보안 그룹 권한이 제한적인 환경에서 80 포트로의 쉬운 접속 환경 필요.

### [조치]
1.  **UFW 설정:** 30000~32767(NodePort 대역), 80(HTTP), 443(HTTPS) 포트 허용.
2.  **포트 리다이렉션:** 사용자가 포트 번호를 입력하지 않아도 접속 가능하도록 노드 레벨에서 포트 포워딩 설정.
    ```bash
    sudo iptables -t nat -A PREROUTING -p tcp --dport 80 -j REDIRECT --to-ports 30116
    ```

---

## 🏁 최종 상태 및 접속 정보
*   **클러스터 상태:** 모든 노드 `Ready`, 모든 Calico 및 서비스 Pod `Running` (1/1).
*   **프론트엔드 접속:**
    *   **VPN 내부:** `http://100.114.155.48:30116`
    *   **공인 망:** `http://3.35.17.97` (80 포트로 자동 리다이렉트)
