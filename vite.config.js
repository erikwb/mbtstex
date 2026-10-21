import { defineConfig } from 'vite';

export default defineConfig({
  root: 'web',
  base: './',
  build: { outDir: '../build/site', emptyOutDir: true },
  server: { host: '127.0.0.1' },
  preview: { host: '127.0.0.1', port: 4173, strictPort: true },
});
