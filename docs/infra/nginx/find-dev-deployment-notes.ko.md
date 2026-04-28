# Find 개발 서버 라우팅 정리

마지막 업데이트: 2026-04-28 UTC

## 요약

개발 서버 트래픽은 ALB를 거치지 않고 `worker-ssafy` 노드의 호스트 Nginx에서 직접 라우팅한다.

현재 접속 주소:

| URL                          | 대상     | 설명                      |
| ---------------------------- | -------- | ------------------------- |
| `https://dev.find.me.kr`     | frontend | 개발용 프론트엔드         |
| `https://dev.find.me.kr/api` | backend  | 경로 기반 백엔드 프록시   |
| `https://dev.api.find.me.kr` | backend  | 개발용 백엔드 전용 도메인 |

이 개발 환경은 의도적으로 Tailscale을 통해서만 접근하도록 구성했다. 위 도메인을 사용하려면 접속하는 PC가 같은 Tailscale tailnet에 연결되어 있어야 한다.

## 접근 모델

현재 공개 DNS 레코드는 `worker-ssafy`의 Tailscale IP를 가리킨다.

```text
dev.find.me.kr      A 100.114.155.48
dev.api.find.me.kr  A 100.114.155.48
```

`100.114.155.48`은 일반 공인 인터넷 IP가 아니라 `worker-ssafy`의 Tailscale IP다.

따라서 접속 가능 여부는 아래와 같다.

| 클라이언트                                 | 예상 결과             |
| ------------------------------------------ | --------------------- |
| 같은 tailnet에 Tailscale로 연결된 팀원 PC  | 개발 도메인 접속 가능 |
| Tailscale이 꺼져 있거나 로그아웃된 팀원 PC | 개발 도메인 접속 불가 |
| 일반 외부 인터넷 사용자                    | 개발 도메인 접속 불가 |

현재 Tailscale 정보:

```text
worker-ssafy Tailscale IP: 100.114.155.48
MagicDNS 이름: worker-ssafy.tail4d2ec7.ts.net.
Tailnet 계정/조직: arin.kim0801@gmail.com
```

`worker-ssafy`의 Kubernetes kubelet도 Tailscale IP를 노드 IP로 사용하고 있다.

```text
kubelet --hostname-override=worker-ssafy --node-ip=100.114.155.48
```

Tailscale을 임의로 중단하거나 제거하면 안 된다. Tailscale이 꺼져 있는 동안 master가 worker 노드에 접근하지 못해서 클러스터 상태가 흔들릴 수 있다.

## Tailscale 런타임 상태

2026-04-28 18:57 UTC 기준으로 `worker-ssafy`에서 확인한 상태다.

서비스 상태:

```text
tailscaled.service: active (running)
systemd 자동 시작: enabled
시작 시각: 2026-04-27 08:12:17 UTC
state file: /var/lib/tailscale/tailscaled.state
local socket: /run/tailscale/tailscaled.sock
WireGuard/UDP 포트: 41641
```

버전:

```text
Tailscale 버전: 1.96.4
Long version: 1.96.4-t8cf541dfd-g62bc84ce7
Go 버전: go1.26.1
```

로컬 Tailscale 인터페이스:

```text
인터페이스: tailscale0
상태: UP, LOWER_UP
mtu: 1280
IPv4: 100.114.155.48/32
IPv6: fd7a:115c:a1e0::e36:9b30/128
```

`tailscaled`는 아래 UDP 포트에서 listen 중이다.

```text
0.0.0.0:41641/udp
[::]:41641/udp
```

Tailscale이 인식한 주요 호스트 네트워크:

```text
공개 endpoint 후보: 3.35.17.97:41641
private host IP: 172.26.1.49
default gateway: 172.26.0.1
```

Tailscale DNS/MagicDNS:

```text
MagicDNS 사용: yes
MagicDNS suffix: tail4d2ec7.ts.net
Tailscale DNS server: 100.100.100.100
IPv6 DNS server: fd7a:115c:a1e0::53
```

서버에서 확인한 MagicDNS 이름 해석 결과:

| 이름                                | IP               |
| ----------------------------------- | ---------------- |
| `worker-ssafy.tail4d2ec7.ts.net`    | `100.114.155.48` |
| `master.tail4d2ec7.ts.net`          | `100.119.163.18` |
| `worker1-1.tail4d2ec7.ts.net`       | `100.116.188.57` |
| `desktop-6oo0p6f.tail4d2ec7.ts.net` | `100.75.160.35`  |

