import { CanActivate, ExecutionContext, HttpException, Injectable } from '@nestjs/common'
import type { Request } from 'express'

const WINDOW_MS = 60_000
const LIMIT = 10

@Injectable()
export class AuthRateLimitGuard implements CanActivate {
  private readonly hits = new Map<string, number[]>()

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<Request>()
    const key = `${request.ip ?? 'unknown'}:${request.path}`
    const now = Date.now()
    const recent = (this.hits.get(key) ?? []).filter((timestamp) => now - timestamp < WINDOW_MS)
    if (recent.length >= LIMIT) {
      throw new HttpException(
        {
          statusCode: 429,
          error: 'Too Many Requests',
          message: 'Too many auth attempts. Try again shortly.',
        },
        429,
      )
    }
    recent.push(now)
    this.hits.set(key, recent)
    if (this.hits.size > 5000) {
      for (const [entry, stamps] of this.hits) {
        if (stamps.every((timestamp) => now - timestamp >= WINDOW_MS)) this.hits.delete(entry)
      }
    }
    return true
  }
}
