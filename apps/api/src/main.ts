import './vercel-native'
import 'reflect-metadata'
import type { IncomingMessage, ServerResponse } from 'node:http'
import { NestFactory } from '@nestjs/core'
import { ExpressAdapter } from '@nestjs/platform-express'
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger'
import cookieParser from 'cookie-parser'
import type { INestApplication } from '@nestjs/common'
import express from 'express'
import { AllExceptionsFilter } from './common/http-exception.filter'

function allowedOrigins(): string[] {
  const configured = (process.env.WEB_ORIGIN ?? 'http://localhost:3000')
    .split(',')
    .map((value) => value.trim())
    .filter((value) => value.length > 0)
  const vercelHosts = [process.env.VERCEL_PROJECT_PRODUCTION_URL, process.env.VERCEL_URL]
    .filter((host): host is string => typeof host === 'string' && host.length > 0)
    .map((host) =>
      host.startsWith('http://') || host.startsWith('https://') ? host : `https://${host}`,
    )
  return [...new Set([...configured, ...vercelHosts])]
}

export function configureApp(app: INestApplication): void {
  app.setGlobalPrefix('api')
  app.use(cookieParser())
  app.useGlobalFilters(new AllExceptionsFilter())
  app.enableCors({
    origin(
      origin: string | undefined,
      callback: (error: Error | null, allow?: boolean) => void,
    ) {
      if (!origin || allowedOrigins().includes(origin)) {
        callback(null, true)
        return
      }
      callback(null, false)
    },
    credentials: true,
  })
  const http = app.getHttpAdapter().getInstance() as {
    set?: (key: string, value: number) => void
    disable?: (key: string) => void
  }
  http.disable?.('x-powered-by')
  http.set?.('trust proxy', 1)

  const config = new DocumentBuilder()
    .setTitle('FocusFlow API')
    .setDescription('Phase 0 and the task vertical slice. Quadrant is derived and is not a stored field.')
    .setVersion('0.1.0')
    .addCookieAuth('ff_session', { type: 'apiKey', in: 'cookie', name: 'ff_session' }, 'session')
    .build()
  SwaggerModule.setup('api/docs', app, SwaggerModule.createDocument(app, config))
}

export async function createApp(): Promise<INestApplication> {
  const { AppModule } = await import('./app.module')
  const app = await NestFactory.create(AppModule)
  configureApp(app)
  return app
}

const vercelServer = express()
let vercelReady: Promise<void> | undefined

function prepareVercelServer(): Promise<void> {
  vercelReady ??= (async () => {
    const { AppModule } = await import('./app.module')
    const app = await NestFactory.create(AppModule, new ExpressAdapter(vercelServer))
    configureApp(app)
    await app.init()
  })()
  return vercelReady
}

function startupMessage(error: unknown): string {
  return error instanceof Error ? (error.stack ?? error.message) : String(error)
}

export default async function vercelHandler(
  request: IncomingMessage,
  response: ServerResponse,
): Promise<void> {
  try {
    await prepareVercelServer()
    vercelServer(request, response)
  } catch (error) {
    console.error(error)
    if (response.headersSent) return
    response.statusCode = 500
    response.setHeader('content-type', 'application/json; charset=utf-8')
    response.end(
      JSON.stringify({ statusCode: 500, error: 'Startup failed', message: startupMessage(error) }),
    )
  }
}

if (require.main === module && process.env.VERCEL !== '1') {
  const port = Number(process.env.PORT ?? 3001)
  createApp()
    .then((app) => app.listen(port, '0.0.0.0'))
    .catch((error: unknown) => {
      console.error(error)
      process.exit(1)
    })
}
