import { fileURLToPath } from 'node:url'
import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts'],
  },
  resolve: {
    alias: {
      '@focusflow/shared-utils': fileURLToPath(new URL('../../packages/shared-utils/src/index.ts', import.meta.url)),
    },
  },
})
