# 1단계: 빌드 (Node 20 환경)
FROM node:20-alpine AS build-stage
WORKDIR /app

# 종속성 설치 최적화 (package-lock.json 기준)
COPY package*.json ./
RUN npm ci

# 소스 코드 복사
COPY . .

# [중요] 빌드 시점에 백엔드 API 주소 주입
# Jenkins에서 --build-arg VITE_API_BASE_URL=https://api.lucas.kr 로 전달받음
ARG VITE_API_BASE_URL
ENV VITE_API_BASE_URL=$VITE_API_BASE_URL

# 빌드 실행 (결과물은 dist 폴더에 생성됨)
RUN npm run build

# 2단계: 실행 (Nginx 환경)
FROM nginx:stable-alpine

# 프로젝트 내부의 nginx.conf 설정을 컨테이너 안으로 복사
COPY nginx.conf /etc/nginx/conf.d/default.conf

# 빌드 결과물을 Nginx가 서빙할 경로로 복사
COPY --from=build-stage /app/dist /usr/share/nginx/html

# 80 포트 노출 (ALB가 이 포트로 신호를 보내게 됨)
EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]