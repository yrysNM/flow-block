import {
  ACCOUNT_LANGUAGE,
  FOCUS_MAX_PLANNED_SECONDS,
  FOCUS_MIN_PLANNED_SECONDS,
  GOAL_STATUSES,
  HABIT_FREQUENCIES,
  TASK_PRIORITIES,
  TASK_STATUSES,
  THEME_PREFERENCES,
  WEBSITE_RULE_MODES,
} from '@focusflow/shared-types'
import { z } from 'zod'

const isoDateTime = z
  .string()
  .refine((value) => value.includes('T') && !Number.isNaN(Date.parse(value)), {
    message: 'Expected an ISO-8601 datetime',
  })

export const taskStatusSchema = z.enum(TASK_STATUSES)
export const taskPrioritySchema = z.enum(TASK_PRIORITIES)
export const themePreferenceSchema = z.enum(THEME_PREFERENCES)

export const registerSchema = z.object({
  email: z
    .string()
    .trim()
    .toLowerCase()
    .max(320)
    .pipe(z.email()),
  password: z.string().min(8).max(200),
  name: z.string().trim().min(1).max(80),
})

export const loginSchema = z.object({
  email: z
    .string()
    .trim()
    .toLowerCase()
    .max(320)
    .pipe(z.email()),
  password: z.string().min(1).max(200),
})

export const updateProfileSchema = z.object({
  name: z.string().trim().min(1).max(80),
})

export const changePasswordSchema = z.object({
  currentPassword: z.string().min(1).max(200),
  newPassword: z.string().min(8).max(200),
})

export const updatePreferencesSchema = z
  .object({
    timezone: z.string().trim().min(1).max(100).optional(),
    theme: themePreferenceSchema.optional(),
    weekStartsOn: z.number().int().min(0).max(6).optional(),
    focusDefaultSeconds: z.number().int().min(FOCUS_MIN_PLANNED_SECONDS).max(FOCUS_MAX_PLANNED_SECONDS).optional(),
    language: z.literal(ACCOUNT_LANGUAGE).optional(),
  })
  .refine((value) => Object.values(value).some((item) => item !== undefined), {
    message: 'At least one preference is required',
  })

export const createTaskSchema = z.object({
  title: z.string().trim().min(1).max(200),
  description: z.string().trim().max(5000).nullable().optional(),
  status: taskStatusSchema.optional(),
  priority: taskPrioritySchema.optional(),
  isUrgent: z.boolean().optional(),
  isImportant: z.boolean().optional(),
  deadline: isoDateTime.nullable().optional(),
  categoryId: z.uuid().nullable().optional(),
})

export const updateTaskSchema = z
  .object({
    title: z.string().trim().min(1).max(200).optional(),
    description: z.string().trim().max(5000).nullable().optional(),
    status: taskStatusSchema.optional(),
    priority: taskPrioritySchema.optional(),
    isUrgent: z.boolean().optional(),
    isImportant: z.boolean().optional(),
    deadline: isoDateTime.nullable().optional(),
    categoryId: z.uuid().nullable().optional(),
  })
  .refine((value) => Object.values(value).some((item) => item !== undefined), {
    message: 'At least one field is required',
  })

export const updateTaskStatusSchema = z.object({
  status: taskStatusSchema,
})

export const updateTaskQuadrantSchema = z.object({
  isUrgent: z.boolean(),
  isImportant: z.boolean(),
})

export const updateTaskScheduleSchema = z
  .object({
    scheduledStart: isoDateTime.nullable(),
    scheduledEnd: isoDateTime.nullable(),
  })
  .refine(
    (value) =>
      (value.scheduledStart === null && value.scheduledEnd === null)
      || (value.scheduledStart !== null && value.scheduledEnd !== null),
    { message: 'Set both start and end, or clear both' },
  )

