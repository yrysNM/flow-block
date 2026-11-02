import { Controller, Get, Query } from '@nestjs/common'
import { ApiCookieAuth, ApiOperation, ApiQuery, ApiTags } from '@nestjs/swagger'
import { analyticsQuerySchema, type AnalyticsQuery } from '@focusflow/shared-schemas'
import type { AuthContext } from '../auth/auth.types'
import { CurrentUser } from '../common/current-user.decorator'
import { ZodValidationPipe } from '../common/zod-validation.pipe'
import { AnalyticsService } from './analytics.service'

@ApiTags('analytics')
@ApiCookieAuth('session')
@Controller('analytics')
export class AnalyticsController {
  constructor(private readonly analytics: AnalyticsService) {}

  @Get()
  @ApiOperation({ summary: 'Totals and a per-day series for the signed-in user. Numbers are computed on the server.' })
  @ApiQuery({ name: 'range', required: false, enum: ['7', '30'] })
  get(
    @CurrentUser() user: AuthContext,
    @Query(new ZodValidationPipe(analyticsQuerySchema)) query: AnalyticsQuery,
  ) {
    return this.analytics.get(user.id, user.preferences.timezone, user.preferences.weekStartsOn, query.range)
  }
}
