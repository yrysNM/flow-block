import { deriveEisenhowerQuadrant, type EisenhowerQuadrant, type TaskView } from '@focusflow/shared-types'
import { civilWeek, formatDateInTimeZone, isValidTimeZone } from '@focusflow/shared-utils'

/**
 * Visual copy matches the matrix reference. Placement still follows the
 * product rule: urgent and important, not a stored quadrant.
 */
export const QUADRANTS: ReadonlyArray<{
  id: EisenhowerQuadrant
  title: string
  subtitle: string
  background: string
  accent: string
}> = [
  {
    id: 'DO',
    title: 'Do first',
    subtitle: 'High priority, low effort',
    background: '#E7F6EE',
    accent: '#1F8A4C',
  },
  {
    id: 'SCHEDULE',
    title: 'Schedule',
    subtitle: 'High priority, high effort',
    background: '#E7F0FE',
    accent: '#2F6FE0',
  },
  {
    id: 'DELEGATE',
    title: 'Delegate',
    subtitle: 'Low priority, low effort',
    background: '#F4EAFB',
    accent: '#8A4EBE',
  },
  {
    id: 'ELIMINATE',
    title: 'Eliminate',
    subtitle: 'Low priority, high effort',
    background: '#FDECEE',
    accent: '#E23B6A',
  },
]

export const QUADRANT_FLAGS: Record<EisenhowerQuadrant, { isUrgent: boolean; isImportant: boolean }> = {
  DO: { isUrgent: true, isImportant: true },
  SCHEDULE: { isUrgent: false, isImportant: true },
  DELEGATE: { isUrgent: true, isImportant: false },
  ELIMINATE: { isUrgent: false, isImportant: false },
}

const BUBBLE_SLOTS: ReadonlyArray<{ x: number; y: number }> = [
  { x: 62, y: 52 },
  { x: 36, y: 66 },
  { x: 80, y: 40 },
  { x: 48, y: 78 },
  { x: 84, y: 68 },
  { x: 24, y: 48 },
  { x: 70, y: 82 },
  { x: 42, y: 38 },
]

/** Index 0 is reserved for tasks with no categoryId. Later colors stay distinct from that blue. */
const CATEGORY_PALETTE = ['#3B6FE4', '#7C5CBF', '#E39A32', '#E15B8D', '#1AA6A0', '#E05A4F', '#6D5EF5']
const INITIAL_SKIP = new Set(['a', 'an', 'the', 'of', 'to', 'for', 'and', 'or'])

export const NO_CATEGORY_KEY = 'none'
export const COUNT_BUBBLE_COLOR = '#0055FA'

export interface TaskBubble {
  kind: 'task'
  task: TaskView
  x: number
  y: number
  initials: string
  color: string
}

export interface OverflowBubble {
  kind: 'overflow'
  tasks: TaskView[]
  x: number
  y: number
  label: string
  color: string
}

export type PlacedBubble = TaskBubble | OverflowBubble

export interface MatrixCounts {
  dueToday: number
  overdue: number
  inProgress: number
  dueThisWeek: number
  finished: number
}

export interface LegendEntry {
  key: string
  label: string
  color: string
}

export function quadrantOf(task: Pick<TaskView, 'isUrgent' | 'isImportant'>): EisenhowerQuadrant {
  return deriveEisenhowerQuadrant(task.isUrgent, task.isImportant)
}

export function initials(value: string): string {
  const raw = value
    .trim()
    .split(/\s+/)
    .map((word) => word.replace(/^[^a-z0-9]+|[^a-z0-9]+$/gi, ''))
    .filter((word) => word.length > 0)
  const meaningful = raw.filter((word) => !INITIAL_SKIP.has(word.toLowerCase()))
  const words = meaningful.length > 0 ? meaningful : raw
  const first = words[0]
  if (!first) return '?'
  const second = words[1]
  if (!second) return first.slice(0, 2).toUpperCase()
  return `${first[0] ?? ''}${second[0] ?? ''}`.toUpperCase()
}

