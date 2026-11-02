import tailwindcss from '@tailwindcss/vite'
import { fileURLToPath } from 'node:url'

export default defineNuxtConfig({
  compatibilityDate: '2026-11-02',
  devtools: { enabled: false },
  ssr: false,
  modules: ['@pinia/nuxt'],
  css: ['~/assets/css/main.css'],
  typescript: {
    strict: true,
  },
  runtimeConfig: {
    apiProxyTarget: 'http://127.0.0.1:3001',
    public: {
      apiBase: '/api',
    },
  },
  alias: {
    '@focusflow/shared-types': fileURLToPath(new URL('../../packages/shared-types/src/index.ts', import.meta.url)),
    '@focusflow/shared-schemas': fileURLToPath(new URL('../../packages/shared-schemas/src/index.ts', import.meta.url)),
    '@focusflow/shared-utils': fileURLToPath(new URL('../../packages/shared-utils/src/index.ts', import.meta.url)),
  },
  vite: {
    plugins: [tailwindcss()],
  },
  app: {
    head: {
      title: 'FocusFlow',
      meta: [{ name: 'description', content: 'Focus on what matters.' }],
    },
  },
})
