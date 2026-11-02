import { Body, Controller, Delete, Get, HttpCode, Param, Patch, Post } from '@nestjs/common'
import { ApiCookieAuth, ApiOperation, ApiTags } from '@nestjs/swagger'
import {
  createCategorySchema,
  taskIdParamSchema,
  updateCategorySchema,
  type CreateCategoryInput,
  type UpdateCategoryInput,
} from '@focusflow/shared-schemas'
import type { AuthContext } from '../auth/auth.types'
import { CurrentUser } from '../common/current-user.decorator'
import { ZodValidationPipe } from '../common/zod-validation.pipe'
import { CategoriesService } from './categories.service'

@ApiTags('categories')
@ApiCookieAuth('session')
@Controller('categories')
export class CategoriesController {
  constructor(private readonly categories: CategoriesService) {}

  @Get()
  @ApiOperation({ summary: 'List the current user’s categories' })
  list(@CurrentUser() user: AuthContext) {
    return this.categories.list(user.id)
  }

  @Post()
  @HttpCode(201)
  @ApiOperation({ summary: 'Create a category for the current user' })
  create(
    @CurrentUser() user: AuthContext,
    @Body(new ZodValidationPipe(createCategorySchema)) body: CreateCategoryInput,
  ) {
    return this.categories.create(user.id, body)
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Rename a category or change its color' })
  update(
    @CurrentUser() user: AuthContext,
    @Param(new ZodValidationPipe(taskIdParamSchema)) params: { id: string },
    @Body(new ZodValidationPipe(updateCategorySchema)) body: UpdateCategoryInput,
  ) {
    return this.categories.update(user.id, params.id, body)
  }

  @Delete(':id')
  @HttpCode(204)
  @ApiOperation({ summary: 'Delete a category. Tasks keep their other fields and lose the link.' })
  async remove(
    @CurrentUser() user: AuthContext,
    @Param(new ZodValidationPipe(taskIdParamSchema)) params: { id: string },
  ): Promise<void> {
    await this.categories.remove(user.id, params.id)
  }
}
