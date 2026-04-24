import { defineConfig, loadEnv, type UserConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

export default defineConfig(({ mode }): UserConfig => {
  const env = loadEnv(mode, process.cwd(), "");
  const frontendPort = Number(env.VITE_APP_PORT ?? 5173);
  const apiBaseUrl = env.VITE_API_BASE_URL ?? "http://localhost:8080";

  return {
    plugins: [react(), tailwindcss()],
    server: {
      port: frontendPort,
      allowedHosts: ["find.me.kr", "www.find.me.kr"],
      proxy: {
        "/api": {
          target: apiBaseUrl,
          changeOrigin: true,
          secure: false,
        },
      },
    },
    build: {
      sourcemap: false,
    },
  };
});
