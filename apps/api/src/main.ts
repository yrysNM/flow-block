import 'reflect-metadata'
import { NestFactory } from '@nestjs/core'
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger'
import cookieParser from 'cookie-parser'
import type { INestApplication } from '@nestjs/common'
import { AppModule } from './app.module'
import { AllExceptionsFilter } from './common/http-exception.filter'

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

  const config = new DocumentBuilder()
    .setTitle('FocusFlow API')
    .setDescription('FocusFlow API. Quadrant is derived. Focus elapsed time is computed from timestamps. Website blocking follows focus mode, then each rule schedule. Habit streaks, goal progress, and analytics are computed on read. Theme, focus default, and language are account preferences. Language is stored and the UI stays English.')
    .setVersion('0.8.0')
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
