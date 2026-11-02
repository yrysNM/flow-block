import { Body, Controller, Delete, Get, HttpCode, Param, Patch, Post, Query } from '@nestjs/common'
import { ApiCookieAuth, ApiOperation, ApiQuery, ApiTags } from '@nestjs/swagger'
import {
  createTaskSchema,
  listTasksQuerySchema,
  taskIdParamSchema,
  taskSummaryQuerySchema,
  updateTaskSchema,
  updateTaskStatusSchema,
  type CreateTaskInput,
  type ListTasksQuery,
  type TaskSummaryQuery,
  type UpdateTaskInput,
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

  @Patch(':id/status')
  @ApiOperation({ summary: 'Change task status' })
  updateStatus(
    @CurrentUser() user: AuthContext,
    @Param(new ZodValidationPipe(taskIdParamSchema)) params: { id: string },
    @Body(new ZodValidationPipe(updateTaskStatusSchema)) body: UpdateTaskStatusInput,
  ) {
    return this.tasks.updateStatus(user.id, params.id, body.status)
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update task fields. Urgency never rewrites status on its own.' })
  update(
    @CurrentUser() user: AuthContext,
    @Param(new ZodValidationPipe(taskIdParamSchema)) params: { id: string },
    @Body(new ZodValidationPipe(updateTaskSchema)) body: UpdateTaskInput,
  ) {
    return this.tasks.update(user.id, params.id, body)
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