const hexColorSchema = z.string().regex(/^#[0-9A-Fa-f]{6}$/, 'Expected a color like #3366FF')

function blankToUndefined(value: unknown): unknown {
  if (typeof value !== 'string') return value
  const trimmed = value.trim()
  return trimmed.length === 0 ? undefined : trimmed
}

const optionalSearchSchema = z.preprocess(blankToUndefined, z.string().max(200).optional())

const categoryFilterSchema = z.union([z.uuid(), z.literal('none')])

export const createCategorySchema = z.object({
  name: z.string().trim().min(1).max(60),
  color: hexColorSchema.nullable().optional(),
})

export const updateCategorySchema = z
  .object({
    name: z.string().trim().min(1).max(60).optional(),
    color: hexColorSchema.nullable().optional(),
  })
  .refine((value) => Object.values(value).some((item) => item !== undefined), {
    message: 'At least one field is required',
  })

export const createTagSchema = z.object({
  name: z.string().trim().min(1).max(40),
})

export const updateTagSchema = z.object({
  name: z.string().trim().min(1).max(40),
})

export const attachTagSchema = z.object({
  tagId: z.uuid(),
})

export const createSubtaskSchema = z.object({
  title: z.string().trim().min(1).max(200),
})

export const updateSubtaskSchema = z
  .object({
    title: z.string().trim().min(1).max(200).optional(),
    completed: z.boolean().optional(),
  })
  .refine((value) => value.title !== undefined || value.completed !== undefined, {
    message: 'At least one field is required',
  })

export const reorderSubtasksSchema = z.object({
  ids: z.array(z.uuid()).min(1).max(200),
})

export const listTasksQuerySchema = z.object({
  status: taskStatusSchema.optional(),
  priority: taskPrioritySchema.optional(),
  categoryId: categoryFilterSchema.optional(),
  q: optionalSearchSchema,
  sort: z.enum(['createdAt', 'updatedAt', 'deadline', 'priority', 'title']).default('createdAt'),
  order: z.enum(['asc', 'desc']).default('desc'),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
})

export const boardTasksQuerySchema = z.object({
  priority: taskPrioritySchema.optional(),
  categoryId: categoryFilterSchema.optional(),
  q: optionalSearchSchema,
})

export const taskSummaryQuerySchema = z.object({
  date: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'Expected YYYY-MM-DD')
    .optional(),
})

export const startFocusSessionSchema = z.object({
  plannedSeconds: z.number().int().min(FOCUS_MIN_PLANNED_SECONDS).max(FOCUS_MAX_PLANNED_SECONDS),
  taskId: z.uuid().nullable().optional(),
})

export const listFocusSessionsQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
})

export const focusSessionIdParamSchema = z.object({
  id: z.uuid(),
})

const scheduleMinuteSchema = z.number().int().min(0).max(1439)

function schedulePairValid(start: number | null | undefined, end: number | null | undefined): boolean {
  if (start === undefined && end === undefined) return true
  if (start === undefined || end === undefined) return false
  if ((start === null) !== (end === null)) return false
  return true
}

export const createWebsiteRuleSchema = z
  .object({
    domain: z.string().trim().min(1).max(253),
    mode: z.enum(WEBSITE_RULE_MODES).optional(),
    enabled: z.boolean().optional(),
    dailyLimitMinutes: z.number().int().min(1).max(24 * 60).nullable().optional(),
    scheduleStartMinute: scheduleMinuteSchema.nullable().optional(),
    scheduleEndMinute: scheduleMinuteSchema.nullable().optional(),
  })
  .refine((value) => schedulePairValid(value.scheduleStartMinute, value.scheduleEndMinute), {
    message: 'Set both schedule start and end, or clear both',
  })

export const updateWebsiteRuleSchema = z
  .object({
    domain: z.string().trim().min(1).max(253).optional(),
    mode: z.enum(WEBSITE_RULE_MODES).optional(),
    enabled: z.boolean().optional(),
    dailyLimitMinutes: z.number().int().min(1).max(24 * 60).nullable().optional(),
    scheduleStartMinute: scheduleMinuteSchema.nullable().optional(),
    scheduleEndMinute: scheduleMinuteSchema.nullable().optional(),
  })
  .refine((value) => Object.values(value).some((item) => item !== undefined), {
    message: 'At least one field is required',
  })
  .refine((value) => schedulePairValid(value.scheduleStartMinute, value.scheduleEndMinute), {
    message: 'Set both schedule start and end, or clear both',
  })

export const recordWebsiteUsageSchema = z.object({
  clientEventId: z.string().trim().min(1).max(80),
  domain: z.string().trim().min(1).max(253),
  seconds: z.number().int().min(0).max(24 * 60 * 60),
  occurredAt: isoDateTime.optional(),
})

export const websiteUsageQuerySchema = z.object({
  date: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'Expected YYYY-MM-DD')
    .optional(),
})

const civilDateSchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Expected YYYY-MM-DD')

export const createHabitSchema = z.object({
  name: z.string().trim().min(1).max(80),
  frequency: z.enum(HABIT_FREQUENCIES).optional(),
  targetCount: z.number().int().min(1).max(100).optional(),
})

export const updateHabitSchema = z
  .object({
    name: z.string().trim().min(1).max(80).optional(),
    frequency: z.enum(HABIT_FREQUENCIES).optional(),
    targetCount: z.number().int().min(1).max(100).optional(),
  })
  .refine((value) => Object.values(value).some((item) => item !== undefined), {
    message: 'At least one field is required',
  })

export const habitCheckInSchema = z.object({
  date: civilDateSchema.optional(),
  count: z.number().int().min(0).max(1000).optional(),
})

export const habitDetailQuerySchema = z.object({
  month: z.string().regex(/^\d{4}-\d{2}$/, 'Expected YYYY-MM').optional(),
})

