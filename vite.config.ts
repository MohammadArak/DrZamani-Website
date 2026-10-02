import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from "@tailwindcss/vite";
import path from "node:path";

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "");
  const apiProxyTarget = env.VITE_API_PROXY_TARGET || "http://127.0.0.1:8000";
  const proxy = {
    "/articles/": { target: apiProxyTarget, changeOrigin: true },
    "/services": { target: apiProxyTarget, changeOrigin: true },
    "/api": {
      target: apiProxyTarget,
      changeOrigin: true,
      ws: true,
    },
  };

  return {
    plugins: [react(), tailwindcss()],
    resolve: {
      alias: {
        "@": path.resolve(import.meta.dirname, "./src"),
      },
    },
    server: { proxy },
    preview: { proxy },
    build: {
      outDir: "public_html",
      emptyOutDir: true,
    },
  };
})
