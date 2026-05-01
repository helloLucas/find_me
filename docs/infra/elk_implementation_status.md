# Lucas ELK 구현/검증 기록

## 1. 목적

- Kubernetes 환경에 ELK(Elasticsearch, Logstash, Kibana) + Filebeat 수집 파이프라인 구축
- `game-logs-*` 인덱스로 로그 적재 검증
- 이후 Spring 백엔드의 게임 이벤트 로그를 ELK로 연결할 수 있는 기반 마련

## 2. 이번 작업에서 실제로 한 것

### 2.1 Kubernetes 리소스 구성

`/home/ubuntu/lucas-elk` 아래에 ELK 관련 매니페스트를 구성했다.

- `k8s-namespace.yaml`
- `k8s-storageclass-gp3.yaml`
- `k8s-elasticsearch-statefulset.yaml`
- `k8s-elasticsearch-service.yaml`
- `k8s-logstash-configmap.yaml`
- `k8s-logstash-deployment.yaml`
- `k8s-logstash-service.yaml`
- `k8s-kibana-deployment.yaml`
- `k8s-kibana-service.yaml`
- `k8s-filebeat-configmap.yaml`
- `k8s-filebeat-daemonset.yaml`
- `k8s-manifests.yaml`

### 2.2 Logstash 파이프라인 수정

`[logstash.conf](/home/ubuntu/lucas-elk/logstash/logstash.conf)` 기준으로 다음을 반영했다.

- input: `beats` 5044 수신
- Elasticsearch 출력 인덱스를 `game-logs-%{+YYYY.MM.dd}`로 변경

현재 설정:

```conf
input {
  beats {
    port => 5044
  }
}

output {
  elasticsearch {
    hosts => ["http://elasticsearch:9200"]
    index => "game-logs-%{+YYYY.MM.dd}"
  }
}
```

### 2.3 Elasticsearch 영속 스토리지 구성

`[k8s-elasticsearch-statefulset.yaml](/home/ubuntu/lucas-elk/k8s-elasticsearch-statefulset.yaml)` 기준:

- StatefulSet + PVC 구성
- `storageClassName: gp3`
- EBS CSI 기반 동적 볼륨 사용
- `/usr/share/elasticsearch/data` 권한 문제 해결용 `initContainer` 추가

핵심 포인트:

- `initContainers.fix-permissions`
- `chown -R 1000:0 /usr/share/elasticsearch/data`

## 3. 트러블슈팅 기록

### 3.1 PVC Pending

초기에는 Elasticsearch PVC가 `Pending` 상태였고, 원인은 스토리지 클래스/CSI 구성이 없었기 때문이다.

조치:

- `gp3` StorageClass 생성
- AWS EBS CSI Driver 설치

### 3.2 AWS 권한 문제

이후 EBS 볼륨 동적 생성 시 `UnauthorizedOperation`이 발생했다.

원인:

- EC2 IAM 역할에 EBS CSI가 볼륨 생성할 권한이 없었음

조치:

- `AmazonEBSCSIDriverPolicy` 연결
- `ebs-csi-controller` 재시작

### 3.3 Elasticsearch 권한 오류

이후 Elasticsearch가 다음 오류로 CrashLoop 상태가 됐다.

- `AccessDeniedException: /usr/share/elasticsearch/data/nodes`

조치:

- StatefulSet에 `initContainer` 추가
- 데이터 경로 owner를 `1000:0`으로 변경

결과:

- `elasticsearch-0` 정상 기동
- Kibana도 정상 기동

## 4. 검증 결과

### 4.1 ELK 컴포넌트 상태

다음 상태를 확인했다.

- `elasticsearch-0` Running
- `logstash` Running
- `kibana` Running
- `filebeat` Running

### 4.2 Elasticsearch 정상 기동 확인

Elasticsearch 로그에서 다음을 확인했다.

- node initialized
- node started
- cluster health green 전환

### 4.3 Kibana 접근 확인

`kubectl port-forward -n lucas-elk svc/kibana 5601:5601` 후

```bash
curl -I http://127.0.0.1:5601
```

응답:

- `HTTP/1.1 302 Found`
- `location: /spaces/enter`

즉 Kibana 웹은 정상 응답 상태였다.

### 4.4 로그 적재 확인

Elasticsearch에서 `game-logs-*` 인덱스가 실제로 생성되고 문서가 조회되는 것까지 확인했다.

확인한 사실:

