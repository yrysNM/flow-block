import { Body, Controller, Delete, Get, HttpCode, Param, Patch, Post } from '@nestjs/common'
import { ApiCookieAuth, ApiOperation, ApiTags } from '@nestjs/swagger'
import {
  createGoalSchema,
  createMilestoneSchema,
  goalMilestoneParamsSchema,
  goalTaskParamsSchema,
  linkGoalTaskSchema,
  reorderMilestonesSchema,
  taskIdParamSchema,
  updateGoalSchema,
  updateMilestoneSchema,
  type CreateGoalInput,
  type CreateMilestoneInput,
  type LinkGoalTaskInput,
  type ReorderMilestonesInput,
  type UpdateGoalInput,
  type UpdateMilestoneInput,
} from '@focusflow/shared-schemas'
import type { AuthContext } from '../auth/auth.types'
import { CurrentUser } from '../common/current-user.decorator'
import { ZodValidationPipe } from '../common/zod-validation.pipe'
import { GoalsService } from './goals.service'

@ApiTags('goals')
@ApiCookieAuth('session')
@Controller('goals')
export class GoalsController {
  constructor(private readonly goals: GoalsService) {}

  @Get()
  @ApiOperation({ summary: 'List goals with derived progress' })
  list(@CurrentUser() user: AuthContext) {
    return this.goals.list(user.id)
  }

  @Post()
  @HttpCode(201)
  @ApiOperation({ summary: 'Create a goal for the current user' })
  create(
    @CurrentUser() user: AuthContext,
    @Body(new ZodValidationPipe(createGoalSchema)) body: CreateGoalInput,
  ) {
    return this.goals.create(user.id, body)
  }

  @Get(':id')
  @ApiOperation({ summary: 'Read one goal, its milestones, and linked tasks' })
  get(
    @CurrentUser() user: AuthContext,
    @Param(new ZodValidationPipe(taskIdParamSchema)) params: { id: string },
  ) {
    return this.goals.get(user.id, params.id)
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update a goal. Progress is not a writable field.' })
  update(
    @CurrentUser() user: AuthContext,
    @Param(new ZodValidationPipe(taskIdParamSchema)) params: { id: string },
    @Body(new ZodValidationPipe(updateGoalSchema)) body: UpdateGoalInput,
  ) {
    return this.goals.update(user.id, params.id, body)
  }

  @Delete(':id')
  @HttpCode(204)
  @ApiOperation({ summary: 'Delete a goal, its milestones, and its task links' })
  async remove(
    @CurrentUser() user: AuthContext,
    @Param(new ZodValidationPipe(taskIdParamSchema)) params: { id: string },
  ): Promise<void> {
    await this.goals.remove(user.id, params.id)
  }

  @Post(':id/milestones')
  @HttpCode(201)
  @ApiOperation({ summary: 'Add a milestone' })
  addMilestone(
    @CurrentUser() user: AuthContext,
    @Param(new ZodValidationPipe(taskIdParamSchema)) params: { id: string },
    @Body(new ZodValidationPipe(createMilestoneSchema)) body: CreateMilestoneInput,
  ) {
    return this.goals.addMilestone(user.id, params.id, body)
  }

  @Post(':id/milestones/reorder')
  @ApiOperation({ summary: 'Reorder milestones. The id list must be a permutation of the current set.' })
  reorderMilestones(
    @CurrentUser() user: AuthContext,
    @Param(new ZodValidationPipe(taskIdParamSchema)) params: { id: string },
    @Body(new ZodValidationPipe(reorderMilestonesSchema)) body: ReorderMilestonesInput,
  ) {
    return this.goals.reorderMilestones(user.id, params.id, body)
  }

  @Patch(':id/milestones/:milestoneId')
  @ApiOperation({ summary: 'Rename a milestone or mark it complete. Progress is derived afterward.' })
  updateMilestone(
    @CurrentUser() user: AuthContext,
    @Param(new ZodValidationPipe(goalMilestoneParamsSchema)) params: { id: string; milestoneId: string },
    @Body(new ZodValidationPipe(updateMilestoneSchema)) body: UpdateMilestoneInput,
  ) {
    return this.goals.updateMilestone(user.id, params.id, params.milestoneId, body)
  }

  @Delete(':id/milestones/:milestoneId')
  @HttpCode(204)
  @ApiOperation({ summary: 'Delete a milestone' })
  async removeMilestone(
    @CurrentUser() user: AuthContext,
    @Param(new ZodValidationPipe(goalMilestoneParamsSchema)) params: { id: string; milestoneId: string },
  ): Promise<void> {
    await this.goals.removeMilestone(user.id, params.id, params.milestoneId)
  }

  @Post(':id/tasks')
  @ApiOperation({ summary: 'Link an existing task. The task stays a task.' })
  linkTask(
    @CurrentUser() user: AuthContext,
    @Param(new ZodValidationPipe(taskIdParamSchema)) params: { id: string },
    @Body(new ZodValidationPipe(linkGoalTaskSchema)) body: LinkGoalTaskInput,
  ) {
    return this.goals.linkTask(user.id, params.id, body)
  }

  @Delete(':id/tasks/:taskId')
  @ApiOperation({ summary: 'Remove a task link. The task itself is not deleted.' })
  unlinkTask(
    @CurrentUser() user: AuthContext,
    @Param(new ZodValidationPipe(goalTaskParamsSchema)) params: { id: string; taskId: string },
  ) {
    return this.goals.unlinkTask(user.id, params.id, params.taskId)
  }
}
