import { Body, Controller, Delete, Get, HttpCode, Param, Patch, Post, Query } from '@nestjs/common'
import { ApiCookieAuth, ApiOperation, ApiQuery, ApiTags } from '@nestjs/swagger'
import {
  createWebsiteRuleSchema,
  recordWebsiteUsageSchema,
  taskIdParamSchema,
  updateWebsiteRuleSchema,
  websiteUsageQuerySchema,
  type CreateWebsiteRuleInput,
  type RecordWebsiteUsageInput,
  type UpdateWebsiteRuleInput,
  type WebsiteUsageQuery,
} from '@focusflow/shared-schemas'
import type { AuthContext } from '../auth/auth.types'
import { CurrentUser } from '../common/current-user.decorator'
import { ZodValidationPipe } from '../common/zod-validation.pipe'
import { WebsitesService } from './websites.service'

@ApiTags('websites')
@ApiCookieAuth('session')
@Controller('websites')
export class WebsitesController {
  constructor(private readonly websites: WebsitesService) {}

  @Get()
  @ApiOperation({ summary: 'List the current user’s website rules' })
  list(@CurrentUser() user: AuthContext) {
    return this.websites.list(user.id)
  }

  @Get('usage')
  @ApiOperation({ summary: 'Usage totals for the current user’s rules on one local date' })
  @ApiQuery({ name: 'date', required: false, description: 'YYYY-MM-DD in the user time zone' })
  usage(
    @CurrentUser() user: AuthContext,
    @Query(new ZodValidationPipe(websiteUsageQuerySchema)) query: WebsiteUsageQuery,
  ) {
    return this.websites.usage(user.id, user.preferences.timezone, query.date)
  }

  @Post('usage-events')
  @HttpCode(200)
  @ApiOperation({ summary: 'Record a visit. A repeated client event id does not add time again' })
  record(
    @CurrentUser() user: AuthContext,
    @Body(new ZodValidationPipe(recordWebsiteUsageSchema)) body: RecordWebsiteUsageInput,
  ) {
    return this.websites.recordEvent(user.id, user.preferences.timezone, body)
  }

  @Post()
  @HttpCode(201)
  @ApiOperation({ summary: 'Create a website rule for the current user' })
  create(
    @CurrentUser() user: AuthContext,
    @Body(new ZodValidationPipe(createWebsiteRuleSchema)) body: CreateWebsiteRuleInput,
  ) {
    return this.websites.create(user.id, body)
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update one of the current user’s website rules' })
  update(
    @CurrentUser() user: AuthContext,
    @Param(new ZodValidationPipe(taskIdParamSchema)) params: { id: string },
    @Body(new ZodValidationPipe(updateWebsiteRuleSchema)) body: UpdateWebsiteRuleInput,
  ) {
    return this.websites.update(user.id, params.id, body)
  }

  @Delete(':id')
  @HttpCode(204)
  @ApiOperation({ summary: 'Delete one of the current user’s website rules' })
  async remove(
    @CurrentUser() user: AuthContext,
    @Param(new ZodValidationPipe(taskIdParamSchema)) params: { id: string },
  ): Promise<void> {
    await this.websites.remove(user.id, params.id)
  }
}
