import express from 'express'
import { mountNest } from './vercel-bundle.mjs'

const server = express()
let starting

function start() {
  starting ??= mountNest(server)
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
