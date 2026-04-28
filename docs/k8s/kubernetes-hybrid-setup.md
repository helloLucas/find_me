# 하이브리드 쿠버네티스(Tailscale) 설정 가이드

본 가이드는 VPC 내부의 마스터/워커 노드와 외부 VPC의 개발용 워커 노드를 하나의 클러스터로 묶는 방법을 다룹니다.

## 0. 사전 준비 (IP 메모)
*   **EC2 1 (Master):** VPC IP (`172.x.x.x`), Tailscale IP (`100.A.A.A`)
*   **EC2 2 (Worker 1):** VPC IP (`172.x.x.x`), Tailscale IP (`100.B.B.B`)
*   **EC2 3 (Dev Node):** 공인 IP (`3.x.x.x`), Tailscale IP (`100.C.C.C`)

---

## 1단계: 모든 노드에 Tailscale 설치 및 연결 (EC2 1, 2, 3)

모든 노드(마스터, 워커1, 개발노드)에서 실행합니다.
```bash
# 설치
curl -fsSL https://tailscale.com/install.sh | sh

# 실행 및 로그인 (출력되는 링크 클릭하여 브라우저 인증)
sudo tailscale up

# 가상 IP 확인 (100.x.x.x 대역이 나오는지 확인)
tailscale ip -4
```

---

## 2단계: 마스터 노드(EC2 1) 인증서 업데이트

외부 노드가 마스터의 가상 IP로 접속할 수 있도록 허용하는 작업입니다.

1. **설정 추출:**
   ```bash
   kubectl get configmap -n kube-system kubeadm-config -o yaml > kubeadm-config.yaml
   ```
2. **파일 수정 (`vi kubeadm-config.yaml`):**
   `apiServer.certSANs` 항목에 마스터의 Tailscale IP를 추가합니다.
   ```yaml
   apiServer:
     certSANs:
     - "127.0.0.1"
     - "기존_VPC_프라이빗_IP"
     - "100.A.A.A" # 메모해둔 마스터 Tailscale IP 추가
   ```
3. **인증서 갱신:**
   ```bash
   # 기존 인증서 백업 (문제 발생 시 복구용)
   sudo cp /etc/kubernetes/pki/apiserver.crt /etc/kubernetes/pki/apiserver.crt.old
   sudo cp /etc/kubernetes/pki/apiserver.key /etc/kubernetes/pki/apiserver.key.old

   # 새 인증서 생성
   sudo kubeadm init phase certs apiserver --config kubeadm-config.yaml

   # API 서버 컨테이너 재시작 (컨테이너 중지 시 Kubelet이 자동 재시작함)
   # Docker를 사용하는 경우:
   sudo docker ps | grep kube-apiserver | awk '{print $1}' | xargs sudo docker stop
   # Containerd를 사용하는 경우:
   # sudo crictl ps | grep kube-apiserver | awk '{print $1}' | xargs sudo crictl stop
   ```

---

## 3단계: Calico 네트워크 및 클러스터 정보 수정 (마스터에서 실행)

노드들이 서로 다른 인터페이스(VPC eth0, Tailscale tailscale0)를 사용하더라도 통신이 가능하도록 수정합니다.

### 1. Calico 인터페이스 탐지 전략 수정
```bash
# eth0(VPC)와 tailscale 모두 탐지하도록 설정
kubectl patch installation default --type=merge -p '{"spec": {"calicoNetwork": {"nodeAddressAutodetectionV4": {"firstFound": false, "interface": "eth0|tailscale.*"}}}}'
```

### 2. 마스터 클러스터 정보(ConfigMap) 업데이트
외부 노드가 마스터의 가상 IP를 공식 엔드포인트로 인식하게 합니다.
```bash
# 1. 파일 생성
cat <<EOF > final-config.yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: kubeadm-config
  namespace: kube-system
data:
  ClusterConfiguration: |
    apiServer:
      timeoutForControlPlane: 4m0s
      certSANs:
      - "127.0.0.1"
      - "마스터_VPC_IP"
      - "100.A.A.A"
    apiVersion: kubeadm.k8s.io/v1beta3
    controlPlaneEndpoint: "100.A.A.A:6443"
    networking:
      podSubnet: 192.168.0.0/16
      serviceSubnet: 10.96.0.0/12
EOF

# 2. 적용
kubectl apply -f final-config.yaml

# 3. 지도(cluster-info) 강제 갱신 (중요!)
kubectl get cm -n kube-public cluster-info -o yaml | sed 's/마스터_VPC_IP/100.A.A.A/g' | kubectl apply -f -
```

---

## 4단계: 개발 워커 노드(EC2 3) 조인

### 1. 네트워크 성능 최적화 (MTU/MSS) - 마스터 & EC2 3 모두 실행
```bash
sudo iptables -t mangle -A POSTROUTING -p tcp --tcp-flags SYN,RST SYN -j TCPMSS --clamp-mss-to-pmtu
```

### 2. Kubelet 설정 및 조인 실행
```bash
# Kubelet IP 고정
echo 'KUBELET_KUBEADM_ARGS="--node-ip=<EC2_3_Tailscale_IP>"' | sudo tee /var/lib/kubelet/kubeadm-flags.env

# 조인 실행 (서명 체크 우회 옵션 추가)
sudo kubeadm join 100.A.A.A:6443 \
  --token <TOKEN> \
  --discovery-token-ca-cert-hash <HASH> \
  --ignore-preflight-errors=all \
  --node-name worker-dev
```

---

## 🔄 롤백 가이드 (원래대로 되돌리기)

### 1. EC2 3(개발 노드) 제거
*   **마스터에서:** `kubectl delete node worker-dev`
*   **EC2 3에서:** 
    ```bash
    sudo kubeadm reset -f
    sudo rm /var/lib/kubelet/kubeadm-flags.env
    ```

### 2. 마스터 인증서 및 설정 원복
```bash
# 인증서 원복
sudo mv /etc/kubernetes/pki/apiserver.crt.old /etc/kubernetes/pki/apiserver.crt
sudo mv /etc/kubernetes/pki/apiserver.key.old /etc/kubernetes/pki/apiserver.key
sudo crictl ps | grep kube-apiserver | awk '{print $1}' | xargs sudo crictl stop

# ConfigMap 원복 (IP 반대로 치환)
kubectl get cm -n kube-system kubeadm-config -o yaml | sed 's/100.A.A.A/마스터_VPC_IP/g' | kubectl apply -f -
kubectl get cm -n kube-public cluster-info -o yaml | sed 's/100.A.A.A/마스터_VPC_IP/g' | kubectl apply -f -
```

### 3. 네트워크 설정 제거
```bash
# iptables 규칙 삭제
sudo iptables -t mangle -D POSTROUTING -p tcp --tcp-flags SYN,RST SYN -j TCPMSS --clamp-mss-to-pmtu

# Calico 설정 초기화
kubectl patch installation default --type=merge -p '{"spec": {"calicoNetwork": {"nodeAddressAutodetectionV4": null}}}'
```

### 4. Tailscale 삭제 (모든 노드)
```bash
sudo tailscale logout
sudo tailscale down
sudo apt-get remove --purge tailscale -y
```
