const { execFileSync } = require('node:child_process')
const { copyFileSync, mkdirSync } = require('node:fs')
const path = require('node:path')

const apiRoot = path.resolve(__dirname, '..')
const repoRoot = path.resolve(apiRoot, '../..')
const tsc = path.join(repoRoot, 'node_modules/.bin/tsc')

execFileSync('prisma', ['generate'], { cwd: apiRoot, stdio: 'inherit' })

for (const name of ['shared-types', 'shared-schemas', 'shared-utils']) {
  execFileSync(tsc, ['-p', path.join(repoRoot, 'packages', name, 'tsconfig.json')], {
    stdio: 'inherit',
  })
}

const nativeDir = path.join(apiRoot, 'native')
mkdirSync(nativeDir, { recursive: true })

const copies = [
  [
    path.join(repoRoot, 'node_modules/@node-rs/argon2-linux-x64-gnu/argon2.linux-x64-gnu.node'),
    path.join(nativeDir, 'argon2.linux-x64-gnu.node'),
  ],
  [
    path.join(repoRoot, 'node_modules/.prisma/client/libquery_engine-rhel-openssl-3.0.x.so.node'),
    path.join(nativeDir, 'libquery_engine-rhel-openssl-3.0.x.so.node'),
  ],
]

for (const [from, to] of copies) {
  try {
    copyFileSync(from, to)
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    console.warn(`Skipping native asset ${from}: ${message}`)
  }
}
