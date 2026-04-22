# AWS EC2 인스턴스 구축 명세서 (K8s Master Node, ELK Stack, Prometheus/Grafana)

## 1. 인스턴스 정보
본 섹션은 AWS EC2 인스턴스 생성 시 입력한 정보들을 담고 있습니다.
### [1] 기본 정보
- **인스턴스 이름**: `lucas-ops-mgmt-apne2a-001`
- **프로젝트**: lucas
- **환경**: 운영 지원 (ops) / 관리&모니터링 (mgmt)
- **용도**: Kubernetes Master Node, ELK Stack (로그 수집), Prometheus/Grafana (모니터링)

### [2] 인스턴스 사양
- **인스턴스 유형**: `c6i.2xlarge` (8 vCPU, 16 GiB RAM)
- **AMI (OS)**: `Ubuntu Server 22.04 LTS (HVM), SSD Volume Type` (64-bit x86)
- **테넌시**: 공유 (Shared) : default
- **구매 옵션**: 온디맨드 (On-Demand) : default
- **예상 비용**: 월 약 $280.32

### [3] 네트워크 및 보안 설정
- **VPC/서브넷**: 기본 설정 사용
- **퍼블릭 IP**: 자동 할당 활성화 (Enabled)
- **보안 그룹 이름**: `lucas-ops-mgmt-sg`
- **인바운드 규칙**:
  | 포트 | 서비스 | 소스 (Source) | 설명 |
  | :--- | :--- | :--- | :--- |
  | 22 | SSH | 내 IP | 관리자 터미널 접속 |
  | 6443 | K8s API | 0.0.0.0/0 (향후 운영서버 IP로 변경 권장) | 쿠버네티스 제어 |
  | 5601 | Kibana | 내 IP | 로그 시각화 대시보드 |
  | 3000 | Grafana | 내 IP | 모니터링 대시보드 |
  | 5044 | Logstash | 0.0.0.0/0 (향후 운영서버 IP로 변경 권장) | 로그 데이터 수집 |

### [4] 스토리지 설정
- **볼륨 크기**: `100 GiB`
- **볼륨 유형**: `gp3` (General Purpose SSD)
- **종료 시 삭제**: 예 (Yes)
- **암호화**: 기본값 (Not Encrypted)

### [5] 고급 세부 정보
- **종료 방지**: 활성화 (Enabled)
- **중지 방지**: 활성화 (Enabled)
- **모니터링**: 기본 모니터링 (5분 간격, 무료)
- **EBS 최적화**: 활성화 (Enabled)

### [6] 사후 관리 및 최적화 가이드
1. **키 페어**: 생성한 `.pem` 파일을 안전한 곳에 보관 (분실 시 재발급 불가).
2. **메모리 최적화**: 16GB RAM 효율을 위해 약 4~8GB의 **Swap 메모리** 설정을 권장.
3. **ELK 설정**: ElasticSearch 실행을 위해 `vm.max_map_count` 커널 파라미터 수정 필요.
4. **보안 강화**: 운영 서버(`gp-prod-main`) 생성 후 6443, 5044 포트의 소스를 해당 서버의 프라이빗 IP로 제한할 것.
    
<br>  

---
## 2. 서버 초기 최적화 및 기본 환경 세팅
본 섹션은 인스턴스 생성 직후, 서비스(K8s, ELK 등) 설치가 가능한 클린 상태를 만들기 위한 필수 설정 과정을 담고 있습니다.

### [1] 시스템 업데이트 및 필수 패키지 설치
서버의 보안을 최신으로 유지하고, 외부 저장소(Docker, Elastic 등)와의 안전한 통신을 위한 기초 도구를 설치합니다.

```bash
# 1. 패키지 목록 업데이트 및 기존 패키지 업그레이드
sudo apt update && sudo apt upgrade -y

# 2. 외부 소프트웨어 저장소 추가 및 보안 검증을 위한 필수 유틸리티 설치
sudo apt install -y curl gnupg2 software-properties-common apt-transport-https ca-certificates
```
### [2] 가상 메모리(Swap) 설정
물리 메모리(16GB)가 고부하 작업으로 인해 가득 찼을 때 서버가 강제 종료되는 것을 방지하기 위해 4GB의 비상용 메모리 공간을 확보합니다.

```bash
# 1. 4GB 용량의 스왑 파일 생성 및 권한 설정
sudo fallocate -l 4G /swapfile
sudo chmod 600 /swapfile

# 2. 파일을 스왑 공간으로 포맷 및 활성화
sudo mkswap /swapfile
sudo swapon /swapfile

# 3. 재부팅 시에도 스왑이 자동 활성화되도록 설정 파일 등록
echo '/swapfile none swap sw 0 0' | sudo tee -a /etc/fstab

# 4. 설정 확인 (Swap 항목에 4.0Gi 확인)
free -h
```
### [3] 커널 파라미터 최적화
데이터 분석 엔진인 ElasticSearch는 대량의 파일을 처리하므로, 리눅스 커널의 가상 메모리 매핑 최대 한도를 늘려주어야 정상 작동합니다.

