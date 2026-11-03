import { Body, Controller, Delete, Get, HttpCode, Param, Patch, Post, Query } from '@nestjs/common'
import { ApiCookieAuth, ApiOperation, ApiQuery, ApiTags } from '@nestjs/swagger'
import {
  attachTagSchema,
  boardTasksQuerySchema,
  createSubtaskSchema,
  createTaskSchema,
  listTasksQuerySchema,
  reorderSubtasksSchema,
  taskIdParamSchema,
  taskSubtaskParamsSchema,
  taskSummaryQuerySchema,
  taskTagParamsSchema,
  updateSubtaskSchema,
  updateTaskQuadrantSchema,
  updateTaskScheduleSchema,
  updateTaskSchema,
  updateTaskStatusSchema,
  type AttachTagInput,
  type BoardTasksQuery,
  type CreateSubtaskInput,
  type CreateTaskInput,
  type ListTasksQuery,
  type ReorderSubtasksInput,
  type TaskSummaryQuery,
  type UpdateSubtaskInput,
  type UpdateTaskInput,
  type UpdateTaskQuadrantInput,
  type UpdateTaskScheduleInput,
  type UpdateTaskStatusInput,
} from '@focusflow/shared-schemas'
import type { AuthContext } from '../auth/auth.types'
import { CurrentUser } from '../common/current-user.decorator'
import { ZodValidationPipe } from '../common/zod-validation.pipe'
import { TasksService } from './tasks.service'

@ApiTags('tasks')
@ApiCookieAuth('session')
@Controller('tasks')
export class TasksController {
  constructor(private readonly tasks: TasksService) {}

