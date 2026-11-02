export const TASK_STATUSES = ['TODO', 'IN_PROGRESS', 'COMPLETED'] as const
export type TaskStatus = (typeof TASK_STATUSES)[number]

export const TASK_PRIORITIES = ['LOW', 'MEDIUM', 'HIGH', 'URGENT'] as const
export type TaskPriority = (typeof TASK_PRIORITIES)[number]

export const EISENHOWER_QUADRANTS = ['DO', 'SCHEDULE', 'DELEGATE', 'ELIMINATE'] as const
export type EisenhowerQuadrant = (typeof EISENHOWER_QUADRANTS)[number]

export const THEME_PREFERENCES = ['light', 'dark', 'system'] as const
export type ThemePreference = (typeof THEME_PREFERENCES)[number]

export const TASK_STATUS_LABELS: Record<TaskStatus, string> = {
  TODO: 'To do',
  IN_PROGRESS: 'In progress',
  COMPLETED: 'Completed',
}

export const TASK_PRIORITY_LABELS: Record<TaskPriority, string> = {
  LOW: 'Low',
  MEDIUM: 'Medium',
  HIGH: 'High',
  URGENT: 'Urgent',
}

export const EISENHOWER_QUADRANT_LABELS: Record<EisenhowerQuadrant, string> = {
  DO: 'Do first',
  SCHEDULE: 'Schedule',
  DELEGATE: 'Delegate',
  ELIMINATE: 'Eliminate',
}

/**
 * Allowed status changes. Reopening a completed task returns it to To do.
 * It cannot jump straight back to In progress.
 */
export const TASK_STATUS_TRANSITIONS: Record<TaskStatus, readonly TaskStatus[]> = {
  TODO: ['IN_PROGRESS', 'COMPLETED'],
  IN_PROGRESS: ['TODO', 'COMPLETED'],
  COMPLETED: ['TODO'],
}

export function canTransitionTaskStatus(from: TaskStatus, to: TaskStatus): boolean {
  if (from === to) return true
  return TASK_STATUS_TRANSITIONS[from].includes(to)
}

export function allowedStatusTargets(from: TaskStatus): TaskStatus[] {
  return [from, ...TASK_STATUS_TRANSITIONS[from]]
}

export class InvalidTaskStatusTransitionError extends Error {
  readonly from: TaskStatus
  readonly to: TaskStatus

  constructor(from: TaskStatus, to: TaskStatus) {
    super(`Cannot change a task from ${from} to ${to}`)
    this.name = 'InvalidTaskStatusTransitionError'
    this.from = from
    this.to = to
  }
}

export function assertTaskStatusTransition(from: TaskStatus, to: TaskStatus): void {
  if (!canTransitionTaskStatus(from, to)) {
    throw new InvalidTaskStatusTransitionError(from, to)
  }
}

/** Quadrant is derived. It is never stored, so it cannot drift from the flags. */
export function deriveEisenhowerQuadrant(isUrgent: boolean, isImportant: boolean): EisenhowerQuadrant {
  if (isUrgent && isImportant) return 'DO'
  if (!isUrgent && isImportant) return 'SCHEDULE'
  if (isUrgent && !isImportant) return 'DELEGATE'
  return 'ELIMINATE'
}

export interface TaskEisenhowerState {
  status: TaskStatus
  isUrgent: boolean
  isImportant: boolean
}

export interface TaskFieldPatch {
  status?: TaskStatus
  isUrgent?: boolean
  isImportant?: boolean
}

/**
 * Status changes only when `status` is explicitly provided.
 * Urgency and importance never rewrite status.
 */
export function applyTaskFieldPatch<T extends TaskEisenhowerState>(
  current: T,
  patch: TaskFieldPatch,
): T & { quadrant: EisenhowerQuadrant } {
  const nextStatus = patch.status === undefined ? current.status : patch.status
  if (patch.status !== undefined) {
    assertTaskStatusTransition(current.status, patch.status)
  }
  const isUrgent = patch.isUrgent === undefined ? current.isUrgent : patch.isUrgent
  const isImportant = patch.isImportant === undefined ? current.isImportant : patch.isImportant
  return {
    ...current,
    status: nextStatus,
    isUrgent,
    isImportant,
    quadrant: deriveEisenhowerQuadrant(isUrgent, isImportant),
  }
}

export interface PublicUser {
  id: string
  email: string
  name: string
}

export interface PublicPreferences {
  timezone: string
  theme: ThemePreference
  weekStartsOn: number
}

export interface SessionResponse {
  user: PublicUser
  preferences: PublicPreferences
}

export interface TaskView {
  id: string
  title: string
  description: string | null
  status: TaskStatus
  priority: TaskPriority
  isUrgent: boolean
  isImportant: boolean
  quadrant: EisenhowerQuadrant
  deadline: string | null
  categoryId: string | null
  completedAt: string | null
  createdAt: string
  updatedAt: string
}

export interface PageMeta {
  page: number
  pageSize: number
  total: number
  pageCount: number
}

export interface TaskListResponse {
  data: TaskView[]
  meta: PageMeta
}

export interface TaskSummary {
  date: string
  timezone: string
  counts: Record<TaskStatus, number> & { total: number }
  today: TaskView[]
}

export interface ApiErrorBody {
  statusCode: number
  error: string
  message: string
  details?: Array<{ path: string; message: string }>
}
