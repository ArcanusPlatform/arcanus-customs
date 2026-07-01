import { fileURLToPath } from 'url';
import { dirname } from 'path';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';
var __filename = fileURLToPath(import.meta.url);
var __dirname = dirname(__filename);
// https://vitejs.dev/config/
export default defineConfig({
    base: '/',
    plugins: [react()],
    resolve: {
        alias: {
            '@': path.resolve(__dirname, './src'),
        },
    },
    server: {
  port: 3004,
  strictPort: true,
  open: false,
    },
    build: {
        outDir: 'dist',
        sourcemap: false,
        minify: 'terser',
    },
});
