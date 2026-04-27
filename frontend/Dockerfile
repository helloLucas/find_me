# 1단계: 베이스 (Node 환경)
FROM node:24-alpine AS base
WORKDIR /app

# 종속성 설치 최적화
COPY package*.json ./
RUN npm install

# 소스 코드 복사
COPY . .

# 빌드 시점에 백엔드 API 주소 주입
ARG VITE_API_BASE_URL
ARG VITE_CDN_URL
ARG VITE_HMR_HOST
ARG VITE_HMR_PROTOCOL
ARG VITE_HMR_CLIENT_PORT
ARG VITE_APP_PORT

ENV VITE_API_BASE_URL=$VITE_API_BASE_URL
ENV VITE_CDN_URL=$VITE_CDN_URL
ENV VITE_HMR_HOST=$VITE_HMR_HOST
ENV VITE_HMR_PROTOCOL=$VITE_HMR_PROTOCOL
ENV VITE_HMR_CLIENT_PORT=$VITE_HMR_CLIENT_PORT
ENV VITE_APP_PORT=$VITE_APP_PORT

RUN npm run build

# 2단계: 빌드 (운영용 빌드 단계)
FROM base AS build-stage
RUN npm run build

# 3단계: 운영 서버 (Nginx) - main 브랜치용
FROM nginx:stable-alpine AS prod
# 프로젝트 내부의 nginx.conf 설정을 컨테이너 안으로 복사
COPY nginx.conf /etc/nginx/conf.d/default.conf
# 빌드 결과물을 Nginx가 서빙할 경로로 복사
COPY --from=build-stage /app/dist /usr/share/nginx/html
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]

# 4단계: 개발 서버 (Vite Dev Server) - develop 브랜치용
FROM base AS dev
# Vite 개발 서버 포트를 80으로 설정
ENV VITE_APP_PORT=80
EXPOSE 80
CMD ["npm", "run", "dev", "--", "--host", "0.0.0.0"]