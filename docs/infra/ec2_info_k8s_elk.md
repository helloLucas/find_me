# AWS EC2 인스턴스 구축 명세서 (K8s Master Node, ELK Stack, Prometheus/Grafana)

## 1. 기본 정보
- **인스턴스 이름**: `lucas-ops-mgmt-apne2a-001`
- **프로젝트**: lucas
- **환경**: 운영 지원 (ops) / 관리&모니터링 (mgmt)
- **용도**: Kubernetes Master Node, ELK Stack (로그 수집), Prometheus/Grafana (모니터링)

## 2. 인스턴스 사양
- **인스턴스 유형**: `c6i.2xlarge` (8 vCPU, 16 GiB RAM)
- **AMI (OS)**: `Ubuntu Server 22.04 LTS (HVM), SSD Volume Type` (64-bit x86)
- **테넌시**: 공유 (Shared) : default
- **구매 옵션**: 온디맨드 (On-Demand) : default
- **예상 비용**: 월 약 $280.32

## 3. 네트워크 및 보안 설정
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

## 4. 스토리지 설정
- **볼륨 크기**: `100 GiB`
- **볼륨 유형**: `gp3` (General Purpose SSD)
- **종료 시 삭제**: 예 (Yes)
- **암호화**: 기본값 (Not Encrypted)

## 5. 고급 세부 정보
- **종료 방지**: 활성화 (Enabled)
- **중지 방지**: 활성화 (Enabled)
- **모니터링**: 기본 모니터링 (5분 간격, 무료)
- **EBS 최적화**: 활성화 (Enabled)

## 6. 사후 관리 및 최적화 가이드
1. **키 페어**: 생성한 `.pem` 파일을 안전한 곳에 보관 (분실 시 재발급 불가).
2. **메모리 최적화**: 16GB RAM 효율을 위해 약 4~8GB의 **Swap 메모리** 설정을 권장.
3. **ELK 설정**: ElasticSearch 실행을 위해 `vm.max_map_count` 커널 파라미터 수정 필요.
4. **보안 강화**: 운영 서버(`gp-prod-main`) 생성 후 6443, 5044 포트의 소스를 해당 서버의 프라이빗 IP로 제한할 것.