```bash
# 1. 커널 파라미터 즉시 수정
sudo sysctl -w vm.max_map_count=262144

# 2. 서버 재시작 시에도 유지되도록 영구 적용
echo "vm.max_map_count=262144" | sudo tee -a /etc/sysctl.conf
```
### [4] Docker Engine 설치 및 권한 설정
모든 서비스의 기반이 되는 컨테이너 엔진을 설치하고, 매번 sudo를 붙이지 않아도 되도록 사용자 권한을 부여합니다.

```bash
# 1. Docker 설치 및 서비스 실행
sudo apt install -y docker.io
sudo systemctl enable --now docker

# 2. 현재 사용자(ubuntu)를 docker 그룹에 추가
sudo usermod -aG docker $USER

# 위 설정 적용을 위해 로그아웃 후 다시 접속하거나 아래 명령 실행
newgrp docker
```

<br>  

---
## 3. ELK 구축 과정
### [1] Docker Compose 설치
여러 개의 컨테이너(ElasticSearch, Kibana 등)를 하나의 설정 파일로 통합 관리하기 위해 설치합니다.

```bash
# 1. 최신 버전의 Docker Compose 다운로드
sudo curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose

# 2. 실행 권한 부여
sudo chmod +x /usr/local/bin/docker-compose

# 3. 설치 확인
docker-compose --version
```
### [2] ELK 구축 (Docker 기반)
관리 서버의 핵심 기능인 로그 수집 및 시각화 시스템을 구축합니다.

#### 1) 디렉토리 구조 생성
```bash
mkdir -p ~/lucas-elk/logstash
cd ~/lucas-elk
mkdir elasticsearch_data
chmod 777 elasticsearch_data  # ElasticSearch 쓰기 권한 부여
```
#### 2) Docker Compose 설정 (docker-compose.yml)
인스턴스 사양(16GB RAM)을 고려하여 ElasticSearch에 4GB를 할당하고 포워딩 포트를 지정합니다.

```yaml
version: '3.7'
services:
  elasticsearch:
    image: docker.elastic.co/elasticsearch/elasticsearch:7.17.10
    container_name: elasticsearch
    environment:
      - discovery.type=single-node
      - "ES_JAVA_OPTS=-Xms4g -Xmx4g"
    volumes:
      - ./elasticsearch_data:/usr/share/elasticsearch/data
    ports:
      - 9200:9200
    networks:
      - elk

  logstash:
    image: docker.elastic.co/logstash/logstash:7.17.10
    container_name: logstash
    volumes:
      - ./logstash/logstash.conf:/usr/share/logstash/pipeline/logstash.conf
    ports:
      - 5044:5044
    networks:
      - elk
    depends_on:
      - elasticsearch

  kibana:
    image: docker.elastic.co/kibana/kibana:7.17.10
    container_name: kibana
    ports:
      - 5601:5601
    environment:
      - ELASTICSEARCH_HOSTS=http://elasticsearch:9200
    networks:
      - elk
    depends_on:
      - elasticsearch

networks:
  elk:
    driver: bridge
```

#### 3) Logstash 파이프라인 설정 (logstash/logstash.conf)
비트(Beats)를 통해 들어오는 로그를 수집하여 ElasticSearch 인덱스로 전송하도록 구성합니다.

```bash
input {
  beats {
    port => 5044
  }
}

output {
  elasticsearch {
    hosts => ["http://elasticsearch:9200"]
    index => "lucas-logs-%{+YYYY.MM.dd}"
  }
}
```

#### 4) 서비스 실행 및 상태 확인
```bash
# 서비스 백그라운드 실행
docker-compose up -d

# 실행 상태 확인
docker ps
```

<br>  

---
## 4. Kubernetes 마스터 노드 설정
본 섹션은 서버를 Kubernetes 클러스터의 관리자(Master Node)로 설정하고, 향후 AWS 로드밸런서 및 운영 서버(Worker Node) 연결을 위한 기반을 마련하는 과정을 담고 있습니다.

### [1] 시스템 환경 최적화
K8s의 안정적인 운영을 위해 리눅스 시스템의 설정을 컨테이너 통신에 최적화된 상태로 변경합니다.

