import { Body, Controller, Delete, Get, HttpCode, Param, Patch, Post } from '@nestjs/common'
import { ApiCookieAuth, ApiOperation, ApiTags } from '@nestjs/swagger'
import {
  createTagSchema,
  taskIdParamSchema,
  updateTagSchema,
  type CreateTagInput,
  type UpdateTagInput,
} from '@focusflow/shared-schemas'
import type { AuthContext } from '../auth/auth.types'
import { CurrentUser } from '../common/current-user.decorator'
import { ZodValidationPipe } from '../common/zod-validation.pipe'
import { TagsService } from './tags.service'

@ApiTags('tags')
@ApiCookieAuth('session')
@Controller('tags')
export class TagsController {
  constructor(private readonly tags: TagsService) {}

  @Get()
  @ApiOperation({ summary: 'List the current user’s tags' })
  list(@CurrentUser() user: AuthContext) {
    return this.tags.list(user.id)
  }

  @Post()
  @HttpCode(201)
  @ApiOperation({ summary: 'Create a tag for the current user' })
  create(
    @CurrentUser() user: AuthContext,
    @Body(new ZodValidationPipe(createTagSchema)) body: CreateTagInput,
  ) {
    return this.tags.create(user.id, body)
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Rename a tag' })
  update(
    @CurrentUser() user: AuthContext,
    @Param(new ZodValidationPipe(taskIdParamSchema)) params: { id: string },
    @Body(new ZodValidationPipe(updateTagSchema)) body: UpdateTagInput,
  ) {
    return this.tags.update(user.id, params.id, body)
  }

  @Delete(':id')
  @HttpCode(204)
  @ApiOperation({ summary: 'Delete a tag and its assignments' })
  async remove(
    @CurrentUser() user: AuthContext,
    @Param(new ZodValidationPipe(taskIdParamSchema)) params: { id: string },
  ): Promise<void> {
    await this.tags.remove(user.id, params.id)
  }
}
