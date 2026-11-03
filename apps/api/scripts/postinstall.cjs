const { execFileSync } = require('node:child_process')
const { copyFileSync, mkdirSync, readFileSync } = require('node:fs')
const path = require('node:path')
const esbuild = require('esbuild')
const ts = require('typescript')

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

esbuild.build({
  absWorkingDir: apiRoot,
  entryPoints: [path.join(apiRoot, 'src/nest-on-express.ts')],
  bundle: true,
  platform: 'node',
  format: 'esm',
  outfile: path.join(apiRoot, 'native/vercel-bundle.mjs'),
  packages: 'external',
  sourcemap: false,
  plugins: [
    {
      name: 'emit-decorator-metadata',
      setup(build) {
        build.onLoad({ filter: /\.ts$/ }, (args) => {
          const source = readFileSync(args.path, 'utf8')
          const { outputText, diagnostics } = ts.transpileModule(source, {
            compilerOptions: {
              target: ts.ScriptTarget.ES2022,
              module: ts.ModuleKind.ES2022,
              experimentalDecorators: true,
              emitDecoratorMetadata: true,
              esModuleInterop: true,
              isolatedModules: true,
            },
            fileName: args.path,
            reportDiagnostics: true,
          })
          const errors = (diagnostics ?? []).filter(
            (diagnostic) => diagnostic.category === ts.DiagnosticCategory.Error,
          )
          if (errors.length > 0) {
            return {
              errors: errors.map((diagnostic) => ({
                text: ts.flattenDiagnosticMessageText(diagnostic.messageText, '\n'),
              })),
            }
          }
          return { contents: outputText, loader: 'js' }
        })
      },
    },
  ],
  banner: {
    js: [
      "import { createRequire as __focusflowCreateRequire } from 'node:module'",
      "import { fileURLToPath as __focusflowFileURLToPath } from 'node:url'",
      'const require = __focusflowCreateRequire(import.meta.url)',
      'const __filename = __focusflowFileURLToPath(import.meta.url)',
      'const __dirname = require("node:path").dirname(__filename)',
    ].join('\n'),
  },
}).catch((error) => {
  console.error(error)
  process.exit(1)
})
