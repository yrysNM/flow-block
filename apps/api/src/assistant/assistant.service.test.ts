import { BadRequestException } from '@nestjs/common'
import { MODULE_METADATA } from '@nestjs/common/constants'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { AssistantModule } from './assistant.module'
import { selectAssistantProvider, UnconfiguredAssistantProvider } from './assistant.provider'
import { AssistantService } from './assistant.service'

const userId = '22222222-2222-4222-8222-222222222222'

describe('UnconfiguredAssistantProvider', () => {
  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('rejects an empty prompt', async () => {
    const provider = new UnconfiguredAssistantProvider()
    await expect(provider.complete(userId, '   ')).rejects.toBeInstanceOf(BadRequestException)
    await expect(provider.complete(userId, '')).rejects.toBeInstanceOf(BadRequestException)
  })

  it('returns not-configured for a normal prompt and creates no task', async () => {
    const fetchSpy = vi.spyOn(globalThis, 'fetch').mockRejectedValue(new Error('network must not be called'))
    const provider = new UnconfiguredAssistantProvider()
    const service = new AssistantService(provider)

    await expect(service.ask(userId, 'Outline the chapter')).resolves.toEqual({ status: 'not-configured' })
    expect(fetchSpy).not.toHaveBeenCalled()
  })

  it('rejects a prompt that is too long', async () => {
    const provider = new UnconfiguredAssistantProvider()
    await expect(provider.complete(userId, 'a'.repeat(2001))).rejects.toBeInstanceOf(BadRequestException)
  })

  it('stays unconfigured when the environment variable is missing or unknown', async () => {
    const fetchSpy = vi.spyOn(globalThis, 'fetch').mockRejectedValue(new Error('network must not be called'))
    const missing = selectAssistantProvider({})
    const unknown = selectAssistantProvider({ ASSISTANT_PROVIDER: 'some-future-model' })
    const named = selectAssistantProvider({ ASSISTANT_PROVIDER: ' Unconfigured ' })

    await expect(missing.complete(userId, 'Plan the outline')).resolves.toEqual({ status: 'not-configured' })
    await expect(unknown.complete(userId, 'Plan the outline')).resolves.toEqual({ status: 'not-configured' })
    await expect(named.complete(userId, 'Plan the outline')).resolves.toEqual({ status: 'not-configured' })
    expect(fetchSpy).not.toHaveBeenCalled()
  })

  it('does not register a task writer', () => {
    const imports = Reflect.getMetadata(MODULE_METADATA.IMPORTS, AssistantModule) ?? []
    const providers = Reflect.getMetadata(MODULE_METADATA.PROVIDERS, AssistantModule) ?? []
    const labels = [...imports, ...providers].map((item: unknown) => {
      if (typeof item === 'function') return item.name
      if (item && typeof item === 'object' && 'provide' in item) return String(item.provide)
      return ''
    })
    expect(labels.join(' ')).not.toMatch(/Task/)
    expect(labels.join(' ')).not.toMatch(/Prisma/)
  })
})
