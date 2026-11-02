import { Body, Controller, Get, HttpCode, Post, Req, Res, UseGuards } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { ApiBody, ApiCookieAuth, ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger'
import { loginSchema, registerSchema, type LoginInput, type RegisterInput } from '@focusflow/shared-schemas'
import type { Request, Response } from 'express'
import { CurrentUser } from '../common/current-user.decorator'
import { Public } from '../common/public.decorator'
import { ZodValidationPipe } from '../common/zod-validation.pipe'
import { AuthRateLimitGuard } from './auth-rate-limit.guard'
import { AuthService } from './auth.service'
import type { AuthContext } from './auth.types'
import { SESSION_COOKIE } from './session-cookie'

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(
    private readonly auth: AuthService,
    private readonly config: ConfigService,
  ) {}

  @Public()
  @UseGuards(AuthRateLimitGuard)
  @Post('register')
  @HttpCode(201)
  @ApiOperation({ summary: 'Create an account and start a session' })
  @ApiBody({
    schema: {
      type: 'object',
      required: ['email', 'password', 'name'],
      properties: {
        email: { type: 'string', format: 'email' },
        password: { type: 'string', minLength: 8 },
        name: { type: 'string' },
      },
    },
  })
  @ApiOkResponse({ description: 'User and preferences. Session cookie is set.' })
  async register(
    @Body(new ZodValidationPipe(registerSchema)) body: RegisterInput,
    @Req() request: Request,
    @Res({ passthrough: true }) response: Response,
  ) {
    const result = await this.auth.register(body, request.header('user-agent'))
    this.auth.attachCookie(response, result.token, this.secure())
    return { user: result.user, preferences: result.preferences }
  }

  @Public()
  @UseGuards(AuthRateLimitGuard)
  @Post('login')
  @HttpCode(200)
  @ApiOperation({ summary: 'Log in with email and password' })
  @ApiBody({
    schema: {
      type: 'object',
      required: ['email', 'password'],
      properties: {
        email: { type: 'string', format: 'email' },
        password: { type: 'string' },
      },
    },
  })
  async login(
    @Body(new ZodValidationPipe(loginSchema)) body: LoginInput,
    @Req() request: Request,
    @Res({ passthrough: true }) response: Response,
  ) {
    const result = await this.auth.login(body, request.header('user-agent'))
    this.auth.attachCookie(response, result.token, this.secure())
    return { user: result.user, preferences: result.preferences }
  }

  @Public()
  @Post('logout')
  @HttpCode(204)
  @ApiOperation({ summary: 'End the current session' })
  async logout(@Req() request: Request, @Res({ passthrough: true }) response: Response): Promise<void> {
    const token = request.cookies?.[SESSION_COOKIE]
    await this.auth.logout(typeof token === 'string' ? token : undefined, response, this.secure())
  }

  @Get('me')
  @ApiCookieAuth('session')
  @ApiOperation({ summary: 'Current user from the session cookie' })
  me(@CurrentUser() user: AuthContext) {
    return this.auth.toPublic(user)
  }

  private secure(): boolean {
    return this.config.get<string>('NODE_ENV') === 'production'
  }
}
