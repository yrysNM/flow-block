import './vercel-native'
import 'reflect-metadata'
import { NestFactory } from '@nestjs/core'
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger'
import cookieParser from 'cookie-parser'
import type { INestApplication } from '@nestjs/common'
import { AppModule } from './app.module'
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
  const app = await NestFactory.create(AppModule)
  configureApp(app)
  return app
}

async function bootstrap(): Promise<void> {
  const app = await createApp()
  const port = Number(process.env.PORT ?? 3001)
  await app.listen(port, '0.0.0.0')
}

const shouldListen = require.main === module || process.env.VERCEL === '1'

if (shouldListen) {
  bootstrap().catch((error: unknown) => {
    console.error(error)
    process.exit(1)
  })
}
