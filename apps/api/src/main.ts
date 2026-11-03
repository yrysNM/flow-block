import express from 'express'
import type { NextFunction, Request, Response } from 'express'

const server = express()
let starting: Promise<void> | undefined

function start(): Promise<void> {
  starting ??= import('./nest-on-express').then(({ mountNest }) => mountNest(server))
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

if (require.main === module) {
  const port = Number(process.env.PORT ?? 3001)
  start()
    .then(() => {
      server.listen(port, '0.0.0.0')
    })
    .catch((error: unknown) => {
      console.error(error)
      process.exit(1)
    })
}
