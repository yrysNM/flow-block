import { Module } from '@nestjs/common'
import { AssistantController } from './assistant.controller'
import { ASSISTANT_PROVIDER, selectAssistantProvider } from './assistant.provider'
import { AssistantService } from './assistant.service'

@Module({
  controllers: [AssistantController],
  providers: [
    AssistantService,
    {
      provide: ASSISTANT_PROVIDER,
      useFactory: () => selectAssistantProvider(process.env),
    },
  ],
})
export class AssistantModule {}
