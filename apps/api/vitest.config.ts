import { fileURLToPath } from 'node:url'
import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts', 'test/**/*.test.ts'],
  },
  resolve: {
    alias: {
      '@focusflow/shared-types': fileURLToPath(new URL('../../packages/shared-types/src/index.ts', import.meta.url)),
      '@focusflow/shared-schemas': fileURLToPath(new URL('../../packages/shared-schemas/src/index.ts', import.meta.url)),
      '@focusflow/shared-utils': fileURLToPath(new URL('../../packages/shared-utils/src/index.ts', import.meta.url)),
    },
  },
})
