import {
  TASK_PRIORITIES,
  TASK_STATUSES,
  THEME_PREFERENCES,
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

export const updatePreferencesSchema = z
  .object({
    timezone: z.string().trim().min(1).max(100).optional(),
    theme: themePreferenceSchema.optional(),
    weekStartsOn: z.number().int().min(0).max(6).optional(),
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

export const listTasksQuerySchema = z.object({
  status: taskStatusSchema.optional(),
  sort: z.enum(['createdAt', 'updatedAt', 'deadline', 'priority', 'title']).default('createdAt'),
  order: z.enum(['asc', 'desc']).default('desc'),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
})

export const taskSummaryQuerySchema = z.object({
  date: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'Expected YYYY-MM-DD')
    .optional(),
})

export const taskIdParamSchema = z.object({
  id: z.uuid(),
})

export type RegisterInput = z.infer<typeof registerSchema>
export type LoginInput = z.infer<typeof loginSchema>
export type UpdateProfileInput = z.infer<typeof updateProfileSchema>
export type UpdatePreferencesInput = z.infer<typeof updatePreferencesSchema>
export type CreateTaskInput = z.infer<typeof createTaskSchema>
export type UpdateTaskInput = z.infer<typeof updateTaskSchema>
export type UpdateTaskStatusInput = z.infer<typeof updateTaskStatusSchema>
export type ListTasksQuery = z.infer<typeof listTasksQuerySchema>
export type TaskSummaryQuery = z.infer<typeof taskSummaryQuerySchema>