현재 peer 상태:

| Peer              | IP               | OS      | 상태                  |
| ----------------- | ---------------- | ------- | --------------------- |
| `worker-ssafy`    | `100.114.155.48` | linux   | 현재 노드             |
| `master`          | `100.119.163.18` | linux   | active, direct        |
| `worker1-1`       | `100.116.188.57` | linux   | active, direct        |
| `desktop-6oo0p6f` | `100.75.160.35`  | windows | 확인 시점에는 offline |

연결 확인 결과:

```text
tailscale ping master    -> pong via 13.124.102.21:41641 in 1ms
tailscale ping worker1-1 -> pong via 54.116.42.58:41641 in 1ms
tailscale ping desktop-6oo0p6f -> Windows peer가 offline이라 timeout
```

네트워크 체크 결과:

```text
UDP: true
IPv4: yes, 3.35.17.97:45168
IPv6: no, OS 지원은 있음
Captive portal: false
가장 가까운 DERP: Tokyo
Tokyo DERP latency: 약 30.7ms
```

라우팅:

```text
Tailscale policy table: 52
100.75.160.35  dev tailscale0
100.100.100.100 dev tailscale0
100.116.188.57 dev tailscale0
100.119.163.18 dev tailscale0
```

관련 policy rule:

```text
5270: from all lookup 52
32766: from all lookup main
32767: from all lookup default
```

현재 Tailscale 설정 요약:

```text
WantRunning: true
LoggedOut: false
CorpDNS: true
RouteAll: false
ExitNode: none
RunSSH: false
AdvertiseRoutes: none
AdvertiseServices: none
ShieldsUp: false
AutoUpdate: enabled
```

Tailscale Serve/Funnel:

```text
tailscale serve status  -> No serve config
tailscale funnel status -> No serve config
```

즉 Tailscale 자체가 HTTP 트래픽을 serve 하거나 public funnel로 공개하고 있는 상태가 아니다. HTTP/HTTPS 서비스는 여전히 호스트 Nginx가 담당하고, Tailscale은 해당 호스트에 도달하기 위한 사설 네트워크 경로만 제공한다.

Tailscale 확인에 유용한 명령어:

```bash
tailscale version
tailscale status
tailscale status --json
tailscale ip -4
tailscale ip -6
tailscale netcheck
tailscale debug prefs
tailscale ping master
tailscale ping worker1-1
systemctl status tailscaled --no-pager -l
journalctl -u tailscaled -n 50 --no-pager
ip addr show tailscale0
ip rule show
ip route show table 52
resolvectl status tailscale0
sudo ss -lunp | grep 41641
```

팀원이 `https://dev.find.me.kr`에 접속하지 못하면, 먼저 해당 팀원의 PC에서 아래를 확인한다.

```bash
tailscale status
tailscale ip -4
ping 100.114.155.48
```

Windows에서는 Tailscale 트레이 앱이 같은 tailnet에 연결된 상태여야 한다. 서버의 `tailscale status`에서 Windows 장비가 `offline`으로 보이면 DNS가 맞아도 해당 PC 브라우저에서는 접속되지 않는다.

짧은 테스트를 위해 Tailscale을 잠깐 내려야 한다면, 자동 재시작을 예약한 뒤 중단하는 방식을 권장한다.

```bash
sudo systemd-run --unit=restart-tailscaled --on-active=60s /usr/bin/systemctl start tailscaled
sudo systemctl stop tailscaled
```

이 방식은 기존 state file을 유지하므로 `tailscaled`가 다시 시작될 때 보통 같은 노드 identity로 복구된다. tailnet에서 의도적으로 노드를 분리하려는 목적이 아니라면 `tailscale down`은 피한다.

## Kubernetes Service

Namespace: `dev`

현재 Service NodePort:

| Service    |    Port | NodePort | 용도             |
| ---------- | ------: | -------: | ---------------- |
| `frontend` |    `80` |  `30116` | frontend HTTP    |
| `backend`  |  `8080` |  `32220` | backend HTTP API |
| `backend`  | `18081` |  `31269` | monitoring       |

확인 명령:

