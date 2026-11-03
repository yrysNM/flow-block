import { BadRequestException, Injectable, UnauthorizedException } from '@nestjs/common'
import type { ChangePasswordInput, UpdatePreferencesInput, UpdateProfileInput } from '@focusflow/shared-schemas'
import type { PublicPreferences } from '@focusflow/shared-types'
import { accountPreferences, isValidTimeZone } from '@focusflow/shared-utils'
import { AuthService } from '../auth/auth.service'
import type { AuthContext } from '../auth/auth.types'
import { hashPassword, verifyPassword } from '../auth/password'
import { PrismaService } from '../prisma/prisma.service'

const CURRENT_PASSWORD_MESSAGE = 'Current password is incorrect.'

@Injectable()
export class UsersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auth: AuthService,
  ) {}

  profile(user: AuthContext) {
    return this.auth.toPublic(user)
  }

  async updateProfile(userId: string, input: UpdateProfileInput) {
    const user = await this.prisma.user.update({
      where: { id: userId },
      data: { name: input.name },
      include: { preferences: true },
    })
    return this.auth.toPublic({
      id: user.id,
      email: user.email,
      name: user.name,
      preferences: this.preferencesOf(user.preferences),
    })
  }

  /**
   * Replaces the password hash after the current password matches.
   * Does not delete sessions, so the caller stays signed in.
   */
  async changePassword(userId: string, input: ChangePasswordInput): Promise<{ ok: true }> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { passwordHash: true },
    })
    const valid = user ? await verifyPassword(user.passwordHash, input.currentPassword) : false
    if (!user || !valid) {
      throw new UnauthorizedException({
        statusCode: 401,
        error: 'Unauthorized',
        message: CURRENT_PASSWORD_MESSAGE,
      })
    }
    const passwordHash = await hashPassword(input.newPassword)
    await this.prisma.user.update({
      where: { id: userId },
      data: { passwordHash },
    })
    return { ok: true }
  }

  async updatePreferences(userId: string, input: UpdatePreferencesInput): Promise<PublicPreferences> {
    if (input.timezone !== undefined && !isValidTimeZone(input.timezone)) {
      throw new BadRequestException({
        statusCode: 400,
        error: 'Bad Request',
        message: 'Unknown time zone.',
      })
    }
    const preferences = await this.prisma.userPreferences.upsert({
      where: { userId },
      update: {
        ...(input.timezone !== undefined ? { timezone: input.timezone } : {}),
        ...(input.theme !== undefined ? { theme: input.theme } : {}),
        ...(input.weekStartsOn !== undefined ? { weekStartsOn: input.weekStartsOn } : {}),
        ...(input.focusDefaultSeconds !== undefined ? { focusDefaultSeconds: input.focusDefaultSeconds } : {}),
        ...(input.language !== undefined ? { language: input.language } : {}),
      },
      create: {
        userId,
        timezone: input.timezone ?? 'UTC',
        theme: input.theme ?? 'system',
        weekStartsOn: input.weekStartsOn ?? 1,
        focusDefaultSeconds: input.focusDefaultSeconds ?? 1500,
        language: input.language ?? 'en',
      },
    })
    return this.preferencesOf(preferences)
  }

  private preferencesOf(
    preferences: {
      timezone: string
      theme: string
      weekStartsOn: number
      focusDefaultSeconds?: number
      language?: string
    } | null,
  ): PublicPreferences {
    return accountPreferences(preferences)
  }
}
