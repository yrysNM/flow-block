import { ArgumentsHost, Catch, ExceptionFilter, HttpException, HttpStatus, Logger } from '@nestjs/common'
import type { Response } from 'express'

interface ErrorBody {
  statusCode: number
  error: string
  message: string
  details?: Array<{ path: string; message: string }>
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}

@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  private readonly logger = new Logger(AllExceptionsFilter.name)

  catch(exception: unknown, host: ArgumentsHost): void {
    const response = host.switchToHttp().getResponse<Response>()
    const body = this.toBody(exception)
    if (body.statusCode >= 500) {
      this.logger.error(exception instanceof Error ? exception.stack : exception)
    }
    response.status(body.statusCode).json(body)
  }

  private toBody(exception: unknown): ErrorBody {
    if (exception instanceof HttpException) {
      const status = exception.getStatus()
      const payload = exception.getResponse()
      if (isRecord(payload) && typeof payload.message === 'string' && typeof payload.statusCode === 'number') {
        return {
          statusCode: payload.statusCode,
          error: typeof payload.error === 'string' ? payload.error : exception.name,
          message: payload.message,
          ...(Array.isArray(payload.details) ? { details: payload.details as ErrorBody['details'] } : {}),
        }
      }
      const message = isRecord(payload) && typeof payload.message === 'string'
        ? payload.message
        : exception.message
      return {
        statusCode: status,
        error: HttpStatus[status] ?? 'Error',
        message,
      }
    }

    if (isRecord(exception) && exception.name === 'PrismaClientKnownRequestError' && exception.code === 'P2002') {
      return { statusCode: 409, error: 'Conflict', message: 'That value is already in use.' }
    }
    if (isRecord(exception) && exception.name === 'PrismaClientInitializationError') {
      return { statusCode: 503, error: 'Service Unavailable', message: 'Database is unavailable.' }
    }

    return {
      statusCode: 500,
      error: 'Internal Server Error',
      message: 'Unexpected error',
    }
  }
}
