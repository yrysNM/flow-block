import { BadRequestException } from '@nestjs/common'
import { ASSISTANT_PROMPT_MAX_LENGTH, type AssistantResult } from '@focusflow/shared-types'

/** Nest injection token. The interface itself is not a class Nest can construct. */
export const ASSISTANT_PROVIDER = Symbol('ASSISTANT_PROVIDER')

export interface AssistantProviderEnv {
  ASSISTANT_PROVIDER?: string
}

/**
 * One method. `userId` comes from the session. A prompt is text.
 * The result is suggestions, or an honest not-configured state.
 */
export interface AssistantProvider {
  complete(userId: string, prompt: string): Promise<AssistantResult>
}

/**
 * Default provider. It checks the prompt and returns not-configured.
 * It does not call the network and does not write a task.
 */
export class UnconfiguredAssistantProvider implements AssistantProvider {
  async complete(_userId: string, prompt: string): Promise<AssistantResult> {
    const text = prompt.trim()
    if (text.length === 0) {
      throw new BadRequestException('Prompt is required.')
    }
    if (text.length > ASSISTANT_PROMPT_MAX_LENGTH) {
      throw new BadRequestException('Prompt is too long.')
    }
    return { status: 'not-configured' }
  }
}

/**
 * `ASSISTANT_PROVIDER` selects a future implementation.
 * Unset, empty, `unconfigured`, and any unknown name stay on the default.
 * A missing value does not throw and is not required at startup.
 * Add a new case here when a real provider exists. Do not call the network from this function.
 */
export function selectAssistantProvider(env: AssistantProviderEnv): AssistantProvider {
  const name = (env.ASSISTANT_PROVIDER ?? '').trim().toLowerCase()
  switch (name) {
    case '':
    case 'unconfigured':
      return new UnconfiguredAssistantProvider()
    default:
      return new UnconfiguredAssistantProvider()
  }
}
