import express from 'express'
import { existsSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'

const server = express()
let starting

function bundleUrl() {
  const here = path.dirname(fileURLToPath(import.meta.url))
  const candidates = [
    path.join(here, '../native/vercel-bundle.mjs'),
    path.join(process.cwd(), 'native/vercel-bundle.mjs'),
    path.join(here, 'native/vercel-bundle.mjs'),
  ]
  const found = candidates.find((candidate) => existsSync(candidate))
  if (!found) {
    throw new Error(`Nest bundle not found. Looked in ${candidates.join(', ')}`)
  }
  return pathToFileURL(found).href
}

function start() {
  starting ??= import(bundleUrl()).then(({ mountNest }) => mountNest(server))
  return starting
}

server.use((_request, response, next) => {
  start()
    .then(() => next())
    .catch((error) => {
      const message = error instanceof Error ? (error.stack ?? error.message) : String(error)
      console.error(message)
      if (response.headersSent) return
      response.status(500).json({ statusCode: 500, error: 'Startup failed', message })
    })
})

export default server
