import { BadRequestException, Injectable } from '@nestjs/common'
import type { UpdatePreferencesInput, UpdateProfileInput } from '@focusflow/shared-schemas'
import type { PublicPreferences, ThemePreference } from '@focusflow/shared-types'
import { isValidTimeZone } from '@focusflow/shared-utils'
import { AuthService } from '../auth/auth.service'
import type { AuthContext } from '../auth/auth.types'
import { PrismaService } from '../prisma/prisma.service'

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
      },
      create: {
        userId,
        timezone: input.timezone ?? 'UTC',
        theme: input.theme ?? 'system',
        weekStartsOn: input.weekStartsOn ?? 1,
      },
    })
    return this.preferencesOf(preferences)
  }

  private preferencesOf(
    preferences: { timezone: string; theme: string; weekStartsOn: number } | null,
  ): PublicPreferences {
    const theme = preferences?.theme
    const safeTheme: ThemePreference = theme === 'light' || theme === 'dark' || theme === 'system' ? theme : 'system'
    return {
      timezone: preferences?.timezone ?? 'UTC',
      theme: safeTheme,
      weekStartsOn: preferences?.weekStartsOn ?? 1,
    }
  }
}
