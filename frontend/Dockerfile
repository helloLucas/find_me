# 1단계: 베이스 (Node 환경)
FROM node:24-alpine AS base
WORKDIR /app

# 종속성 설치 최적화
COPY package*.json ./
RUN npm install

# 2단계: 빌드 준비 (소스 코드 및 환경 변수 복사)
FROM base AS build-stage
COPY . .

# 3단계-A: 개발용 빌드
FROM build-stage AS dev-build
RUN npm run build -- --sourcemap

# 3단계-B: 운영용 빌드
FROM build-stage AS prod-build
RUN npm run build

# 4단계: 배포용 공통 베이스
FROM nginx:stable-alpine AS deploy-base
COPY nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80

# 최종 스테이지: 개발 서버
FROM deploy-base AS dev
COPY --from=dev-build /app/dist /usr/share/nginx/html
CMD ["nginx", "-g", "daemon off;"]

# 최종 스테이지: 운영 서버
FROM deploy-base AS prod
COPY --from=prod-build /app/dist /usr/share/nginx/html
CMD ["nginx", "-g", "daemon off;"]