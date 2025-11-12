import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  server: {
    port: 3000,
    host: true, // 네트워크에서 접근 가능하도록 설정 (모바일 테스트용)
  },
  build: {
    outDir: 'dist',
    sourcemap: true,
  },
})