```bash
sudo kubectl --kubeconfig=/etc/kubernetes/kubelet.conf get svc -n dev frontend backend -o yaml
```

현재 live Service spec에는 위 NodePort 값이 들어 있다. 다만 확인 당시 `last-applied-configuration`에는 명시적인 `nodePort` 값이 없었다. 원본 manifest에 `nodePort`를 명시하지 않은 상태에서 Service를 삭제 후 재생성하면 포트가 바뀔 수 있다.

권장 후속 작업:

```yaml
nodePort: 30116 # frontend
nodePort: 32220 # backend http
nodePort: 31269 # backend monitoring, if needed
```

## Nginx

Nginx는 `worker-ssafy` 호스트에서 직접 실행된다.

주요 파일:

```text
/etc/nginx/sites-available/find-dev
/etc/nginx/sites-enabled/find-dev -> /etc/nginx/sites-available/find-dev
/etc/nginx/sites-available/find-dev.bak-20260428-https
```

현재 동작:

```text
HTTP 80  -> HTTPS로 redirect
HTTPS 443 dev.find.me.kr      -> frontend NodePort 30116
HTTPS 443 dev.find.me.kr/api  -> backend NodePort 32220
HTTPS 443 dev.api.find.me.kr  -> backend NodePort 32220
```

검증 명령:

```bash
sudo nginx -t
sudo systemctl reload nginx
sudo ss -lntp | grep ':443 '
```

응답 확인:

```bash
curl -i http://dev.find.me.kr/
curl -i https://dev.find.me.kr/
curl -i https://dev.find.me.kr/api
curl -i https://dev.api.find.me.kr/
```

HTTPS 적용 후 확인된 결과:

```text
http://dev.find.me.kr/       -> 301 https://dev.find.me.kr/
https://dev.find.me.kr/      -> frontend HTML 200
https://dev.find.me.kr/api   -> backend 응답, 현재는 / 로 302 redirect
https://dev.api.find.me.kr/  -> backend OK 200
```

`/api`의 302는 Nginx가 아니라 백엔드 애플리케이션에서 발생한다. backend NodePort를 직접 호출했을 때도 동일하게 302가 반환됐다.

## TLS 인증서

Certbot DNS-01 수동 인증으로 인증서 발급을 완료했다.

인증서 경로:

```text
/etc/letsencrypt/live/find-dev/fullchain.pem
/etc/letsencrypt/live/find-dev/privkey.pem
```

만료일:

```text
2026-07-27
```

중요: 이 인증서는 Certbot `--manual` DNS 인증으로 발급했고 auth hook을 설정하지 않았기 때문에 자동 갱신되지 않는다.

## 인증서 갱신 절차

`2026-07-27` 전에 아래 절차로 갱신해야 한다.

갱신 시작:

```bash
sudo certbot certonly --manual --preferred-challenges dns \
  --cert-name find-dev \
  -d dev.find.me.kr \
  -d dev.api.find.me.kr
```

Certbot은 도메인별 TXT 레코드 값을 출력한다. 출력된 값을 가비아 DNS에 추가한다.

`dev.find.me.kr`용 레코드:

```text
타입: TXT
호스트: _acme-challenge.dev
값: <Certbot이 dev.find.me.kr용으로 출력한 값>
TTL: 600
```

`dev.api.find.me.kr`용 레코드:

```text
타입: TXT
호스트: _acme-challenge.dev.api
값: <Certbot이 dev.api.find.me.kr용으로 출력한 값>
TTL: 600
```

가비아에서는 `확인`만 누르면 부족하다. DNS zone에 실제 반영되도록 마지막 `저장` 버튼까지 눌러야 한다.

Certbot 터미널에서 Enter를 누르기 전에, 두 TXT 레코드가 외부 DNS에서 조회되는지 확인한다.

```bash
nslookup -type=TXT _acme-challenge.dev.find.me.kr 8.8.8.8
nslookup -type=TXT _acme-challenge.dev.api.find.me.kr 8.8.8.8
```

두 명령 모두 현재 Certbot 실행에서 출력된 값과 정확히 같은 값을 반환해야 한다.

Certbot 성공 후:

```bash
sudo nginx -t
sudo systemctl reload nginx
```

이후 접속 확인:

```bash
curl -i https://dev.find.me.kr/
curl -i https://dev.api.find.me.kr/
```

