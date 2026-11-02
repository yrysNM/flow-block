import { Body, Controller, HttpCode, Post } from '@nestjs/common'
import { ApiCookieAuth, ApiOperation, ApiTags } from '@nestjs/swagger'
import { assistantPromptSchema, type AssistantPromptInput } from '@focusflow/shared-schemas'
import type { AuthContext } from '../auth/auth.types'
import { CurrentUser } from '../common/current-user.decorator'
import { ZodValidationPipe } from '../common/zod-validation.pipe'
import { AssistantService } from './assistant.service'

@ApiTags('assistant')
@ApiCookieAuth('session')
@Controller('assistant')
export class AssistantController {
  constructor(private readonly assistant: AssistantService) {}

  @Post()
  @HttpCode(200)
  @ApiOperation({
    summary: 'Ask the assistant. The default provider validates the prompt and returns not-configured. It creates no task.',
  })
  ask(
    @CurrentUser() user: AuthContext,
    @Body(new ZodValidationPipe(assistantPromptSchema)) body: AssistantPromptInput,
  ) {
    return this.assistant.ask(user.id, body.prompt)
  }
}
