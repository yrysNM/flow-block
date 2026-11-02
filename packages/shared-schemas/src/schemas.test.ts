import { describe, expect, it } from 'vitest'
import {
  analyticsQuerySchema,
  assistantPromptSchema,
  changePasswordSchema,
  createCategorySchema,
  createGoalSchema,
  createHabitSchema,
  createTaskSchema,
  listTasksQuerySchema,
  registerSchema,
  createWebsiteRuleSchema,
  recordWebsiteUsageSchema,
  startFocusSessionSchema,
  updatePreferencesSchema,
  updateProfileSchema,
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
    expect(createTaskSchema.parse({ title: 'Repeat', recurrence: 'DAILY', userId: 'someone-else' })).toEqual({
      title: 'Repeat',
      recurrence: 'DAILY',
    })
    expect(createTaskSchema.safeParse({ title: 'Repeat', recurrence: 'MONTHLY' }).success).toBe(false)
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

  it('drops a client userId on a website rule and requires a whole schedule window', () => {
    expect(createWebsiteRuleSchema.parse({
      domain: ' Example.com ',
      mode: 'BLOCK',
      userId: 'someone-else',
    })).toEqual({ domain: 'Example.com', mode: 'BLOCK' })
    expect(createWebsiteRuleSchema.safeParse({
      domain: 'example.com',
      scheduleStartMinute: 60,
    }).success).toBe(false)
    expect(recordWebsiteUsageSchema.parse({
      clientEventId: 'evt-1',
      domain: 'example.com',
      seconds: 5,
      userId: 'someone-else',
    })).toEqual({ clientEventId: 'evt-1', domain: 'example.com', seconds: 5 })
  })

  it('drops a client userId on habits and goals and does not accept a progress field', () => {
    expect(createHabitSchema.parse({
      name: ' Read ',
      userId: 'someone-else',
      frequency: 'DAILY',
      targetCount: 2,
    })).toEqual({ name: 'Read', frequency: 'DAILY', targetCount: 2 })
    expect(createGoalSchema.parse({
      title: ' Ship ',
      userId: 'someone-else',
      deadline: '2026-12-01',
      progress: 40,
    })).toEqual({ title: 'Ship', deadline: '2026-12-01' })
  })

  it('drops a client userId and totals on an analytics query', () => {
    expect(analyticsQuerySchema.parse({
      range: '30',
      userId: 'someone-else',
      tasksCompleted: 99,
      focusSeconds: 10,
    })).toEqual({ range: '30' })
    expect(analyticsQuerySchema.parse({})).toEqual({ range: '7' })
  })

  it('drops email and userId from a profile update', () => {
    expect(updateProfileSchema.parse({
      name: ' Ada ',
      email: 'other@example.com',
      userId: 'someone-else',
    })).toEqual({ name: 'Ada' })
  })

  it('requires the current password and strips userId from a password change', () => {
    expect(changePasswordSchema.parse({
      currentPassword: 'old-password',
      newPassword: 'new-password',
      userId: 'someone-else',
    })).toEqual({ currentPassword: 'old-password', newPassword: 'new-password' })
    expect(changePasswordSchema.safeParse({ currentPassword: 'old-password', newPassword: 'short' }).success).toBe(false)
    expect(changePasswordSchema.safeParse({ currentPassword: '', newPassword: 'new-password' }).success).toBe(false)
  })

  it('accepts light or dark theme and only English', () => {
    expect(updatePreferencesSchema.parse({ theme: 'dark', userId: 'someone-else' })).toEqual({ theme: 'dark' })
    expect(updatePreferencesSchema.parse({ theme: 'light', focusDefaultSeconds: 40 * 60, language: 'en' })).toEqual({
      theme: 'light',
      focusDefaultSeconds: 40 * 60,
      language: 'en',
    })
    expect(updatePreferencesSchema.safeParse({ language: 'fr' }).success).toBe(false)
    expect(updatePreferencesSchema.safeParse({ focusDefaultSeconds: 30 }).success).toBe(false)
  })

  it('rejects an empty assistant prompt and strips userId', () => {
    expect(assistantPromptSchema.parse({
      prompt: '  Outline the chapter  ',
      userId: 'someone-else',
    })).toEqual({ prompt: 'Outline the chapter' })
    expect(assistantPromptSchema.safeParse({ prompt: '   ' }).success).toBe(false)
    expect(assistantPromptSchema.safeParse({ prompt: '' }).success).toBe(false)
    expect(assistantPromptSchema.safeParse({ prompt: 'a'.repeat(2001) }).success).toBe(false)
  })
})
