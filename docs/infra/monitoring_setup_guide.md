# 종합 모니터링 인프라 구축 가이드 (Prometheus + Grafana)

본 문서는 운영, 예비, Redis, 로깅 서버 및 외부 서비스(RDS)를 모두 포함하는 포괄적인 모니터링 시스템 구축 가이드입니다.

---

## 1. 전체 아키텍처 구성

| 서버 명칭 | 역할 | 설치 대상 (Exporter 및 툴) | 수집 대상 / 포트 |
| :--- | :--- | :--- | :--- |
| **운영 서버** | 메인 Spring Boot 서비스 | `node-exporter`, `cadvisor` | 인프라(9100), 컨테이너(9080), Spring(18081) |
| **예비 서버** | 스탠바이 Spring Boot 서비스 | `node-exporter`, `cadvisor` | 인프라(9100), 컨테이너(9080), Spring(18081) |
| **Redis 서버** | Redis (Docker) 실행 | `node-exporter`, `cadvisor`, `redis_exporter` | 인프라(9100), 컨테이너(9080), Redis(9121) |
| **로깅 서버** | 모니터링 중앙 관리 | **Prometheus, Grafana, Pushgateway**, <br> `blackbox_exporter`, `postgres_exporter`, `node-exporter`, `cadvisor` | 외부 API(9115), RDS(9187), 인프라(9100), 컨테이너(9080) |
| **RDS (PostgreSQL)** | 메인 데이터베이스 | (설치 불필요, 로깅 서버에서 원격 수집) | 5432 (PostgreSQL 기본 포트) |

---

## [보안 강화] RDS 모니터링 전용 계정 설정 (권장)

운영 DB의 마스터 계정 정보를 직접 노출하지 않기 위해, 지표 조회 권한만 있는 전용 유저를 생성하여 사용하는 것을 강력히 권장합니다.

1. **RDS(PostgreSQL) 접속 후 아래 SQL 실행:**
```sql
-- 1. 모니터링 전용 유저 'exporter' 생성
CREATE USER exporter WITH PASSWORD '원하는_비밀번호';

-- 2. 시스템 지표 조회를 위한 권한 부여 (PostgreSQL 10 이상)
GRANT pg_monitor TO exporter;
```

2. **환경 변수 파일(`.env`) 생성:**
로깅 서버의 `docker-compose.yml`과 같은 위치에 `.env` 파일을 만들고 아래 내용을 관리합니다. (Git 관리 대상에서 제외 권장)
```properties
POSTGRES_EXPORTER_USER=exporter
POSTGRES_EXPORTER_PASSWORD=발급한_비밀번호
RDS_HOSTNAME=RDS_엔드포인트_주소
RDS_DB_NAME=데이터베이스명
```

---

## 2. 서버 간 통신 전략 및 네트워크 보안 설정

현재 인프라가 여러 AWS 계정에 분산되어 있으므로(크로스 계정 환경), 트래픽 비용 절감과 보안을 동시에 잡을 수 있는 **하이브리드(Hybrid) 통신 방식**을 적용합니다.

### 2-1. 하이브리드 네트워크 아키텍처
* **계정 2 내부 통신 (로깅 서버 ↔ 예비 서버, RDS):** 같은 VPC 내부에 위치하므로 **Private IP**로 통신하여 데이터 전송(Egress) 비용을 없애고 보안을 강화합니다.
* **계정 간 통신 (로깅 서버 ➡️ 계정 1 운영 서버, 계정 3 Redis):** **Public IP**로 통신하되, 대상 서버의 방화벽(Security Group) 인바운드 규칙에서 **오직 로깅 서버의 고정 IP만 허용**하도록 `/32`로 꽉 잠급니다.

