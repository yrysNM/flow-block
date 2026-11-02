import { describe, expect, it } from 'vitest'
import {
  createCategorySchema,
  createTaskSchema,
  listTasksQuerySchema,
  registerSchema,
  startFocusSessionSchema,
  updateTaskQuadrantSchema,
  updateTaskScheduleSchema,
} from './index'

describe('shared schemas', () => {
  it('drops a client-supplied userId instead of trusting it', () => {
    const parsed = createTaskSchema.parse({
      title: 'Write the slice',
      userId: 'someone-else',
    })
    expect(parsed).toEqual({ title: 'Write the slice' })
    expect(parsed).not.toHaveProperty('userId')
  })

  it('normalizes email and rejects a short password', () => {
    expect(registerSchema.parse({ email: ' Ada@Example.com ', password: 'longenough', name: 'Ada' })).toMatchObject({
      email: 'ada@example.com',
      name: 'Ada',
    })
    expect(registerSchema.safeParse({ email: 'ada@example.com', password: 'short', name: 'Ada' }).success).toBe(false)
  })

  it('drops a client userId on categories and ignores a blank search', () => {
    expect(createCategorySchema.parse({ name: ' Work ', userId: 'someone-else', color: '#3366ff' })).toEqual({
      name: 'Work',
      color: '#3366ff',
    })
    expect(listTasksQuerySchema.parse({ q: '   ', categoryId: 'none', priority: 'HIGH' })).toMatchObject({
      priority: 'HIGH',
      categoryId: 'none',
      page: 1,
      pageSize: 20,
    })
    expect(listTasksQuerySchema.parse({ q: '   ' }).q).toBeUndefined()
  })

  it('keeps a quadrant patch to the two flags and requires a whole schedule', () => {
    expect(updateTaskQuadrantSchema.parse({
      isUrgent: true,
      isImportant: false,
      status: 'COMPLETED',
      userId: 'someone-else',
    })).toEqual({ isUrgent: true, isImportant: false })
    expect(updateTaskScheduleSchema.safeParse({ scheduledStart: '2026-11-02T09:00:00.000Z', scheduledEnd: null }).success).toBe(false)
    expect(updateTaskScheduleSchema.parse({ scheduledStart: null, scheduledEnd: null })).toEqual({
      scheduledStart: null,
      scheduledEnd: null,
    })
  })

  it('drops a client userId on a focus session and bounds the plan', () => {
    expect(startFocusSessionSchema.parse({
      plannedSeconds: 25 * 60,
      taskId: null,
      userId: 'someone-else',
    })).toEqual({ plannedSeconds: 25 * 60, taskId: null })
    expect(startFocusSessionSchema.safeParse({ plannedSeconds: 30 }).success).toBe(false)
    expect(startFocusSessionSchema.safeParse({ plannedSeconds: 4 * 60 * 60 }).success).toBe(false)
  })
})
