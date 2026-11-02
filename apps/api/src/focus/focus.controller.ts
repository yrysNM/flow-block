import { Body, Controller, Get, Param, Post, Query, Res } from '@nestjs/common'
import { ApiCookieAuth, ApiOperation, ApiQuery, ApiTags } from '@nestjs/swagger'
import {
  focusSessionIdParamSchema,
  listFocusSessionsQuerySchema,
  startFocusSessionSchema,
  type ListFocusSessionsQuery,
  type StartFocusSessionInput,
} from '@focusflow/shared-schemas'
import type { Response } from 'express'
import type { AuthContext } from '../auth/auth.types'
import { CurrentUser } from '../common/current-user.decorator'
import { ZodValidationPipe } from '../common/zod-validation.pipe'
import { FocusService } from './focus.service'

@ApiTags('focus-sessions')
@ApiCookieAuth('session')
@Controller('focus-sessions')
export class FocusController {
  constructor(private readonly focus: FocusService) {}

  @Get('active')
  @ApiOperation({ summary: 'The current user’s active focus session, or null' })
  active(@CurrentUser() user: AuthContext) {
    return this.focus.active(user.id)
  }

  @Get()
  @ApiOperation({ summary: 'Ended focus sessions for the current user, newest first' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'pageSize', required: false, type: Number })
  history(
    @CurrentUser() user: AuthContext,
    @Query(new ZodValidationPipe(listFocusSessionsQuerySchema)) query: ListFocusSessionsQuery,
  ) {
    return this.focus.history(user.id, query)
  }

  @Post()
  @ApiOperation({ summary: 'Start a focus session. Returns the active one when one already exists' })
  async start(
    @CurrentUser() user: AuthContext,
    @Body(new ZodValidationPipe(startFocusSessionSchema)) body: StartFocusSessionInput,
    @Res({ passthrough: true }) response: Response,
  ) {
    const result = await this.focus.start(user.id, body)
    response.status(result.created ? 201 : 200)
    return result.session
  }

  @Post(':id/pause')
  @ApiOperation({ summary: 'Pause the active session. A second pause does not add time' })
  pause(
    @CurrentUser() user: AuthContext,
    @Param(new ZodValidationPipe(focusSessionIdParamSchema)) params: { id: string },
  ) {
    return this.focus.pause(user.id, params.id)
  }

  @Post(':id/resume')
  @ApiOperation({ summary: 'Resume a paused session and close the open pause interval' })
  resume(
    @CurrentUser() user: AuthContext,
    @Param(new ZodValidationPipe(focusSessionIdParamSchema)) params: { id: string },
  ) {
    return this.focus.resume(user.id, params.id)
  }

  @Post(':id/complete')
  @ApiOperation({ summary: 'End the session as completed. Does not change the task status' })
  complete(
    @CurrentUser() user: AuthContext,
    @Param(new ZodValidationPipe(focusSessionIdParamSchema)) params: { id: string },
  ) {
    return this.focus.complete(user.id, params.id)
  }

  @Post(':id/stop')
  @ApiOperation({ summary: 'End the session without completing it. Does not change the task status' })
  stop(
    @CurrentUser() user: AuthContext,
    @Param(new ZodValidationPipe(focusSessionIdParamSchema)) params: { id: string },
  ) {
    return this.focus.stop(user.id, params.id)
  }
}