### 2-2. [필수] 로깅 서버에 Elastic IP(고정 IP) 할당
타 계정의 방화벽 규칙이 변동되지 않도록 로깅 서버(Prometheus)는 절대 바뀌지 않는 Public IP를 가져야 합니다.
1. 계정 2의 **AWS 콘솔 -> EC2 대시보드**로 이동합니다.
2. 좌측 메뉴에서 **[네트워크 및 보안] -> [탄력적 IP (Elastic IPs)]**를 클릭합니다.
3. 우측 상단의 **[탄력적 IP 주소 할당]**을 누르고 바로 화면 하단의 **[할당]**을 클릭하여 IP를 발급받습니다.
4. 발급된 IP를 선택하고 우측 상단의 **[작업] -> [탄력적 IP 주소 연결]**을 클릭합니다.
5. 리소스 유형으로 '인스턴스'를 선택한 뒤, 검색창에서 **로깅 서버 EC2**를 골라 **[연결]**합니다.

### 2-3. 방화벽 인바운드 규칙 설정 (택 1)
Prometheus(로깅 서버)가 대상 서버의 메트릭 포트로 접근할 수 있도록 방화벽을 뚫어줍니다. 본인의 권한 상황에 맞는 방법을 선택하세요.

---

#### [방법 A] AWS Security Group 설정 (권장: 인프라 단에서 차단)
AWS 콘솔 웹 화면에서 직접 설정하거나, AWS CLI 권한이 있는 경우 아래 커맨드를 실행합니다.

> **변수 설명:** 
> - `$LOGGING_SERVER_EIP`: 로깅 서버의 Elastic IP (타 계정용)
> - `$LOGGING_SERVER_PRIVATE_IP`: 로깅 서버의 Private IP (계정 2 내부용)
> - `$PROD_SG_ID`, `$REDIS_SG_ID`, `$STANDBY_SG_ID`, `$RDS_SG_ID`: 각 서버의 보안 그룹 ID

```bash
# [계정 1/3] 운영 및 Redis 서버 - 로깅 서버의 고정 Public IP(EIP)만 허용
# 1. 운영 서버 전용 (OS, 컨테이너, Spring Boot)
aws ec2 authorize-security-group-ingress --group-id $PROD_SG_ID --protocol tcp --port 9100 --cidr $LOGGING_SERVER_EIP/32
aws ec2 authorize-security-group-ingress --group-id $PROD_SG_ID --protocol tcp --port 9080 --cidr $LOGGING_SERVER_EIP/32
aws ec2 authorize-security-group-ingress --group-id $PROD_SG_ID --protocol tcp --port 18081 --cidr $LOGGING_SERVER_EIP/32

# 2. Redis 서버 전용 (OS, 컨테이너, Redis)
aws ec2 authorize-security-group-ingress --group-id $REDIS_SG_ID --protocol tcp --port 9100 --cidr $LOGGING_SERVER_EIP/32
aws ec2 authorize-security-group-ingress --group-id $REDIS_SG_ID --protocol tcp --port 9080 --cidr $LOGGING_SERVER_EIP/32
aws ec2 authorize-security-group-ingress --group-id $REDIS_SG_ID --protocol tcp --port 9121 --cidr $LOGGING_SERVER_EIP/32

# [계정 2] 예비 서버 및 RDS - 로깅 서버의 Private IP만 허용
# 1. 예비 서버 전용 (OS, 컨테이너, Spring Boot)
aws ec2 authorize-security-group-ingress --group-id $STANDBY_SG_ID --protocol tcp --port 9100 --cidr $LOGGING_SERVER_PRIVATE_IP/32
aws ec2 authorize-security-group-ingress --group-id $STANDBY_SG_ID --protocol tcp --port 9080 --cidr $LOGGING_SERVER_PRIVATE_IP/32
aws ec2 authorize-security-group-ingress --group-id $STANDBY_SG_ID --protocol tcp --port 18081 --cidr $LOGGING_SERVER_PRIVATE_IP/32

# 2. RDS (PostgreSQL) 전용
aws ec2 authorize-security-group-ingress --group-id $RDS_SG_ID --protocol tcp --port 5432 --cidr $LOGGING_SERVER_PRIVATE_IP/32
```

---

#### [방법 B] OS 레벨 방화벽 (ufw) 설정 (AWS 콘솔 접근 권한이 없을 때)
AWS 보안 그룹이 이미 넓게 열려 있거나(예: 1024~65535 허용), 인프라 권한이 없어 서버 내부에서 보안을 챙겨야 할 때 사용합니다.

