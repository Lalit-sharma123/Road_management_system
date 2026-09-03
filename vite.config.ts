import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import {defineConfig} from 'vite';
import { devApiPlugin } from './src/server/devApiMiddleware';

export default defineConfig(() => {
  const backendUrl = process.env.VITE_BACKEND_URL;
  const wsUrl = process.env.VITE_WS_URL;

  return {
    plugins: [
      react(),
      tailwindcss(),
      // Internal dev mock API layer when no external backend is running
      devApiPlugin()
    ],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
    server: {
      host: '0.0.0.0',
      port: 3000,
      proxy: backendUrl ? {
        '/api': {
          target: backendUrl,
          changeOrigin: true,
          secure: false,
          ws: true,
        },
        '/uploads': {
          target: backendUrl,
          changeOrigin: true,
          secure: false,
        },
        '/processed': {
          target: backendUrl,
          changeOrigin: true,
          secure: false,
        },
        '/ws': {
          target: wsUrl || backendUrl.replace(/^http/, 'ws'),
          ws: true,
          changeOrigin: true,
        },
      } : undefined,
      // HMR is disabled in AI Studio via DISABLE_HMR env var.
      // Do not modify - file watching is disabled to prevent flickering during agent edits.
      hmr: process.env.DISABLE_HMR !== 'true',
      // Disable file watching when DISABLE_HMR is true to save CPU during agent edits.
      watch: process.env.DISABLE_HMR === 'true' ? null : {},
    },
  };
});
