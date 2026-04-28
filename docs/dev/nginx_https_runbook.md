# Nginx + HTTPS 운영 런북 최종본 (EC2, 프론트엔드만 외부 공개)

## 1. 목표

- 외부 사용자는 도메인을 통해 프론트엔드에만 접근할 수 있어야 한다.
- 백엔드는 같은 EC2에서 동작하지만 인터넷에서 직접 접근되면 안 된다.
- https://your-domain 접속 시 HTTPS가 정상 동작해야 한다.

## 2. 목표 아키텍처

- Internet -> Nginx (80, 443)
- Nginx가 / 경로를 프론트엔드(localhost:3667)로 프록시
- Nginx가 /api 경로만 백엔드(localhost:8888)로 프록시
- 백엔드 포트는 외부에 공개하지 않음

## 3. 사전 조건

- 도메인 A 레코드가 EC2 공인 IP를 가리켜야 한다.
- EC2 보안 그룹 인바운드는 아래만 허용한다.
  - 80/tcp from 0.0.0.0/0
  - 443/tcp from 0.0.0.0/0
- 프론트엔드 포트(3667)와 백엔드 포트(8888)는 보안 그룹에서 열지 않는다.
- 프론트엔드/백엔드 컨테이너는 127.0.0.1로만 바인딩한다.

## 4. Nginx와 Certbot 설치 (Ubuntu 예시)

1. 패키지 설치

   sudo apt update
   sudo apt install -y nginx certbot python3-certbot-nginx

2. nginx 활성화 및 시작

   sudo systemctl enable nginx
   sudo systemctl start nginx

3. nginx 상태 확인

   sudo systemctl status nginx --no-pager

## 5. 프론트엔드/백엔드 컨테이너 포트 고정

- 이 문서의 최종 기준 포트는 아래와 같다.
  - 프론트엔드: 127.0.0.1:3667 -> 컨테이너 80
  - 백엔드: 127.0.0.1:8888 -> 컨테이너 8080

1. 현재 실행 중인 컨테이너 확인

   sudo docker ps

2. 기존 컨테이너 중지/삭제(이름은 실제 환경에 맞게 변경)

   sudo docker stop frontend-server backend-server
   sudo docker rm frontend-server backend-server

3. 고정 포트로 재실행

   sudo docker run -d --name frontend-server --restart always -p 127.0.0.1:3667:80 shyunnnn/find-me-frontend:28-dev
   sudo docker run -d --name backend-server --restart always -p 127.0.0.1:8888:8080 shyunnnn/find-me-backend:28-dev

4. 리스닝 확인

   sudo ss -ltnp | grep -E ':3667|:8888'

5. Docker Compose로 고정 운영(권장)

   services:
     frontend:
       image: shyunnnn/find-me-frontend:28-dev
       container_name: frontend-server
       restart: always
       ports:
         - "127.0.0.1:3667:80"

     backend:
       image: shyunnnn/find-me-backend:28-dev
       container_name: backend-server
       restart: always
       ports:
         - "127.0.0.1:8888:8080"

## 6. /etc/nginx/sites-available에 사이트 설정 파일 생성

1. 사이트 파일 생성

   sudo nano /etc/nginx/sites-available/your-domain

2. 초기 HTTP 설정 입력(Certbot 적용 전)

   server {
       listen 80;
       listen [::]:80;
       server_name your-domain www.your-domain;

       location / {
         proxy_pass http://127.0.0.1:3667;
         proxy_http_version 1.1;
         proxy_set_header Host $host;
         proxy_set_header X-Real-IP $remote_addr;
         proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
         proxy_set_header X-Forwarded-Proto $scheme;
       }

       location /api/ {
           proxy_pass http://127.0.0.1:8888;
           proxy_http_version 1.1;
           proxy_set_header Host $host;
           proxy_set_header X-Real-IP $remote_addr;
           proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
           proxy_set_header X-Forwarded-Proto $scheme;
       }

       location /oauth2/ {
           proxy_pass http://127.0.0.1:8888;
           proxy_http_version 1.1;
           proxy_set_header Host $host;
           proxy_set_header X-Real-IP $remote_addr;
           proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
           proxy_set_header X-Forwarded-Proto $scheme;
       }

       location /login/ {
           proxy_pass http://127.0.0.1:8888;
           proxy_http_version 1.1;
           proxy_set_header Host $host;
           proxy_set_header X-Real-IP $remote_addr;
           proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
           proxy_set_header X-Forwarded-Proto $scheme;
       }
   }