```bash
# 운영/예비/Redis 서버 내부에서 실행
# 1. 로깅 서버 IP로부터의 모니터링 포트만 정밀 허용
sudo ufw allow from [로깅_서버_IP] to any port 9100 proto tcp
sudo ufw allow from [로깅_서버_IP] to any port 9080 proto tcp
sudo ufw allow from [로깅_서버_IP] to any port 18081 proto tcp # 운영/예비 전용
sudo ufw allow from [로깅_서버_IP] to any port 9121 proto tcp # Redis 전용

# 2. 기존 서비스 포트(SSH, HTTP 등)가 막히지 않도록 확인 필수!
sudo ufw allow 22/tcp
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp

# 3. 방화벽 활성화 및 적용
sudo ufw enable
sudo ufw reload
```

---

## 3. 타겟 서버(운영, 예비, Redis) 설치 가이드

타겟 서버들은 Docker Compose를 이용하여 `node-exporter`와 `cadvisor`를 백그라운드로 실행합니다.

### 3-1. 공통 Exporter 설치 (운영, 예비 서버)

해당 서버에 접속하여 `docker-compose.monitor.yml` 파일을 생성합니다.

```yaml
# docker-compose.monitor.yml
version: '3.8'

services:
  node-exporter:
    image: prom/node-exporter:latest
    container_name: node-exporter
    restart: unless-stopped
    ports:
      - "9100:9100"
    volumes:
      - /proc:/host/proc:ro
      - /sys:/host/sys:ro
      - /:/rootfs:ro
    command:
      - '--path.procfs=/host/proc'
      - '--path.rootfs=/rootfs'
      - '--path.sysfs=/host/sys'
      - '--collector.filesystem.mount-points-exclude=^/(sys|proc|dev|host|etc)($$|/)'

  cadvisor:
    image: gcr.io/cadvisor/cadvisor:latest
    container_name: cadvisor
    restart: unless-stopped
    ports:
      - "9080:8080" # 포트 충돌 방지를 위해 9080 사용
    volumes:
      - /:/rootfs:ro
      - /var/run:/var/run:ro
      - /sys:/sys:ro
      - /var/lib/docker/:/var/lib/docker:ro
      - /dev/disk/:/dev/disk:ro
```

**실행 커맨드:**
```bash
docker compose -f docker-compose.monitor.yml up -d
```

### 3-2. Redis 서버 전용 설치

Redis 서버는 공통 Exporter에 추가로 `redis_exporter`가 필요합니다. 기존 Redis Docker Compose 파일에 아래 항목을 추가하거나, 모니터링용 Compose에 함께 묶습니다.

```yaml
# docker-compose.redis-monitor.yml
version: '3.8'

services:
  # (이곳에 기존 redis 서비스가 있다고 가정합니다)
  
  node-exporter:
    image: prom/node-exporter:latest
    container_name: node-exporter
    restart: unless-stopped
    ports:
      - "9100:9100"
    volumes:
      - /proc:/host/proc:ro
      - /sys:/host/sys:ro
      - /:/rootfs:ro
    command:
      - '--path.procfs=/host/proc'
      - '--path.rootfs=/rootfs'
      - '--path.sysfs=/host/sys'
      - '--collector.filesystem.mount-points-exclude=^/(sys|proc|dev|host|etc)($$|/)'

  cadvisor:
    image: gcr.io/cadvisor/cadvisor:latest
    container_name: cadvisor
    restart: unless-stopped
    ports:
      - "9080:8080" # 포트 충돌 방지를 위해 9080 사용
    volumes:
      - /:/rootfs:ro
      - /var/run:/var/run:ro
      - /sys:/sys:ro
      - /var/lib/docker/:/var/lib/docker:ro
      - /dev/disk/:/dev/disk:ro
  
  redis_exporter:
    image: oliver006/redis_exporter:latest
    container_name: redis_exporter
    restart: unless-stopped
    ports:
      - "9121:9121"
    environment:
      # 같은 docker-compose 네트워크에 있는 redis 컨테이너를 가리킴
      - REDIS_ADDR=redis:6379 
      - REDIS_PASSWORD=your_redis_password # 비밀번호가 있을 경우
```

---

## 4. 로깅 서버 (중앙 수집기) 설치 가이드