## 가비아 DNS 참고

`find.me.kr`의 authoritative nameserver는 가비아 nameserver다.

```text
ns.gabia.net
ns.gabia.co.kr
ns1.gabia.co.kr
```

DNS 확인에 유용한 명령:

```bash
nslookup -type=NS find.me.kr 8.8.8.8
nslookup dev.find.me.kr 8.8.8.8
nslookup dev.api.find.me.kr 8.8.8.8
nslookup -type=TXT _acme-challenge.dev.find.me.kr 8.8.8.8
nslookup -type=TXT _acme-challenge.dev.api.find.me.kr 8.8.8.8
```

Certbot이 `NXDOMAIN looking up TXT`를 출력하면, TXT 레코드가 아직 공개 DNS에서 보이지 않는 상태다. 아래를 확인한다.

1. 레코드를 `find.me.kr` zone 아래에 추가했는지 확인한다.
2. host 필드가 정확한지 확인한다.
3. 가비아의 최종 `저장` 버튼을 눌렀는지 확인한다.
4. TXT 값이 이전 실패 시도의 값이 아니라 현재 Certbot 실행에서 출력된 값인지 확인한다.
5. DNS 전파 시간이 충분히 지났는지 확인한다.

## OAuth 참고

이제 OAuth 테스트는 HTTPS URL 기준으로 진행해야 한다.

redirect URI 후보:

```text
https://dev.find.me.kr/<oauth-callback-path>
https://dev.api.find.me.kr/<oauth-callback-path>
```

정확한 callback path는 백엔드 보안 설정에 따라 달라진다. OAuth provider 콘솔에서는 보통 아래 항목이 정확히 일치해야 한다.

```text
scheme: https
host: dev.find.me.kr or dev.api.find.me.kr
path: exact callback path
```

테스트에 사용하는 브라우저가 실행되는 PC도 같은 Tailscale tailnet에 연결되어 있어야 한다. 두 개발 도메인이 모두 `100.114.155.48`로 해석되기 때문이다.

## Public IP와 NodePort 참고

`http://3.35.17.97:30116/`로 frontend에 접근할 수 있는 이유는 `30116`이 Kubernetes frontend NodePort이기 때문이다.

이 경로는 Nginx를 거치지 않는다.

```text
browser -> 3.35.17.97:30116 -> Kubernetes NodePort -> frontend Pod
```

우리가 의도한 개발 도메인 경로는 아래와 같다.

```text
browser -> dev.find.me.kr:443 -> worker-ssafy Nginx -> 127.0.0.1:30116 -> frontend Pod
```

private 개발 환경으로 운영하려면 public NodePort 직접 접근은 cloud/security-group/firewall 계층에서 막는 것이 이상적이다. 그렇지 않으면 사용자가 의도한 Tailscale/Nginx 진입점을 우회할 수 있다.

이전에 `3.35.17.97`의 public 80번 포트는 `worker-ssafy` Nginx로 연결되지 않았다. 그래서 `dev.find.me.kr -> 3.35.17.97` 형태의 public HTTP 구성은 동작하지 않았다. 현재 구성은 DNS가 Tailscale IP를 가리키도록 해서 이 문제를 피한다.

## 운영 체크리스트

문제가 생기면 아래 순서로 확인한다.

1. 클라이언트 PC가 Tailscale에 연결되어 있는지 확인한다.
2. DNS가 `100.114.155.48`로 해석되는지 확인한다.
3. Nginx가 443 포트에서 listen 중인지 확인한다.
4. 인증서가 아직 유효한지 확인한다.
5. NodePort가 여전히 `30116`, `32220`인지 확인한다.
6. `dev` namespace의 frontend/backend Pod가 정상인지 확인한다.
7. backend 애플리케이션 자체가 redirect나 error를 반환하는지 확인한다.

유용한 명령어:

```bash
tailscale version
tailscale status
tailscale ip -4
tailscale netcheck
getent ahostsv4 dev.find.me.kr
getent ahostsv4 dev.api.find.me.kr
systemctl status tailscaled --no-pager -l
sudo nginx -t
sudo systemctl status nginx
sudo ss -lntp | grep -E ':80 |:443 '
sudo kubectl --kubeconfig=/etc/kubernetes/kubelet.conf get svc -n dev frontend backend -o wide
```
