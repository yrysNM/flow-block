export const TASK_STATUSES = ['TODO', 'IN_PROGRESS', 'COMPLETED'] as const
export type TaskStatus = (typeof TASK_STATUSES)[number]

export const TASK_PRIORITIES = ['LOW', 'MEDIUM', 'HIGH', 'URGENT'] as const
export type TaskPriority = (typeof TASK_PRIORITIES)[number]

/** Stored on the task. NONE does not create another row when the task is completed. */
export const TASK_RECURRENCES = ['NONE', 'DAILY', 'WEEKLY'] as const
export type TaskRecurrence = (typeof TASK_RECURRENCES)[number]

export const TASK_RECURRENCE_LABELS: Record<TaskRecurrence, string> = {
  NONE: 'Does not repeat',
  DAILY: 'Daily',
  WEEKLY: 'Weekly',
}

/** Characters accepted by POST /api/assistant after trim. */
export const ASSISTANT_PROMPT_MAX_LENGTH = 2000

export interface AssistantSuggestion {
  title: string
  notes: string
  priority: TaskPriority
}

/**
 * A provider either has no model connected, or returns suggestions.
 * Suggestions are not tasks. This milestone does not write them.
 */
export type AssistantResult =
  | { status: 'not-configured' }
  | { status: 'suggestions'; suggestions: AssistantSuggestion[] }

export const EISENHOWER_QUADRANTS = ['DO', 'SCHEDULE', 'DELEGATE', 'ELIMINATE'] as const
export type EisenhowerQuadrant = (typeof EISENHOWER_QUADRANTS)[number]

export const THEME_PREFERENCES = ['light', 'dark', 'system'] as const
export type ThemePreference = (typeof THEME_PREFERENCES)[number]

/** The only language the API accepts. The web UI stays English. */
export const ACCOUNT_LANGUAGE = 'en' as const
export type AccountLanguage = typeof ACCOUNT_LANGUAGE

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

/** The two stored flags for a quadrant. Quadrant itself is never persisted. */
export function flagsForQuadrant(quadrant: EisenhowerQuadrant): { isUrgent: boolean; isImportant: boolean } {
  switch (quadrant) {
    case 'DO':
      return { isUrgent: true, isImportant: true }
    case 'SCHEDULE':
      return { isUrgent: false, isImportant: true }
    case 'DELEGATE':
      return { isUrgent: true, isImportant: false }
    case 'ELIMINATE':
      return { isUrgent: false, isImportant: false }
  }
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
  /** Initial focus duration in seconds. 1500 is 25 minutes. */
  focusDefaultSeconds: number
  /** Stored only. The interface is English. */
  language: AccountLanguage
}

export interface SessionResponse {
  user: PublicUser
  preferences: PublicPreferences
}

export interface CategoryView {
  id: string
  name: string
  color: string | null
  createdAt: string
  updatedAt: string
}

export interface TagView {
  id: string
  name: string
  createdAt: string
  updatedAt: string
}

export interface TaskCategoryRef {
  id: string
  name: string
  color: string | null
}

export interface TaskTagRef {
  id: string
  name: string
}

export interface SubtaskView {
  id: string
  taskId: string
  title: string
  completed: boolean
  position: number
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
  category: TaskCategoryRef | null
  tags: TaskTagRef[]
  subtasks: SubtaskView[]
  scheduledStart: string | null
  scheduledEnd: string | null
  recurrence: TaskRecurrence
  completedAt: string | null
  createdAt: string
  updatedAt: string
}

export interface TaskMatrixQuadrant {
  quadrant: EisenhowerQuadrant
  count: number
  tasks: TaskView[]
}

export interface TaskMatrixResponse {
  counts: Record<EisenhowerQuadrant, number> & { total: number }
  quadrants: TaskMatrixQuadrant[]
}

export interface TaskPlannerResponse {
  date: string
  timezone: string
  timeline: TaskView[]
  unscheduled: TaskView[]
  counts: { timeline: number; unscheduled: number }
}

export interface TaskBoardColumn {
  status: TaskStatus
  count: number
  tasks: TaskView[]
}

