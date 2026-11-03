import express from 'express'
import { existsSync } from 'node:fs'
import path from 'node:path'
import { pathToFileURL } from 'node:url'
import type { Express, NextFunction, Request, Response } from 'express'

// The Express builder compiles this file to CommonJS and rewrites import()
// into require(). Nest is ESM, so the bundle has to load through an import()
// the compiler cannot see.
const importModule = new Function('specifier', 'return import(specifier)') as (
  specifier: string,
) => Promise<{ mountNest: (application: Express) => Promise<void> }>

const server = express()
let starting: Promise<void> | undefined

function bundleUrl(): string {
  const candidates = [
    path.join(process.cwd(), 'native/vercel-bundle.mjs'),
    path.join(process.cwd(), 'apps/api/native/vercel-bundle.mjs'),
    path.join(__dirname, 'native/vercel-bundle.mjs'),
    path.join(__dirname, '../native/vercel-bundle.mjs'),
  ]
  const found = candidates.find((candidate) => existsSync(candidate))
  if (!found) {
    throw new Error(`Nest bundle not found. cwd=${process.cwd()} looked in ${candidates.join(', ')}`)
  }
  return pathToFileURL(found).href
}

function start(): Promise<void> {
  const specifier = bundleUrl()
  starting ??= importModule(specifier).then(({ mountNest }) => mountNest(server))
  return starting
}

server.use((_request: Request, response: Response, next: NextFunction) => {
  start()
    .then(() => next())
    .catch((error: unknown) => {
      const message = error instanceof Error ? (error.stack ?? error.message) : String(error)
      console.error(message)
      if (response.headersSent) return
      response.status(500).json({ statusCode: 500, error: 'Startup failed', message })
    })
})

export default server
