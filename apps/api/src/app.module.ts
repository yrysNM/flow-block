import { Module } from '@nestjs/common'
import { ConfigModule } from '@nestjs/config'
import { AnalyticsModule } from './analytics/analytics.module'
import { AssistantModule } from './assistant/assistant.module'
import { AuthModule } from './auth/auth.module'
import { CategoriesModule } from './categories/categories.module'
import { FocusModule } from './focus/focus.module'
import { GoalsModule } from './goals/goals.module'
import { HabitsModule } from './habits/habits.module'
import { HealthController } from './health/health.controller'
import { NotificationsModule } from './notifications/notifications.module'
import { PrismaModule } from './prisma/prisma.module'
import { TagsModule } from './tags/tags.module'
import { TasksModule } from './tasks/tasks.module'
import { UsersModule } from './users/users.module'
import { WebsitesModule } from './websites/websites.module'

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    PrismaModule,
    AuthModule,
    UsersModule,
    CategoriesModule,
    TagsModule,
    TasksModule,
    FocusModule,
    WebsitesModule,
    HabitsModule,
    GoalsModule,
    AnalyticsModule,
    AssistantModule,
    NotificationsModule,
  ],
  controllers: [HealthController],
})
export class AppModule {}