로깅 서버는 메트릭을 수집하고 저장 및 시각화하는 핵심 컴포넌트를 모두 포함합니다.

### 4-1. Prometheus 설정 파일 생성

로깅 서버의 특정 디렉토리(예: `/opt/monitoring`)를 만들고 `prometheus.yml`을 작성합니다.

```bash
mkdir -p /opt/monitoring
cd /opt/monitoring
vi prometheus.yml
```

**`prometheus.yml` 내용:**
```yaml
global:
  scrape_interval: 15s # 15초마다 데이터 수집

scrape_configs:
  # 인프라 모니터링
  - job_name: 'node-exporter'
    static_configs:
      - targets: 
        - '운영서버IP:9100'
        - '예비서버IP:9100'
        - 'Redis서버IP:9100'
        - '로깅서버IP:9100' # 자기 자신도 모니터링

  # 컨테이너 모니터링
  - job_name: 'cadvisor'
    static_configs:
      - targets: 
        - '운영서버IP:9080'
        - '예비서버IP:9080'
        - 'Redis서버IP:9080'
        - '로깅서버IP:9080'

  # Spring Boot 애플리케이션 모니터링
  - job_name: 'spring-boot'
    metrics_path: '/actuator/prometheus'
    static_configs:
      - targets: 
        - '운영서버IP:18081'
        - '예비서버IP:18081'

  # Redis 모니터링
  - job_name: 'redis_exporter'
    static_configs:
      - targets: ['Redis서버IP:9121']

  # PostgreSQL 모니터링 (아래 4-2에서 띄울 로컬 컨테이너)
  - job_name: 'postgres_exporter'
    static_configs:
      - targets: ['로깅서버IP:9187']

  # 외부 API 상태 체크 (Blackbox)
  - job_name: 'blackbox_http'
    metrics_path: /probe
    params:
      module: [http_2xx]
    static_configs:
      - targets: 
        - 'https://우리의-서비스-도메인.com'          # 프론트엔드 도메인
        - 'https://api.우리의-도메인.com/health'  # 백엔드 API 헬스체크 주소
    relabel_configs:
      - source_labels: [__address__]
        target_label: __param_target
      - target_label: __address__
        replacement: '로깅서버IP:9115'
```

### 4-2. 로깅 서버 Docker Compose 생성

동일한 디렉토리에 `docker-compose.yml`을 작성합니다.

```yaml
# docker-compose.yml
version: '3.8'

services:
  prometheus:
    image: prom/prometheus:latest
    container_name: prometheus
    restart: unless-stopped
    ports:
      - "9090:9090"
    volumes:
      - ./prometheus.yml:/etc/prometheus/prometheus.yml
      - prometheus_data:/prometheus
    command:
      - '--config.file=/etc/prometheus/prometheus.yml'
      - '--storage.tsdb.path=/prometheus'
      - '--storage.tsdb.retention.time=30d' # 30일 보관

  grafana:
    image: grafana/grafana:latest
    container_name: grafana
    restart: unless-stopped
    ports:
      - "3000:3000"
    volumes:
      - grafana_data:/var/lib/grafana
    environment:
      - GF_SECURITY_ADMIN_PASSWORD=admin # 초기 비밀번호 변경 필요

  pushgateway:
    image: prom/pushgateway:latest
    container_name: pushgateway
    restart: unless-stopped
    ports:
      - "9091:9091"

  postgres_exporter:
    image: prometheuscommunity/postgres-exporter
    container_name: postgres_exporter
    restart: unless-stopped
    ports:
      - "9187:9187"
    environment:
      # .env 파일의 변수를 사용하여 보안 강화
      - DATA_SOURCE_NAME=postgresql://${POSTGRES_EXPORTER_USER}:${POSTGRES_EXPORTER_PASSWORD}@${RDS_HOSTNAME}:5432/${RDS_DB_NAME}?sslmode=disable

  blackbox_exporter:
    image: prom/blackbox-exporter:latest
    container_name: blackbox_exporter
    restart: unless-stopped
    ports:
      - "9115:9115"

  # 로깅 서버 자체 모니터링을 위한 node-exporter와 cadvisor 생략 (3-1과 동일하게 추가 권장)

volumes:
  prometheus_data:
  grafana_data:
```

