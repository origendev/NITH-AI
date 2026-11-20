import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

// In development you can leave VITE_API_BASE_URL empty and the dev server will
// proxy /api/* to VITE_DEV_PROXY_TARGET (default http://localhost:8000), which
// avoids CORS configuration while you are working locally.
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  return {
    plugins: [react()],
    server: {
      port: 5173,
      proxy: {
        '/api': {
          target: env.VITE_DEV_PROXY_TARGET || 'http://localhost:8000',
          changeOrigin: true,
        },
      },
    },
    build: {
      chunkSizeWarningLimit: 900,
    },
  };
});
