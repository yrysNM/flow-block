import { Body, Controller, Delete, Get, HttpCode, Param, Patch, Post, Query } from '@nestjs/common'
import { ApiCookieAuth, ApiOperation, ApiTags } from '@nestjs/swagger'
import {
  createHabitSchema,
  habitCheckInSchema,
  habitDetailQuerySchema,
  taskIdParamSchema,
  updateHabitSchema,
  type CreateHabitInput,
  type HabitCheckInInput,
  type HabitDetailQuery,
  type UpdateHabitInput,
} from '@focusflow/shared-schemas'
import type { AuthContext } from '../auth/auth.types'
import { CurrentUser } from '../common/current-user.decorator'
import { ZodValidationPipe } from '../common/zod-validation.pipe'
import { HabitsService } from './habits.service'

@ApiTags('habits')
@ApiCookieAuth('session')
@Controller('habits')
export class HabitsController {
  constructor(private readonly habits: HabitsService) {}

  @Get()
  @ApiOperation({ summary: 'List habits with the current streak and today’s count' })
  list(@CurrentUser() user: AuthContext) {
    return this.habits.list(user.id, user.preferences.timezone, user.preferences.weekStartsOn)
  }

  @Post()
  @HttpCode(201)
  @ApiOperation({ summary: 'Create a habit for the current user' })
  create(
    @CurrentUser() user: AuthContext,
    @Body(new ZodValidationPipe(createHabitSchema)) body: CreateHabitInput,
  ) {
    return this.habits.create(user.id, body, user.preferences.timezone, user.preferences.weekStartsOn)
  }

  @Get(':id')
  @ApiOperation({ summary: 'Read one habit and the check-ins for a month' })
  get(
    @CurrentUser() user: AuthContext,
    @Param(new ZodValidationPipe(taskIdParamSchema)) params: { id: string },
    @Query(new ZodValidationPipe(habitDetailQuerySchema)) query: HabitDetailQuery,
  ) {
    return this.habits.get(user.id, params.id, query.month, user.preferences.timezone, user.preferences.weekStartsOn)
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Rename a habit or change its frequency and target' })
  update(
    @CurrentUser() user: AuthContext,
    @Param(new ZodValidationPipe(taskIdParamSchema)) params: { id: string },
    @Body(new ZodValidationPipe(updateHabitSchema)) body: UpdateHabitInput,
  ) {
    return this.habits.update(user.id, params.id, body, user.preferences.timezone, user.preferences.weekStartsOn)
  }

  @Delete(':id')
  @HttpCode(204)
  @ApiOperation({ summary: 'Delete a habit and its check-ins' })
  async remove(
    @CurrentUser() user: AuthContext,
    @Param(new ZodValidationPipe(taskIdParamSchema)) params: { id: string },
  ): Promise<void> {
    await this.habits.remove(user.id, params.id)
  }

  @Post(':id/check-ins')
  @HttpCode(200)
  @ApiOperation({ summary: 'Check in for a local date. A second check-in updates the same entry.' })
  checkIn(
    @CurrentUser() user: AuthContext,
    @Param(new ZodValidationPipe(taskIdParamSchema)) params: { id: string },
    @Body(new ZodValidationPipe(habitCheckInSchema)) body: HabitCheckInInput,
  ) {
    return this.habits.checkIn(user.id, params.id, body, user.preferences.timezone, user.preferences.weekStartsOn)
  }
}
