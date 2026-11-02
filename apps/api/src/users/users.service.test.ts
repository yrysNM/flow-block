import { UnauthorizedException } from '@nestjs/common'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { PrismaService } from '../prisma/prisma.service'
import { hashPassword, verifyPassword } from '../auth/password'
import type { AuthService } from '../auth/auth.service'
import { UsersService } from './users.service'

const USER_ID = '22222222-2222-4222-8222-222222222222'

function createPrisma() {
  return {
    user: {
      findUnique: vi.fn(),
      update: vi.fn(),
    },
    userPreferences: {
      upsert: vi.fn(),
    },
    session: {
      deleteMany: vi.fn(),
    },
  }
}

function preferenceRow(theme: string, focusDefaultSeconds = 1500) {
  return {
    timezone: 'UTC',
    theme,
    weekStartsOn: 1,
    focusDefaultSeconds,
    language: 'en',
  }
}

describe('UsersService account security', () => {
  let prisma: ReturnType<typeof createPrisma>
  let service: UsersService

  beforeEach(() => {
    prisma = createPrisma()
    service = new UsersService(prisma as unknown as PrismaService, {} as AuthService)
  })

  it('does not change the password hash when the current password is wrong', async () => {
    const passwordHash = await hashPassword('correct-horse')
    prisma.user.findUnique.mockResolvedValue({ passwordHash })

    await expect(service.changePassword(USER_ID, {
      currentPassword: 'wrong-password',
      newPassword: 'another-long',
    })).rejects.toBeInstanceOf(UnauthorizedException)

    expect(prisma.user.update).not.toHaveBeenCalled()
    expect(prisma.session.deleteMany).not.toHaveBeenCalled()
    expect(passwordHash.startsWith('$argon2')).toBe(true)
  })

  it('stores a new hash and leaves the session in place', async () => {
    const passwordHash = await hashPassword('correct-horse')
    prisma.user.findUnique.mockResolvedValue({ passwordHash })
    prisma.user.update.mockResolvedValue({})

    const result = await service.changePassword(USER_ID, {
      currentPassword: 'correct-horse',
      newPassword: 'another-long',
    })

    const written = prisma.user.update.mock.calls[0]?.[0] as {
      where: { id: string }
      data: { passwordHash: string }
    }
    expect(written.where).toEqual({ id: USER_ID })
    expect(written.data.passwordHash).not.toBe(passwordHash)
    expect(written.data.passwordHash).not.toBe('another-long')
    expect(await verifyPassword(written.data.passwordHash, 'another-long')).toBe(true)
    expect(prisma.session.deleteMany).not.toHaveBeenCalled()
    expect(result).toEqual({ ok: true })
  })

  it('round-trips a theme preference', async () => {
    prisma.userPreferences.upsert.mockImplementation(async (args: { update: { theme?: string } }) => (
      preferenceRow(args.update.theme ?? 'system')
    ))

    const dark = await service.updatePreferences(USER_ID, { theme: 'dark' })
    expect(prisma.userPreferences.upsert).toHaveBeenCalledWith(expect.objectContaining({
      where: { userId: USER_ID },
      update: { theme: 'dark' },
    }))
    expect(dark.theme).toBe('dark')

    const light = await service.updatePreferences(USER_ID, { theme: 'light' })
    expect(light.theme).toBe('light')
    expect(light.language).toBe('en')
    expect(light.focusDefaultSeconds).toBe(1500)
  })
})
