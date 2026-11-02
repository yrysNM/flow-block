import { createParamDecorator, type ExecutionContext } from '@nestjs/common'
import type { AuthContext } from '../auth/auth.types'

export const CurrentUser = createParamDecorator((_: unknown, context: ExecutionContext): AuthContext => {
  const request = context.switchToHttp().getRequest<{ user: AuthContext }>()
  return request.user
})
