import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    port: 3000,
    host: '0.0.0.0',
    // Dev only (direct access on :3000). In the Docker stack, use https://localhost so nginx serves /api.
    proxy: {
      // changeOrigin false: keep Host=localhost so Django's ALLOWED_HOSTS accepts it.
      '/api': { target: process.env.API_PROXY_TARGET || 'http://localhost:8000', changeOrigin: false },
    },
  },
});
