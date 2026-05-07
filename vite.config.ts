import { defineConfig } from 'vite';
import vue from '@vitejs/plugin-vue';
import path from 'path';

export default defineConfig({
  plugins: [vue()],
  root: path.join(__dirname, 'src', 'renderer'),
  base: './',
  build: {
    outDir: path.join(__dirname, 'dist', 'renderer'),
    emptyOutDir: true,
    rollupOptions: {
      input: path.join(__dirname, 'src', 'renderer', 'index.html'),
    },
  },
  resolve: {
    alias: {
      '@': path.join(__dirname, 'src', 'renderer', 'src'),
    },
  },
  server: {
    port: 5173,
  },
});
