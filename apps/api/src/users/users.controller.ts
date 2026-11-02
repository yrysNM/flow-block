import { Body, Controller, Get, Patch } from '@nestjs/common'
import { ApiCookieAuth, ApiOperation, ApiTags } from '@nestjs/swagger'
import {
  updatePreferencesSchema,
  updateProfileSchema,
  type UpdatePreferencesInput,
  type UpdateProfileInput,
} from '@focusflow/shared-schemas'
import { CurrentUser } from '../common/current-user.decorator'
import { ZodValidationPipe } from '../common/zod-validation.pipe'
import type { AuthContext } from '../auth/auth.types'
import { UsersService } from './users.service'

@ApiTags('users')
@ApiCookieAuth('session')
@Controller('users')
export class UsersController {
  constructor(private readonly users: UsersService) {}

  @Get('me')
  @ApiOperation({ summary: 'Profile and preferences for the authenticated user' })
  me(@CurrentUser() user: AuthContext) {
    return this.users.profile(user)
  }

  @Patch('me')
  @ApiOperation({ summary: 'Update the display name' })
  updateMe(
    @CurrentUser() user: AuthContext,
    @Body(new ZodValidationPipe(updateProfileSchema)) body: UpdateProfileInput,
  ) {
    return this.users.updateProfile(user.id, body)
  }

  @Patch('me/preferences')
  @ApiOperation({ summary: 'Update timezone, theme, or week start' })
  updatePreferences(
    @CurrentUser() user: AuthContext,
    @Body(new ZodValidationPipe(updatePreferencesSchema)) body: UpdatePreferencesInput,
  ) {
    return this.users.updatePreferences(user.id, body)
  }
}
