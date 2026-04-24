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

  // Docker 내부 통신을 위해 프록시 대상 주소를 컨테이너 이름으로 설정
  const proxyTarget = "http://backend-server:8080";

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
        "/api": {
          target: proxyTarget,
          changeOrigin: true,
          secure: false,
          configure: (proxy, _options) => {
            proxy.on('proxyReq', (proxyReq, req, _res) => {
              proxyReq.setHeader('X-Forwarded-Host', req.headers.host || '');
              proxyReq.setHeader('X-Forwarded-Proto', 'https');
            });
          },
        },
        "/oauth2": {
          target: proxyTarget,
          changeOrigin: true,
          secure: false,
          configure: (proxy, _options) => {
            proxy.on('proxyReq', (proxyReq, req, _res) => {
              proxyReq.setHeader('X-Forwarded-Host', req.headers.host || '');
              proxyReq.setHeader('X-Forwarded-Proto', 'https');
            });
          },
        },
      },
    },
    build: {
      sourcemap: false,
    },
  };
});
