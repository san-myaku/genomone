import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// GitHub Pages などサブパス配信でも動くよう相対パス基準にする。
export default defineConfig({
  base: './',
  plugins: [react()],
});
