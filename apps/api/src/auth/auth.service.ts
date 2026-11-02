import { ConflictException, Injectable, UnauthorizedException } from '@nestjs/common'
import type { LoginInput, RegisterInput } from '@focusflow/shared-schemas'
import type { PublicPreferences, PublicUser } from '@focusflow/shared-types'
import { accountPreferences } from '@focusflow/shared-utils'
import type { Response } from 'express'
import { PrismaService } from '../prisma/prisma.service'
import type { AuthContext, AuthResult } from './auth.types'
import { hashPassword, verifyPassword } from './password'
import { SESSION_COOKIE, SESSION_TTL_MS, sessionCookieOptions } from './session-cookie'
import { createSessionToken, hashSessionToken } from './session-token'

interface UserWithPreferences {
  id: string
  email: string
  name: string
  passwordHash: string
  preferences: {
    timezone: string
    theme: string
    weekStartsOn: number
    focusDefaultSeconds?: number
    language?: string
  } | null
}

@Injectable()
export class AuthService {
  constructor(private readonly prisma: PrismaService) {}

  async register(input: RegisterInput, userAgent: string | undefined): Promise<AuthResult> {
    const existing = await this.prisma.user.findUnique({
      where: { email: input.email },
      select: { id: true },
    })
    if (existing) {
      throw new ConflictException({
        statusCode: 409,
        error: 'Conflict',
        message: 'An account with this email already exists.',
      })
    }

    const passwordHash = await hashPassword(input.password)
    const user = await this.prisma.user.create({
      data: {
        email: input.email,
        name: input.name,
        passwordHash,
        preferences: { create: {} },
      },
      include: { preferences: true },
    })
    return this.issueSession(user, userAgent)
  }

  async login(input: LoginInput, userAgent: string | undefined): Promise<AuthResult> {
    const user = await this.prisma.user.findUnique({
      where: { email: input.email },
      include: { preferences: true },
    })
    const valid = user ? await verifyPassword(user.passwordHash, input.password) : false
    if (!user || !valid) {
      throw new UnauthorizedException({
        statusCode: 401,
        error: 'Unauthorized',
        message: 'Invalid email or password.',
      })
    }
    return this.issueSession(user, userAgent)
  }

  async logout(token: string | undefined, response: Response, secureCookie: boolean): Promise<void> {
    if (token) {
      await this.prisma.session.deleteMany({ where: { tokenHash: hashSessionToken(token) } })
    }
    response.clearCookie(SESSION_COOKIE, sessionCookieOptions(secureCookie))
  }

  async userFromSessionToken(token: string): Promise<AuthContext | null> {
    const session = await this.prisma.session.findUnique({
      where: { tokenHash: hashSessionToken(token) },
      include: { user: { include: { preferences: true } } },
    })
    if (!session) return null
    if (session.expiresAt.getTime() <= Date.now()) {
      await this.prisma.session.delete({ where: { id: session.id } })
      return null
    }
    return this.toContext(session.user)
  }

  attachCookie(response: Response, token: string, secureCookie: boolean): void {
    response.cookie(SESSION_COOKIE, token, sessionCookieOptions(secureCookie))
  }

  toPublic(user: AuthContext): { user: PublicUser; preferences: PublicPreferences } {
    return {
      user: { id: user.id, email: user.email, name: user.name },
      preferences: user.preferences,
    }
  }

  private async issueSession(user: UserWithPreferences, userAgent: string | undefined): Promise<AuthResult> {
    const { token, tokenHash } = createSessionToken()
    await this.prisma.session.create({
      data: {
        userId: user.id,
        tokenHash,
        expiresAt: new Date(Date.now() + SESSION_TTL_MS),
        userAgent: userAgent?.slice(0, 300),
      },
    })
    const context = this.toContext(user)
    return { token, ...this.toPublic(context) }
  }

  private toContext(user: UserWithPreferences): AuthContext {
    return {
      id: user.id,
      email: user.email,
      name: user.name,
      preferences: accountPreferences(user.preferences),
    }
  }
}
