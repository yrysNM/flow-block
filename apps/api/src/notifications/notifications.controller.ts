import { Controller, Get, HttpCode, Param, Post } from '@nestjs/common'
import { ApiCookieAuth, ApiOperation, ApiTags } from '@nestjs/swagger'
import { taskIdParamSchema } from '@focusflow/shared-schemas'
import type { AuthContext } from '../auth/auth.types'
import { CurrentUser } from '../common/current-user.decorator'
import { ZodValidationPipe } from '../common/zod-validation.pipe'
import { NotificationsService } from './notifications.service'

@ApiTags('notifications')
@ApiCookieAuth('session')
@Controller('notifications')
export class NotificationsController {
  constructor(private readonly notifications: NotificationsService) {}

  @Get()
  @ApiOperation({ summary: 'In-app notifications for the signed-in user, newest first, with the unread count.' })
  list(@CurrentUser() user: AuthContext) {
    return this.notifications.list(user.id)
  }

  @Post('read-all')
  @HttpCode(200)
  @ApiOperation({ summary: 'Mark every unread notification for the signed-in user as read. A second call changes nothing.' })
  markAllRead(@CurrentUser() user: AuthContext) {
    return this.notifications.markAllRead(user.id)
  }

  @Post(':id/read')
  @HttpCode(200)
  @ApiOperation({ summary: 'Mark one notification read. A second call keeps the original read time. Another user’s id is not found.' })
  markRead(
    @CurrentUser() user: AuthContext,
    @Param(new ZodValidationPipe(taskIdParamSchema)) params: { id: string },
  ) {
    return this.notifications.markRead(user.id, params.id)
  }
}
