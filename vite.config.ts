import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { crx } from '@crxjs/vite-plugin'
import tailwindcss from '@tailwindcss/vite'
import manifest from './manifest.config.ts'

const root = path.dirname(fileURLToPath(import.meta.url))

export default defineConfig({
  plugins: [react(), tailwindcss(), crx({ manifest })],
  resolve: {
    alias: {
      '@': path.resolve(root, 'src'),
    },
  },
  publicDir: 'public',
  server: {
    cors: {
      origin: [/chrome-extension:\/\//],
    },
  },
  build: {
    emptyOutDir: true,
    rollupOptions: {
      input: {
        blocked: path.resolve(root, 'src/blocked/index.html'),
        unlock: path.resolve(root, 'src/unlock/index.html'),
      },
    },
  },
})
