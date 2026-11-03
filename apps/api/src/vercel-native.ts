import { existsSync } from 'node:fs'
import path from 'node:path'

// Point native loaders at files copied next to this package during postinstall.
// path.join(__dirname, '../native', name) is also a file-tracer annotation.
function nativeFile(name: string): string | undefined {
  const candidates = [
    path.join(__dirname, '../native', name),
    path.join(__dirname, 'native', name),
    path.join(process.cwd(), 'native', name),
  ]
  return candidates.find((candidate) => existsSync(candidate))
}

const argon2 = nativeFile('argon2.linux-x64-gnu.node')
const queryEngine = nativeFile('libquery_engine-rhel-openssl-3.0.x.so.node')

if (argon2) {
  process.env.NAPI_RS_NATIVE_LIBRARY_PATH = argon2
}

if (queryEngine) {
  process.env.PRISMA_QUERY_ENGINE_LIBRARY = queryEngine
}
