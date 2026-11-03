import { existsSync } from 'node:fs'
import path from 'node:path'

// Point native loaders at files copied next to this package during postinstall.
// The path.join calls are also file-tracer annotations for the Vercel bundle.
const argon2 = path.join(__dirname, '../native/argon2.linux-x64-gnu.node')
const queryEngine = path.join(__dirname, '../native/libquery_engine-rhel-openssl-3.0.x.so.node')

if (existsSync(argon2)) {
  process.env.NAPI_RS_NATIVE_LIBRARY_PATH = argon2
}

if (existsSync(queryEngine)) {
  process.env.PRISMA_QUERY_ENGINE_LIBRARY = queryEngine
}
