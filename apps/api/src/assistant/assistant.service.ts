import { Inject, Injectable } from '@nestjs/common'
import type { AssistantResult } from '@focusflow/shared-types'
import { ASSISTANT_PROVIDER, type AssistantProvider } from './assistant.provider'

@Injectable()
export class AssistantService {
  constructor(@Inject(ASSISTANT_PROVIDER) private readonly provider: AssistantProvider) {}

  ask(userId: string, prompt: string): Promise<AssistantResult> {
    return this.provider.complete(userId, prompt)
  }
}
