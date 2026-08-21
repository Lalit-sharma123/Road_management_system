import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import {defineConfig} from 'vite';

export default defineConfig(() => {
  return {
    plugins: [react(), tailwindcss()],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
    server: {
      host: '0.0.0.0',
      port: 3000,
      proxy: {
        '/api': {
          target: process.env.VITE_BACKEND_URL || 'http://127.0.0.1:8000',
          changeOrigin: true,
          secure: false,
          ws: true,
          configure: (proxy) => {
            proxy.on('error', (err) => {
              const code = (err as any)?.code;
              if (code === 'ECONNRESET' || code === 'ECONNREFUSED' || code === 'EPIPE') {
                return; // Gracefully handle backend disconnects
              }
            });
            proxy.on('proxyReqWs', (_proxyReq, _req, socket) => {
              socket.on('error', (err: any) => {
                const code = err?.code;
                if (code === 'ECONNRESET' || code === 'ECONNREFUSED' || code === 'EPIPE') {
                  return; // Suppress socket disconnect errors
                }
              });
            });
          },
        },
        '/uploads': {
          target: process.env.VITE_BACKEND_URL || 'http://127.0.0.1:8000',
          changeOrigin: true,
          secure: false,
        },
        '/processed': {
          target: process.env.VITE_BACKEND_URL || 'http://127.0.0.1:8000',
          changeOrigin: true,
          secure: false,
        },
        '/ws': {
          target: process.env.VITE_WS_URL || 'ws://127.0.0.1:8000',
          ws: true,
          changeOrigin: true,
          configure: (proxy) => {
            proxy.on('error', (err) => {
              const code = (err as any)?.code;
              if (code === 'ECONNRESET' || code === 'ECONNREFUSED' || code === 'EPIPE') {
                return;
              }
            });
            proxy.on('proxyReqWs', (_proxyReq, _req, socket) => {
              socket.on('error', (err: any) => {
                const code = err?.code;
                if (code === 'ECONNRESET' || code === 'ECONNREFUSED' || code === 'EPIPE') {
                  return;
                }
              });
            });
          },
        },
      },
      // HMR is disabled in AI Studio via DISABLE_HMR env var.
      // Do not modify - file watching is disabled to prevent flickering during agent edits.
      hmr: process.env.DISABLE_HMR !== 'true',
      // Disable file watching when DISABLE_HMR is true to save CPU during agent edits.
      watch: process.env.DISABLE_HMR === 'true' ? null : {},
    },
  };
});