3. 심볼릭 링크로 사이트 활성화

   sudo ln -s /etc/nginx/sites-available/your-domain /etc/nginx/sites-enabled/your-domain

4. 필요 시 기본 사이트 비활성화

   sudo rm -f /etc/nginx/sites-enabled/default

5. 설정 검증 및 nginx 리로드

   sudo nginx -t
   sudo systemctl reload nginx

## 7. TLS 인증서 발급 및 적용 (Certbot)

1. nginx 플러그인으로 certbot 실행

   sudo certbot --nginx -d your-domain -d www.your-domain

2. 프롬프트에서 선택

- 이메일 입력
- 약관 동의
- 리다이렉트 옵션 선택(HTTP -> HTTPS)

3. Certbot이 443 설정과 리다이렉트 설정을 nginx에 자동 반영한다.

4. 자동 갱신 드라이런 테스트

   sudo certbot renew --dry-run

## 8. 최종 nginx 동작 기대값

- http://your-domain -> 301으로 https://your-domain 리다이렉트
- https://your-domain -> 프론트엔드(localhost:3667) 프록시
- https://your-domain/api/... -> 백엔드 localhost:8888으로 프록시
- 인터넷에서 your-domain:3667 및 your-domain:8888 직접 접근 -> 차단

## 9. 검증 체크리스트

1. DNS 해석 확인

   nslookup your-domain

2. HTTP에서 HTTPS로 리다이렉트 확인

   curl -I http://your-domain

3. HTTPS 응답 확인

   curl -I https://your-domain

4. 브라우저에서 프론트엔드 페이지 로드 확인

- https://your-domain 접속 후 UI가 정상 렌더링되는지 확인한다.

5. nginx를 통한 API 경로 확인

   curl -I https://your-domain/api/health

6. 외부에서 직접 접근 차단 확인

   curl -I http://your-domain:3667
   curl -I http://your-domain:8888

7. 로컬 바인딩 확인

   sudo ss -ltnp | grep -E ':80 |:443 |:3667|:8888'

## 10. 트러블슈팅

- nginx 문법 오류:
  - sudo nginx -t
  - 설정 수정 후 다시 reload 한다.

- certbot 챌린지 실패:
  - DNS A 레코드가 현재 EC2 IP를 가리키는지 확인한다.
  - 챌린지 중 인바운드 80 포트가 열려 있는지 확인한다.
  - 앞단에 충돌하는 리버스 프록시가 없는지 확인한다.

- 프론트엔드 접속 불가:
   - frontend-server가 127.0.0.1:3667으로 떠 있는지 확인한다.
   - location / 의 proxy_pass가 http://127.0.0.1:3667 인지 확인한다.

- API 접속 불가:
   - backend-server가 127.0.0.1:8888으로 떠 있는지 확인한다.
   - location /api/ 의 proxy_pass가 http://127.0.0.1:8888 인지 확인한다.
   - proxy_pass 끝에 / 를 붙이면 /api/ 접두사가 제거되어 백엔드가 경로를 못 찾는다.

- OAuth 로그인 불가:
   - location /oauth2/ 와 location /login/ 블록이 nginx에 있는지 확인한다.
   - proxy_pass는 http://127.0.0.1:8888 (끝에 / 없이) 이어야 한다.

- 브라우저 mixed content 경고:
  - 프론트 API base URL이 상대 경로(/api) 또는 https URL인지 확인한다.

## 11. 롤백 (빠른 복구)

1. 커스텀 사이트 비활성화

   sudo rm -f /etc/nginx/sites-enabled/your-domain

2. 필요 시 기본 사이트 재활성화

   sudo ln -s /etc/nginx/sites-available/default /etc/nginx/sites-enabled/default

3. 테스트 및 리로드

   sudo nginx -t
   sudo systemctl reload nginx

## 12. 보안 베이스라인

- 외부 공개 포트는 80, 443만 유지한다.
- 프론트엔드(3667)와 백엔드(8888)는 반드시 127.0.0.1로만 바인딩한다.
- 파일 시스템 권한은 최소 권한 원칙을 적용한다.
- certbot 자동 갱신 상태를 유지한다(월 1회 dry-run 점검 권장).