export const createGoalSchema = z.object({
  title: z.string().trim().min(1).max(160),
  description: z.string().trim().max(2000).nullable().optional(),
  status: z.enum(GOAL_STATUSES).optional(),
  deadline: civilDateSchema.nullable().optional(),
})

export const updateGoalSchema = z
  .object({
    title: z.string().trim().min(1).max(160).optional(),
    description: z.string().trim().max(2000).nullable().optional(),
    status: z.enum(GOAL_STATUSES).optional(),
    deadline: civilDateSchema.nullable().optional(),
  })
  .refine((value) => Object.values(value).some((item) => item !== undefined), {
    message: 'At least one field is required',
  })

export const createMilestoneSchema = z.object({
  title: z.string().trim().min(1).max(160),
})

export const updateMilestoneSchema = z
  .object({
    title: z.string().trim().min(1).max(160).optional(),
    completed: z.boolean().optional(),
  })
  .refine((value) => Object.values(value).some((item) => item !== undefined), {
    message: 'At least one field is required',
  })

export const reorderMilestonesSchema = z.object({
  ids: z.array(z.uuid()),
})

export const linkGoalTaskSchema = z.object({
  taskId: z.uuid(),
})

export const goalMilestoneParamsSchema = z.object({
  id: z.uuid(),
  milestoneId: z.uuid(),
})

export const goalTaskParamsSchema = z.object({
  id: z.uuid(),
  taskId: z.uuid(),
})

export const analyticsQuerySchema = z.object({
  range: z.enum(['7', '30']).default('7'),
})

export const taskIdParamSchema = z.object({
  id: z.uuid(),
})

export const taskTagParamsSchema = z.object({
  id: z.uuid(),
  tagId: z.uuid(),
})

export const taskSubtaskParamsSchema = z.object({
  id: z.uuid(),
  subtaskId: z.uuid(),
})

export type RegisterInput = z.infer<typeof registerSchema>
export type LoginInput = z.infer<typeof loginSchema>
export type UpdateProfileInput = z.infer<typeof updateProfileSchema>
export type ChangePasswordInput = z.infer<typeof changePasswordSchema>
export type UpdatePreferencesInput = z.infer<typeof updatePreferencesSchema>
export type CreateTaskInput = z.infer<typeof createTaskSchema>
export type UpdateTaskInput = z.infer<typeof updateTaskSchema>
export type UpdateTaskStatusInput = z.infer<typeof updateTaskStatusSchema>
export type UpdateTaskQuadrantInput = z.infer<typeof updateTaskQuadrantSchema>
export type UpdateTaskScheduleInput = z.infer<typeof updateTaskScheduleSchema>
export type ListTasksQuery = z.infer<typeof listTasksQuerySchema>
export type BoardTasksQuery = z.infer<typeof boardTasksQuerySchema>
export type CreateCategoryInput = z.infer<typeof createCategorySchema>
export type UpdateCategoryInput = z.infer<typeof updateCategorySchema>
export type CreateTagInput = z.infer<typeof createTagSchema>
export type UpdateTagInput = z.infer<typeof updateTagSchema>
export type AttachTagInput = z.infer<typeof attachTagSchema>
export type CreateSubtaskInput = z.infer<typeof createSubtaskSchema>
export type UpdateSubtaskInput = z.infer<typeof updateSubtaskSchema>
export type ReorderSubtasksInput = z.infer<typeof reorderSubtasksSchema>
export type TaskSummaryQuery = z.infer<typeof taskSummaryQuerySchema>
export type StartFocusSessionInput = z.infer<typeof startFocusSessionSchema>
export type ListFocusSessionsQuery = z.infer<typeof listFocusSessionsQuerySchema>
export type CreateWebsiteRuleInput = z.infer<typeof createWebsiteRuleSchema>
export type UpdateWebsiteRuleInput = z.infer<typeof updateWebsiteRuleSchema>
export type RecordWebsiteUsageInput = z.infer<typeof recordWebsiteUsageSchema>
export type WebsiteUsageQuery = z.infer<typeof websiteUsageQuerySchema>
export type CreateHabitInput = z.infer<typeof createHabitSchema>
export type UpdateHabitInput = z.infer<typeof updateHabitSchema>
export type HabitCheckInInput = z.infer<typeof habitCheckInSchema>
export type HabitDetailQuery = z.infer<typeof habitDetailQuerySchema>
export type CreateGoalInput = z.infer<typeof createGoalSchema>
export type UpdateGoalInput = z.infer<typeof updateGoalSchema>
export type CreateMilestoneInput = z.infer<typeof createMilestoneSchema>
export type UpdateMilestoneInput = z.infer<typeof updateMilestoneSchema>
export type ReorderMilestonesInput = z.infer<typeof reorderMilestonesSchema>
export type LinkGoalTaskInput = z.infer<typeof linkGoalTaskSchema>
export type AnalyticsQuery = z.infer<typeof analyticsQuerySchema>
