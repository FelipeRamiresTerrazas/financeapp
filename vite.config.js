import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  base: '/',
  // pdfjs-dist usa top-level await
  build: { target: 'es2022' },
  optimizeDeps: { esbuildOptions: { target: 'es2022' } },
})