  @Get()
  @ApiOperation({ summary: 'List the current user’s tasks' })
  @ApiQuery({ name: 'status', required: false, enum: ['TODO', 'IN_PROGRESS', 'COMPLETED'] })
  @ApiQuery({ name: 'priority', required: false, enum: ['LOW', 'MEDIUM', 'HIGH', 'URGENT'] })
  @ApiQuery({ name: 'categoryId', required: false, description: 'Category id, or none for uncategorized' })
  @ApiQuery({ name: 'q', required: false, description: 'Case-insensitive title or description search' })
  @ApiQuery({ name: 'sort', required: false, enum: ['createdAt', 'updatedAt', 'deadline', 'priority', 'title'] })
  @ApiQuery({ name: 'order', required: false, enum: ['asc', 'desc'] })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'pageSize', required: false, type: Number })
  list(
    @CurrentUser() user: AuthContext,
    @Query(new ZodValidationPipe(listTasksQuerySchema)) query: ListTasksQuery,
  ) {
    return this.tasks.list(user.id, query)
  }

  @Get('summary')
  @ApiOperation({ summary: 'Status counts and tasks due on a local date' })
  @ApiQuery({ name: 'date', required: false, description: 'YYYY-MM-DD in the user time zone' })
  summary(
    @CurrentUser() user: AuthContext,
    @Query(new ZodValidationPipe(taskSummaryQuerySchema)) query: TaskSummaryQuery,
  ) {
    return this.tasks.summary(user.id, query.date, user.preferences.timezone)
  }

  @Get('board')
  @ApiOperation({ summary: 'Kanban columns for the same tasks, with full counts per status' })
  @ApiQuery({ name: 'priority', required: false, enum: ['LOW', 'MEDIUM', 'HIGH', 'URGENT'] })
  @ApiQuery({ name: 'categoryId', required: false })
  @ApiQuery({ name: 'q', required: false })
  board(
    @CurrentUser() user: AuthContext,
    @Query(new ZodValidationPipe(boardTasksQuerySchema)) query: BoardTasksQuery,
  ) {
    return this.tasks.board(user.id, query)
  }

  @Get('matrix')
  @ApiOperation({ summary: 'Eisenhower quadrants derived from urgent and important' })
  @ApiQuery({ name: 'priority', required: false, enum: ['LOW', 'MEDIUM', 'HIGH', 'URGENT'] })
  @ApiQuery({ name: 'categoryId', required: false })
  @ApiQuery({ name: 'q', required: false })
  matrix(
    @CurrentUser() user: AuthContext,
    @Query(new ZodValidationPipe(boardTasksQuerySchema)) query: BoardTasksQuery,
  ) {
    return this.tasks.matrix(user.id, query)
  }

  @Get('planner')
  @ApiOperation({ summary: 'Scheduled blocks on one local day, plus tasks with no block' })
  @ApiQuery({ name: 'date', required: false, description: 'YYYY-MM-DD in the user time zone' })
  planner(
    @CurrentUser() user: AuthContext,
    @Query(new ZodValidationPipe(taskSummaryQuerySchema)) query: TaskSummaryQuery,
  ) {
    return this.tasks.planner(user.id, query.date, user.preferences.timezone)
  }

  @Get(':id')
  @ApiOperation({ summary: 'Read one task' })
  get(
    @CurrentUser() user: AuthContext,
    @Param(new ZodValidationPipe(taskIdParamSchema)) params: { id: string },
  ) {
    return this.tasks.get(user.id, params.id)
  }

  @Post()
  @HttpCode(201)
  @ApiOperation({ summary: 'Create a task' })
  create(
    @CurrentUser() user: AuthContext,
    @Body(new ZodValidationPipe(createTaskSchema)) body: CreateTaskInput,
  ) {
    return this.tasks.create(user.id, body)
  }

  @Post(':id/tags')
  @ApiOperation({ summary: 'Attach one of the current user’s tags. Repeating the same tag is a no-op.' })
  attachTag(
    @CurrentUser() user: AuthContext,
    @Param(new ZodValidationPipe(taskIdParamSchema)) params: { id: string },
    @Body(new ZodValidationPipe(attachTagSchema)) body: AttachTagInput,
  ) {
    return this.tasks.attachTag(user.id, params.id, body.tagId)
  }

  @Delete(':id/tags/:tagId')
  @ApiOperation({ summary: 'Detach a tag from a task' })
  detachTag(
    @CurrentUser() user: AuthContext,
    @Param(new ZodValidationPipe(taskTagParamsSchema)) params: { id: string; tagId: string },
  ) {
    return this.tasks.detachTag(user.id, params.id, params.tagId)
  }

  @Post(':id/subtasks')
  @HttpCode(201)
  @ApiOperation({ summary: 'Add a subtask at the end of the list' })
  addSubtask(
    @CurrentUser() user: AuthContext,
    @Param(new ZodValidationPipe(taskIdParamSchema)) params: { id: string },
    @Body(new ZodValidationPipe(createSubtaskSchema)) body: CreateSubtaskInput,
  ) {
    return this.tasks.addSubtask(user.id, params.id, body)
  }

  @Patch(':id/subtasks/reorder')
  @ApiOperation({ summary: 'Reorder subtasks. The id list must be a permutation of this task’s subtasks.' })
  reorderSubtasks(
    @CurrentUser() user: AuthContext,
    @Param(new ZodValidationPipe(taskIdParamSchema)) params: { id: string },
    @Body(new ZodValidationPipe(reorderSubtasksSchema)) body: ReorderSubtasksInput,
  ) {
    return this.tasks.reorderSubtasks(user.id, params.id, body)
  }

  @Patch(':id/subtasks/:subtaskId')
  @ApiOperation({ summary: 'Rename a subtask or toggle it. Does not change the parent task.' })
  updateSubtask(
    @CurrentUser() user: AuthContext,
    @Param(new ZodValidationPipe(taskSubtaskParamsSchema)) params: { id: string; subtaskId: string },
    @Body(new ZodValidationPipe(updateSubtaskSchema)) body: UpdateSubtaskInput,
  ) {
    return this.tasks.updateSubtask(user.id, params.id, params.subtaskId, body)
  }

  @Delete(':id/subtasks/:subtaskId')
  @HttpCode(204)
  @ApiOperation({ summary: 'Delete a subtask' })
  async removeSubtask(
    @CurrentUser() user: AuthContext,
    @Param(new ZodValidationPipe(taskSubtaskParamsSchema)) params: { id: string; subtaskId: string },
  ): Promise<void> {
    await this.tasks.removeSubtask(user.id, params.id, params.subtaskId)
  }

  @Patch(':id/status')
  @ApiOperation({ summary: 'Change task status. Does not change urgent or important. Completing a recurring task creates one next open task.' })
  updateStatus(
    @CurrentUser() user: AuthContext,
    @Param(new ZodValidationPipe(taskIdParamSchema)) params: { id: string },
    @Body(new ZodValidationPipe(updateTaskStatusSchema)) body: UpdateTaskStatusInput,
  ) {
    return this.tasks.updateStatus(user.id, params.id, body.status, user.preferences.timezone)
  }

  @Patch(':id/quadrant')
  @ApiOperation({ summary: 'Set urgent and important. Does not change status.' })
  updateQuadrant(
    @CurrentUser() user: AuthContext,
    @Param(new ZodValidationPipe(taskIdParamSchema)) params: { id: string },
    @Body(new ZodValidationPipe(updateTaskQuadrantSchema)) body: UpdateTaskQuadrantInput,
  ) {
    return this.tasks.updateQuadrant(user.id, params.id, body)
  }

  @Patch(':id/schedule')
  @ApiOperation({ summary: 'Set or clear the single time block. Does not change status or quadrant.' })
  updateSchedule(
    @CurrentUser() user: AuthContext,
    @Param(new ZodValidationPipe(taskIdParamSchema)) params: { id: string },
    @Body(new ZodValidationPipe(updateTaskScheduleSchema)) body: UpdateTaskScheduleInput,
  ) {
    return this.tasks.updateSchedule(user.id, params.id, body, user.preferences.timezone)
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update task fields. Urgency never rewrites status on its own.' })
  update(
    @CurrentUser() user: AuthContext,
    @Param(new ZodValidationPipe(taskIdParamSchema)) params: { id: string },
    @Body(new ZodValidationPipe(updateTaskSchema)) body: UpdateTaskInput,
  ) {
    return this.tasks.update(user.id, params.id, body, user.preferences.timezone)
  }

  @Delete(':id')
  @HttpCode(204)
  @ApiOperation({ summary: 'Delete a task' })
  async remove(
    @CurrentUser() user: AuthContext,
    @Param(new ZodValidationPipe(taskIdParamSchema)) params: { id: string },
  ): Promise<void> {
    await this.tasks.remove(user.id, params.id)
  }
}
