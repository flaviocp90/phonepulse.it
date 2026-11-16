import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { fileURLToPath } from 'node:url'

export default defineConfig(({ command, mode }) => ({
  plugins: [react()],
  resolve: { alias: { '#app': fileURLToPath(new URL(command === 'serve' ? './src/DevelopmentApp.jsx' : mode === 'editorial' ? './src/AdminApp.jsx' : './src/App.jsx', import.meta.url)) } },
  build: { outDir: mode === 'editorial' ? 'dist-admin' : 'dist' },
}))
