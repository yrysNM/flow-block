import { createRequire } from 'node:module'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const require = createRequire(import.meta.url)
const esbuild = require('esbuild')
const here = dirname(fileURLToPath(import.meta.url))

const shared = {
  bundle: true,
  format: 'esm',
  platform: 'browser',
  target: 'chrome120',
  alias: {
    '@focusflow/shared-utils': resolve(here, '../../packages/shared-utils/src/index.ts'),
    '@focusflow/shared-types': resolve(here, '../../packages/shared-types/src/index.ts'),
  },
}

await esbuild.build({
  ...shared,
  entryPoints: [resolve(here, 'src/background.ts')],
  outfile: resolve(here, 'dist/background.js'),
})

await esbuild.build({
  ...shared,
  entryPoints: [resolve(here, 'src/popup.ts')],
  outfile: resolve(here, 'dist/popup.js'),
})

await esbuild.build({
  ...shared,
  entryPoints: [resolve(here, 'src/blocked.ts')],
  outfile: resolve(here, 'dist/blocked.js'),
})
