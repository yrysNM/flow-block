import 'reflect-metadata'
import { NestFactory } from '@nestjs/core'
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger'
import cookieParser from 'cookie-parser'
import type { INestApplication } from '@nestjs/common'
import type { NextFunction, Request, Response } from 'express'
import { AppModule } from './app.module'
import { assertProductionSessionSecret } from './auth/session-secret'
import { AllExceptionsFilter } from './common/http-exception.filter'
import { securityHeaders } from './security-headers'

export function configureApp(app: INestApplication): void {
  app.setGlobalPrefix('api')
  app.use(cookieParser())
  app.useGlobalFilters(new AllExceptionsFilter())
  const allowedOrigins = (process.env.WEB_ORIGIN ?? 'http://localhost:3000')
    .split(',')
    .map((value) => value.trim())
    .filter((value) => value.length > 0)
  app.enableCors({
    origin: (origin: string | undefined, callback: (err: Error | null, allow?: boolean) => void) => {
      if (!origin || allowedOrigins.includes(origin) || origin.startsWith('chrome-extension://')) {
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
  app.use((req: Request, res: Response, next: NextFunction) => {
    const headers = securityHeaders(req.secure)
    for (const [name, value] of Object.entries(headers)) {
      res.setHeader(name, value)
    }
    next()
  })

  const config = new DocumentBuilder()
    .setTitle('FocusFlow API')
    .setDescription('FocusFlow API. Quadrant is derived. Focus elapsed time is computed from timestamps. Website blocking follows focus mode, then each rule schedule. Habit streaks, goal progress, and analytics are computed on read. Theme, focus default, and language are account preferences. Language is stored and the UI stays English. POST /api/assistant uses the session user and the unconfigured provider until ASSISTANT_PROVIDER names another one. Completing a daily or weekly task inserts one next open task.')
    .setVersion('0.11.0')
    .addCookieAuth('ff_session', { type: 'apiKey', in: 'cookie', name: 'ff_session' }, 'session')
    .build()
  SwaggerModule.setup('api/docs', app, SwaggerModule.createDocument(app, config))
}

export async function createApp(): Promise<INestApplication> {
  const app = await NestFactory.create(AppModule)
  configureApp(app)
  return app
}

async function bootstrap(): Promise<void> {
  assertProductionSessionSecret()
  const app = await createApp()
  const port = Number(process.env.PORT ?? 3001)
  await app.listen(port, '0.0.0.0')
}

if (require.main === module) {
  bootstrap().catch((error: unknown) => {
    console.error(error)
    process.exit(1)
  })
}
