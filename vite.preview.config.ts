import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

const root = path.dirname(fileURLToPath(import.meta.url))

export default defineConfig({
  plugins: [react(), tailwindcss()],
  root: path.resolve(root, 'src/preview'),
  publicDir: path.resolve(root, 'public'),
  resolve: {
    alias: {
      '@': path.resolve(root, 'src'),
    },
  },
  server: {
    port: 43147,
    host: '127.0.0.1',
    strictPort: true,
    fs: {
      allow: [root],
    },
  },
})