```bash
# 1. 스왑 메모리 비활성화
# K8s는 메모리 사용량을 정확히 예측하기 위해 스왑 사용을 금지합니다.
# 이후 worker node 설정 후 마스터 노드가 안정되면 다시 활성화 가능합니다.
sudo swapoff -a
sudo sed -i '/swapfile/s/^/#/' /etc/fstab # 재부팅 시에도 스왑이 켜지지 않도록 설정

# 2. 커널 모듈 로드
# 컨테이너 간 트래픽이 리눅스 브리지를 통과할 수 있게 필수 모듈을 활성화합니다.
cat <<EOF | sudo tee /etc/modules-load.d/k8s.conf
overlay
br_netfilter
EOF

sudo modprobe overlay
sudo modprobe br_netfilter

# 3. 네트워크 브리지 설정 (IP Forwarding)
# 컨테이너 간의 통신 패킷이 운영체제 단에서 올바르게 전달되도록 허용합니다.
cat <<EOF | sudo tee /etc/sysctl.d/k8s.conf
net.bridge.bridge-nf-call-iptables  = 1
net.bridge.bridge-nf-call-ip6tables = 1
net.ipv4.ip_forward                 = 1
EOF

sudo sysctl --system
```
### [2] 컨테이너 런타임 최적화
K8s가 컨테이너를 실제로 실행하는 엔진인 containerd의 설정을 K8s 권장 사양에 맞춥니다.

```bash
# 1. containerd 기본 설정 생성
sudo mkdir -p /etc/containerd
containerd config default | sudo tee /etc/containerd/config.toml > /dev/null

# 2. SystemdCgroup 활성화
# 시스템의 자원 관리 도구와 컨테이너 엔진의 관리 도구를 일치시켜 안정성을 높입니다.
sudo sed -i 's/SystemdCgroup = false/SystemdCgroup = true/g' /etc/containerd/config.toml

sudo systemctl restart containerd
```
### [3] K8s 공식 도구 설치
클러스터를 구축하고 관리하는 데 필요한 3대 핵심 도구를 설치합니다.

```bash
# 1. 패키지 보안 검증을 위한 GPG 키 및 저장소 추가
sudo mkdir -p /etc/apt/keyrings
curl -fsSL https://pkgs.k8s.io/core:/stable:/v1.30/deb/Release.key | sudo gpg --dearmor -o /etc/apt/keyrings/kubernetes-apt-keyring.gpg
echo 'deb [signed-by=/etc/apt/keyrings/kubernetes-apt-keyring.gpg] https://pkgs.k8s.io/core:/stable:/v1.30/deb/ /' | sudo tee /etc/apt/sources.list.d/kubernetes.list

# 2. 도구 설치
# kubelet: 노드에서 컨테이너 실행 상태 관리
# kubeadm: 클러스터 구축(초기화, 조인) 도구
# kubectl: 사용자가 클러스터에 명령을 내리는 CLI 도구
sudo apt update
sudo apt install -y kubelet kubeadm kubectl
sudo apt-mark hold kubelet kubeadm kubectl # 자동 업데이트로 인한 클러스터 붕괴 방지
```
### [4] 클러스터 초기화 및 네트워크 구성
서버를 실제 마스터 노드로 작동시키고 내부 가상 통신망을 구축합니다.

```bash
# 1. 마스터 노드 초기화 (AWS 로드밸런서 대비형)
# --apiserver-cert-extra-sans: 외부(퍼블릭IP/LB)에서 접속 시 보안 인증서 에러를 방지합니다.
sudo kubeadm init \
  --pod-network-cidr=192.168.0.0/16 \
  --apiserver-advertise-address=<사설-IP> \
  --apiserver-cert-extra-sans=<퍼블릭-IP>

# 2. kubectl 사용자 권한 설정
# 관리자(root)가 아닌 일반 유저가 클러스터를 제어할 수 있도록 설정 파일을 복사합니다.
mkdir -p $HOME/.kube
sudo cp -i /etc/kubernetes/admin.conf $HOME/.kube/config
sudo chown $(id -u):$(id -g) $HOME/.kube/config

# 3. Calico 네트워크 플러그인 설치
# 컨테이너(Pod) 간의 실제 통신이 가능하도록 가상 네트워크 도로를 설치합니다.
kubectl create -f https://raw.githubusercontent.com/projectcalico/calico/v3.27.3/manifests/tigera-operator.yaml
kubectl create -f https://raw.githubusercontent.com/projectcalico/calico/v3.27.3/manifests/custom-resources.yaml
```

<br>  

---
## [참고] 서버 파일 구조
```
/home/ubuntu/
├── .kube/                        # [K8s] 사용 권한 및 클러스터 접속 정보
│   └── config                    # 'kubectl' 명령어가 참조하는 핵심 인증 파일
│
├── lucas-elk/                    # [ELK] 로그 관리 통합 디렉토리
│   ├── docker-compose.yml        # 3개 컨테이너(ES, Logstash, Kibana) 통합 관리 설정
│   ├── elasticsearch_data/       # 로그 데이터가 실제로 쌓이는 저장소
│   └── logstash/                 # 로그 수집 규칙 설정 폴더
│       └── logstash.conf         # 로그 수집 규칙(입력/필터/출력) 정의 파일
│
└── lucas-k8s/                    # [NEW] Kubernetes 관련 설정 및 키 보관
    └── join-command.txt          # 워커 노드 조인 명령어 (여기 보관하는 게 더 적절합니다!)
```