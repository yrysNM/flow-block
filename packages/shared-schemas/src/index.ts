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
export type UpdatePreferencesInput = z.infer<typeof updatePreferencesSchema>
export type CreateTaskInput = z.infer<typeof createTaskSchema>
export type UpdateTaskInput = z.infer<typeof updateTaskSchema>
export type UpdateTaskStatusInput = z.infer<typeof updateTaskStatusSchema>
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