export interface TaskBoardResponse {
  counts: Record<TaskStatus, number> & { total: number }
  columns: TaskBoardColumn[]
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

export const FOCUS_PRESET_MINUTES = [15, 25, 50] as const
export const FOCUS_MIN_PLANNED_SECONDS = 60
export const FOCUS_MAX_PLANNED_SECONDS = 3 * 60 * 60

export const FOCUS_SESSION_STATUSES = ['RUNNING', 'PAUSED', 'COMPLETED', 'STOPPED'] as const
export type FocusSessionStatus = (typeof FOCUS_SESSION_STATUSES)[number]

export const FOCUS_SESSION_STATUS_LABELS: Record<FocusSessionStatus, string> = {
  RUNNING: 'Running',
  PAUSED: 'Paused',
  COMPLETED: 'Completed',
  STOPPED: 'Stopped',
}

export function deriveFocusSessionStatus(input: {
  endedAt: Date | string | null
  pausedAt: Date | string | null
  completed: boolean
}): FocusSessionStatus {
  if (input.endedAt) return input.completed ? 'COMPLETED' : 'STOPPED'
  if (input.pausedAt) return 'PAUSED'
  return 'RUNNING'
}

export interface FocusTaskRef {
  id: string
  title: string
  status: TaskStatus
}

export interface FocusSessionView {
  id: string
  taskId: string | null
  task: FocusTaskRef | null
  plannedSeconds: number
  status: FocusSessionStatus
  startedAt: string
  endedAt: string | null
  pausedAt: string | null
  pausedSeconds: number
  elapsedSeconds: number
  remainingSeconds: number
  completed: boolean
  serverNow: string
  createdAt: string
  updatedAt: string
}

export interface FocusSessionListResponse {
  data: FocusSessionView[]
  meta: PageMeta
}

export const WEBSITE_RULE_MODES = ['BLOCK', 'ALLOW'] as const
export type WebsiteRuleMode = (typeof WEBSITE_RULE_MODES)[number]

export interface WebsiteRuleView {
  id: string
  domain: string
  mode: WebsiteRuleMode
  enabled: boolean
  dailyLimitMinutes: number | null
  scheduleStartMinute: number | null
  scheduleEndMinute: number | null
  createdAt: string
  updatedAt: string
}

export interface WebsiteUsageTotal {
  ruleId: string
  domain: string
  mode: WebsiteRuleMode
  usedSeconds: number
  dailyLimitMinutes: number | null
}

export interface WebsiteUsageResponse {
  date: string
  timezone: string
  totals: WebsiteUsageTotal[]
}

export interface WebsiteUsageEventResult {
  stored: boolean
  clientEventId: string
  ruleId: string | null
  domain: string
  usedSeconds: number
}

export const HABIT_FREQUENCIES = ['DAILY', 'WEEKLY'] as const
export type HabitFrequency = (typeof HABIT_FREQUENCIES)[number]

export const GOAL_STATUSES = ['ACTIVE', 'COMPLETED', 'ARCHIVED'] as const
export type GoalStatus = (typeof GOAL_STATUSES)[number]

export interface HabitEntryView {
  id: string
  habitId: string
  date: string
  count: number
  met: boolean
}

export interface HabitView {
  id: string
  name: string
  frequency: HabitFrequency
  targetCount: number
  streak: number
  todayCount: number
  todayMet: boolean
  createdAt: string
  updatedAt: string
}

export interface HabitDetailView extends HabitView {
  month: string
  entries: HabitEntryView[]
}

export interface HabitCheckInResult {
  entry: HabitEntryView
  habit: HabitView
}

export interface MilestoneView {
  id: string
  goalId: string
  title: string
  completed: boolean
  position: number
  dueDate: string | null
}

export interface GoalTaskRef {
  id: string
  title: string
  status: TaskStatus
}

export interface GoalProgressView {
  completed: number
  total: number
}

export interface GoalView {
  id: string
  title: string
  description: string | null
  status: GoalStatus
  deadline: string | null
  milestones: MilestoneView[]
  tasks: GoalTaskRef[]
  progress: GoalProgressView
  createdAt: string
  updatedAt: string
}

export const ANALYTICS_RANGES = [7, 30] as const
export type AnalyticsRange = (typeof ANALYTICS_RANGES)[number]

export interface AnalyticsDayPoint {
  date: string
  tasksCompleted: number
  focusSeconds: number
  websiteUsedSeconds: number
  habitCheckIns: number
  habitExpected: number
}

export interface AnalyticsHabitConsistency {
  checkIns: number
  expected: number
}

export interface AnalyticsResponse {
  range: AnalyticsRange
  timezone: string
  startDate: string
  endDate: string
  tasksCompleted: number
  focusSeconds: number
  websiteUsedSeconds: number
  habitConsistency: AnalyticsHabitConsistency
  series: AnalyticsDayPoint[]
}

export interface ApiErrorBody {
  statusCode: number
  error: string
  message: string
  details?: Array<{ path: string; message: string }>
}
