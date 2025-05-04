/* eslint-disable no-undef */
import { defineConfig } from 'vite';
import { resolve } from 'path';

export default defineConfig({
  server: {
    port: 5173,
    proxy: {
      '/api': {
        target: process.env.VITE_API_URL || 'http://localhost:3000', // Use env variable or fallback to local
        changeOrigin: true,
        secure: false,
      },
    },
  },
  build: {
    outDir: 'dist', // Explicitly set output directory
    rollupOptions: {
      input: {
        main: resolve(__dirname, 'index.html'),
        dashboard: resolve(__dirname, 'dashboard.html'),
        errorpage: resolve(__dirname, '404.html'),
      },
    },
  },
  define: {
    // Make VITE_API_URL available in client-side code
    'import.meta.env.VITE_API_URL': JSON.stringify(process.env.VITE_API_URL || 'http://localhost:3000'),
  },
});