**실행 커맨드:**
```bash
docker compose up -d
```

---

## 5. Spring Boot Actuator 설정 (운영/예비 서버)

애플리케이션 코드의 `application.yml`에 포트 분리와 Prometheus 노출 설정을 추가합니다.

```yaml
# application.yml
management:
  server:
    port: 18081 # 애플리케이션의 8080과 충돌 및 외부 노출을 막기 위해 분리
  endpoints:
    web:
      exposure:
        include: prometheus, health, info
  metrics:
    tags:
      application: lucas-backend # 식별용 태그
```

---

## 6. 단계별 점검 및 테스트 방법 (성공 여부 확인)

모든 설치를 마친 후, 아래 순서대로 시스템이 정상 작동하는지 반드시 확인해야 합니다.

### 6-1. 1단계: Exporter 네트워크 통신 확인
로깅 서버(Prometheus) 터미널에 접속하여 각 타겟 서버의 데이터가 넘어오는지 `curl`로 테스트합니다.

```bash
# 1. 인프라 지표 (Node Exporter) 확인
curl http://운영서버_Public_IP:9100/metrics

# 2. 컨테이너 지표 (cAdvisor) 확인
curl http://운영서버_Public_IP:9080/metrics

# 3. Spring Boot 지표 (Actuator) 확인
curl http://운영서버_Public_IP:18081/actuator/prometheus

# 4. Redis 지표 확인
curl http://Redis서버_Public_IP:9121/metrics
```
*   **성공 시:** `# HELP ...`, `# TYPE ...` 으로 시작하는 수많은 텍스트 데이터가 화면에 쏟아집니다.
*   **실패 시 (Connection Timeout):** 보안 그룹(SG) 혹은 ufw 설정이 잘못되어 패킷이 차단된 것입니다.
*   **실패 시 (Connection Refused):** 대상 서버에서 Docker 컨테이너가 떠 있지 않은 상태입니다.

---

### 6-2. 2단계: Prometheus Target 상태 확인
브라우저에서 Prometheus 웹 UI에 접속하여 모든 수집 대상이 정상(UP)인지 확인합니다.

1.  주소창에 `http://로깅서버_Public_IP:9090` 접속
2.  상단 메뉴에서 **Status -> Targets** 클릭
3.  모든 항목의 **State**가 **`UP`** (녹색) 인지 확인합니다.
    *   **`DOWN`**인 경우: `prometheus.yml`에 적은 IP/포트가 틀렸거나 1단계에서 확인한 통신 문제가 해결되지 않은 상태입니다.

---

### 6-3. 3단계: Grafana 대시보드 구성
데이터를 시각화하기 위해 대시보드를 임포트합니다.

1.  주소창에 `http://로깅서버_Public_IP:3030` 접속 (초기 ID/PW: `admin` / `admin`)
2.  **Connections -> Data Sources**에서 Prometheus를 추가합니다. (URL: `http://prometheus:9090`)
3.  **Dashboards -> New -> Import**에서 아래 추천 ID를 입력하여 불러옵니다.
    *   **Node Exporter (인프라):** `1860`
    *   **Docker 컨테이너 (cAdvisor):** `14282`
    *   **JVM/Spring Boot:** `11378`
    *   **Redis:** `11835`

---

## 💡 최종 해결 가이드 (Troubleshooting)

*   **Q: 데이터는 나오는데 Prometheus에서 계속 DOWN으로 떠요.**
    *   `prometheus.yml` 파일 수정 후 `docker compose restart prometheus`를 실행했는지 확인하세요.
*   **Q: 특정 서버의 Public IP가 바뀌었어요.**
    *   타겟 서버의 IP가 고정(Elastic IP)이 아닌 경우, IP가 바뀔 때마다 `prometheus.yml`을 수정해야 합니다. (운영 서버는 꼭 고정 IP를 사용하세요.)
*   **Q: .env 파일의 비밀번호가 적용이 안 되는 것 같아요.**
    *   `.env` 파일을 수정했다면 `docker compose up -d`를 다시 실행하여 컨테이너를 재생성해야 설정이 반영됩니다.