- `game-logs-2026.04.23` ~ `game-logs-2026.04.28` 인덱스 존재
- `_search` 결과로 실제 문서 반환
- 따라서 `Filebeat -> Logstash -> Elasticsearch` 파이프라인 자체는 동작함

## 5. 수집 범위 조정 작업

초기 Filebeat는 `/var/log/containers/*.log` 전체를 수집해서 다음 문제를 만들었다.

- `cert-manager`
- `kube-system`
- `tigera-operator`
- frontend health check

같은 인프라/운영 로그까지 전부 `game-logs-*`에 들어감

그래서 Filebeat 필터를 추가해 수집 범위를 줄이는 작업을 진행했다.

### 5.1 네임스페이스 필터

인프라 로그가 너무 많이 들어와서 먼저 네임스페이스 기준 필터를 적용했다.

그 결과:

- `kube-system`, `tigera-operator` 등은 제외되는 방향으로 개선
- 최신 조회에서는 `prod` 로그만 보이는 상태까지 확인

### 5.2 앱 라벨 필터

그 다음에는 `prod` 전체가 아니라 백엔드 앱 로그만 받도록 좁혀야 했다.

현재 파일 `[k8s-filebeat-configmap.yaml](/home/ubuntu/lucas-elk/k8s-filebeat-configmap.yaml)` 에는 다음 필터가 들어 있다.

```yaml
- drop_event:
    when:
      not:
        and:
          - equals:
              kubernetes.namespace: "prod"
          - equals:
              kubernetes.labels.app: "backend"
```

하지만 실제 `prod` 네임스페이스 파드 라벨 확인 결과는 아래였다.

- backend pod: `app=backend`
- frontend pod: `app=frontend`

초기에는 `lucas-backend`로 적어 두었지만, 실제 라벨 확인 후 `backend`로 수정했다.

정리:

- 의도: backend 로그만 수집
- 실제 prod pod 라벨: `app=backend`
- 현재 filebeat 설정: `app=backend`
- 따라서 `frontend` 로그는 제외되고 backend 로그만 수집 대상이 된다

최종 적용 설정:

```yaml
- drop_event:
    when:
      not:
        and:
          - equals:
              kubernetes.namespace: "prod"
          - equals:
              kubernetes.labels.app: "backend"
```

## 6. 현재 시점 결론

### 6.1 ELK 연결은 됐는가?

됐다.

정확히는 아래 연결이 검증됐다.

- Filebeat -> Logstash
- Logstash -> Elasticsearch
- Kibana -> Elasticsearch
- Kibana 웹 접근 가능
- Elasticsearch에 실제 문서 적재됨

즉 ELK 스택 자체와 K8s 내부 연결은 정상 동작한다고 봐도 된다.

### 6.2 백엔드 서버와 ELK 연결은 됐는가?

아직 완전히 됐다고 보기 어렵다.

이유:

- 현재 들어오는 로그는 "게임 이벤트용 구조화 로그"가 아니라 컨테이너 stdout 로그 위주
- Spring 백엔드가 `session_id`, `node_id`, `action_type`, `result` 같은 게임 분석용 JSON 로그를 아직 명시적으로 남기지 않음
- Filebeat 앱 필터는 현재 실제 prod backend 라벨(`app=backend`)에 맞춰 수정 완료됨

즉 지금 상태는:

- ELK 인프라/수집 파이프라인: 완료
- 백엔드 게임 로그 스키마 연동: 미완료

## 7. 남은 작업

### 7.1 Filebeat 앱 라벨 필터 수정

완료:

- `kubernetes.labels.app: "backend"` 로 수정

남은 확인:

- rollout 후 최신 수집 로그가 실제 backend pod에서만 들어오는지 확인

### 7.2 Spring 백엔드 로그 구조화

백엔드에서 다음 필드를 JSON 로그로 남기도록 정리 필요:

- `timestamp`
- `session_id`
- `user_id`
- `node_id`
- `action_type`
- `input_value`
- `result`
- `from_node_id`
- `to_node_id`

### 7.3 Kibana Data View/시각화

- Data View: `game-logs-*`
- Discover 확인
- action/result/node/session 중심 시각화 구성

## 8. 한 줄 요약

ELK 자체 연결과 로그 적재 파이프라인은 정상이다.  
아직 안 끝난 것은 "Spring 백엔드가 게임용 구조화 로그를 원하는 스키마로 ELK에 흘려보내는 작업"이다.
