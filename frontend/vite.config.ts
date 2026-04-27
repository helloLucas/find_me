import { defineConfig, loadEnv, type UserConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

export default defineConfig(({ mode }): UserConfig => {
  const env = loadEnv(mode, process.cwd(), "");
  const frontendPort = Number(env.VITE_APP_PORT ?? 5173);
  const hmrHost = env.VITE_HMR_HOST ?? "find.me.kr";
  const hmrProtocol = env.VITE_HMR_PROTOCOL ?? "wss";
  const hmrClientPort = env.VITE_HMR_CLIENT_PORT
    ? Number(env.VITE_HMR_CLIENT_PORT)
    : 443;

  // Docker: VITE_PROXY_TARGET=http://backend-server:8080 으로 설정
  // 로컬 개발: VITE_PROXY_TARGET 미설정 시 localhost:8080 사용
  const proxyTarget = env.VITE_PROXY_TARGET || "http://localhost:8080";

  // 공통 프록시 설정 함수
  const configureProxy = (proxy: any) => {
    proxy.on('error', (err: any, _req: any, _res: any) => {
      console.log('>> PROXY ERROR:', err);
    });
    proxy.on('proxyReq', (proxyReq: any, req: any, _res: any) => {
      const host = req.headers.host || '';

      // [로컬 환경 판별]
      // 브라우저가 프론트(5173)에 요청할 때의 Host 헤더를 확인
      const isLocal = host.includes('localhost') || host.includes('127.0.0.1');
      const protocol = isLocal ? 'http' : 'https';

      // [핵심 로직: 환경에 따른 프록시 헤더 분기 처리]
      // 운영 환경(!isLocal): 프록시(Vite/Nginx)를 탔다는 사실과 실제 도메인(find.me.kr), 프로토콜(https)을 백엔드에 알려줌.
      // 로컬 환경(isLocal): 프록시 헤더를 아예 숨김. 백엔드(Spring)가 프록시의 존재를 모르게 하여, 본인 주소(http://localhost:8080)로 OAuth2 Redirect URI를 만들도록 유도함.
      if (!isLocal) {
        proxyReq.setHeader('X-Forwarded-Host', host);
        proxyReq.setHeader('X-Forwarded-Proto', protocol);
      }

      console.log(`>> PROXYING: ${req.method} ${req.url} -> ${proxyTarget} (Proto: ${protocol})`);
    });
  };

  return {
    plugins: [react(), tailwindcss()],
    server: {
      host: "0.0.0.0",
      port: frontendPort,
      strictPort: true,
      allowedHosts: ["find.me.kr", "www.find.me.kr"],
      hmr: hmrHost
        ? {
          host: hmrHost,
          protocol: hmrProtocol as "ws" | "wss",
          clientPort: hmrClientPort,
        }
        : undefined,
      proxy: {
        // 백엔드 API 요청 프록시
        "/api": {
          target: proxyTarget,
          changeOrigin: true,
          secure: false,
          // [로그 추가] 요청이 프록시를 타는지 확인하기 위함
          configure: configureProxy,
        },
        // 소셜 로그인(OAuth2) 요청 프록시
        "/oauth2": {
          target: proxyTarget,
          changeOrigin: true,
          secure: false,
          configure: configureProxy,
        },
      },
    },
    build: {
      sourcemap: false,
    },
  };
});