export function categoryColor(categoryId: string | null): string {
  const fallback = CATEGORY_PALETTE[0] ?? '#3B6FE4'
  if (!categoryId) return fallback
  let hash = 0
  for (let index = 0; index < categoryId.length; index += 1) {
    hash = (hash * 33 + categoryId.charCodeAt(index)) >>> 0
  }
  const rest = CATEGORY_PALETTE.slice(1)
  return rest[hash % rest.length] ?? fallback
}

export function categoryKey(categoryId: string | null): string {
  return categoryId ?? NO_CATEGORY_KEY
}

export function legendEntries(tasks: readonly TaskView[]): LegendEntry[] {
  const keys = new Set<string>()
  for (const task of tasks) keys.add(categoryKey(task.categoryId))
  const sorted = [...keys].sort((left, right) => {
    if (left === NO_CATEGORY_KEY) return -1
    if (right === NO_CATEGORY_KEY) return 1
    return left.localeCompare(right)
  })
  const named = sorted.filter((key) => key !== NO_CATEGORY_KEY)
  let categoryIndex = 0
  return sorted.map((key) => {
    if (key === NO_CATEGORY_KEY) {
      return { key, label: 'No category', color: categoryColor(null) }
    }
    categoryIndex += 1
    const label = named.length === 1 ? 'Category' : `Category ${categoryIndex}`
    return { key, label, color: categoryColor(key) }
  })
}

/**
 * One bubble per task until the quadrant runs out of open spots.
 * The last spot then becomes a +N bubble. Tasks have no dependency
 * field, so this layout does not draw connector lines.
 */
export function placeBubbles(tasks: readonly TaskView[]): PlacedBubble[] {
  const asTask = (task: TaskView, slot: { x: number; y: number }): TaskBubble => ({
    kind: 'task',
    task,
    x: slot.x,
    y: slot.y,
    initials: initials(task.title),
    color: categoryColor(task.categoryId),
  })

  if (tasks.length <= BUBBLE_SLOTS.length) {
    return tasks.flatMap((task, index) => {
      const slot = BUBBLE_SLOTS[index]
      return slot ? [asTask(task, slot)] : []
    })
  }

  const visibleCount = BUBBLE_SLOTS.length - 1
  const overflowSlot = BUBBLE_SLOTS[visibleCount]
  if (!overflowSlot) return []
  const visible = tasks.slice(0, visibleCount).flatMap((task, index) => {
    const slot = BUBBLE_SLOTS[index]
    return slot ? [asTask(task, slot)] : []
  })
  const hidden = tasks.slice(visibleCount)
  const overflow: OverflowBubble = {
    kind: 'overflow',
    tasks: [...hidden],
    x: overflowSlot.x,
    y: overflowSlot.y,
    label: `+${hidden.length}`,
    color: COUNT_BUBBLE_COLOR,
  }
  return [...visible, overflow]
}

export function civilDate(iso: string, timeZone: string): string | null {
  const date = new Date(iso)
  if (Number.isNaN(date.getTime()) || !isValidTimeZone(timeZone)) return null
  return formatDateInTimeZone(date, timeZone)
}

/**
 * Counts from the loaded tasks.
 * Due today and due this week follow the deadline's civil date.
 * Overdue is a deadline before today on a task that is not completed.
 * There is no Blocked status.
 */
export function matrixCounts(
  tasks: readonly TaskView[],
  timeZone: string,
  weekStartsOn: number,
  now = new Date(),
): MatrixCounts {
  const zone = isValidTimeZone(timeZone) ? timeZone : 'UTC'
  const today = formatDateInTimeZone(now, zone)
  const week = civilWeek(today, weekStartsOn)
  const counts: MatrixCounts = {
    dueToday: 0,
    overdue: 0,
    inProgress: 0,
    dueThisWeek: 0,
    finished: 0,
  }
  for (const task of tasks) {
    if (task.status === 'IN_PROGRESS') counts.inProgress += 1
    if (task.status === 'COMPLETED') counts.finished += 1
    if (!task.deadline) continue
    const due = civilDate(task.deadline, zone)
    if (!due) continue
    if (due === today) counts.dueToday += 1
    if (due < today && task.status !== 'COMPLETED') counts.overdue += 1
    if (due >= week.start && due <= week.end) counts.dueThisWeek += 1
  }
  return counts
}
