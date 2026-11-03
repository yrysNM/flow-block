import { Body, Controller, Get, Patch } from '@nestjs/common'
import { ApiCookieAuth, ApiOperation, ApiTags } from '@nestjs/swagger'
import {
  changePasswordSchema,
  updatePreferencesSchema,
  updateProfileSchema,
  type ChangePasswordInput,
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

  @Patch('me/password')
  @ApiOperation({ summary: 'Change the password. The current session stays valid.' })
  changePassword(
    @CurrentUser() user: AuthContext,
    @Body(new ZodValidationPipe(changePasswordSchema)) body: ChangePasswordInput,
  ) {
    return this.users.changePassword(user.id, body)
  }

  @Patch('me/preferences')
  @ApiOperation({ summary: 'Update timezone, theme, week start, focus default, or language' })
  updatePreferences(
    @CurrentUser() user: AuthContext,
    @Body(new ZodValidationPipe(updatePreferencesSchema)) body: UpdatePreferencesInput,
  ) {
    return this.users.updatePreferences(user.id, body)
  }
}
