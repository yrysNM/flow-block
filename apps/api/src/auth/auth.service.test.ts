import { ConflictException, UnauthorizedException } from '@nestjs/common'
import { createHash } from 'node:crypto'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { PrismaService } from '../prisma/prisma.service'
import { AuthService } from './auth.service'
import { hashPassword } from './password'
import { hashSessionToken } from './session-token'

function createPrisma() {
  return {
    user: {
      findUnique: vi.fn(),
      create: vi.fn(),
    },
    session: {
      create: vi.fn(),
      deleteMany: vi.fn(),
      findUnique: vi.fn(),
      delete: vi.fn(),
    },
  }
}

describe('AuthService', () => {
  let prisma: ReturnType<typeof createPrisma>
  let service: AuthService

  beforeEach(() => {
    prisma = createPrisma()
    service = new AuthService(prisma as unknown as PrismaService)
  })

  it('stores a password hash and a hashed session token, and creates preferences', async () => {
    prisma.user.findUnique.mockResolvedValue(null)
    prisma.user.create.mockImplementation(async ({ data }: { data: { email: string; name: string; passwordHash: string } }) => ({
      id: 'user-1',
      email: data.email,
      name: data.name,
      passwordHash: data.passwordHash,
      preferences: { timezone: 'UTC', theme: 'system', weekStartsOn: 1 },
    }))
    prisma.session.create.mockResolvedValue({})

    const result = await service.register(
      { email: 'ada@example.com', password: 'longenough', name: 'Ada' },
      'vitest',
    )

    const created = prisma.user.create.mock.calls[0]?.[0].data as { passwordHash: string; preferences: { create: object } }
    expect(created.passwordHash).not.toBe('longenough')
    expect(created.passwordHash.startsWith('$argon2')).toBe(true)
    expect(created.preferences).toEqual({ create: {} })

    const session = prisma.session.create.mock.calls[0]?.[0].data as { tokenHash: string; userId: string }
    const unsalted = createHash('sha256').update(result.token).digest('hex')
    expect(session.tokenHash).toBe(hashSessionToken(result.token))
    expect(session.tokenHash).not.toBe(unsalted)
    expect(session.tokenHash).not.toBe(result.token)
    expect(session.userId).toBe('user-1')
    expect(result.user.email).toBe('ada@example.com')
  })

  it('does not create a second account for the same email', async () => {
    prisma.user.findUnique.mockResolvedValue({ id: 'user-1' })
    await expect(
      service.register({ email: 'ada@example.com', password: 'longenough', name: 'Ada' }, undefined),
    ).rejects.toBeInstanceOf(ConflictException)
    expect(prisma.user.create).not.toHaveBeenCalled()
  })

  it('rejects a bad password without creating a session', async () => {
    const passwordHash = await hashPassword('longenough')
    prisma.user.findUnique.mockResolvedValue({
      id: 'user-1',
      email: 'ada@example.com',
      name: 'Ada',
      passwordHash,
      preferences: { timezone: 'UTC', theme: 'system', weekStartsOn: 1 },
    })
    await expect(
      service.login({ email: 'ada@example.com', password: 'wrong-password' }, undefined),
    ).rejects.toBeInstanceOf(UnauthorizedException)
    expect(prisma.session.create).not.toHaveBeenCalled()
  })
})
