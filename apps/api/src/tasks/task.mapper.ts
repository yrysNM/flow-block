import { Prisma } from '@prisma/client'
import {
  deriveEisenhowerQuadrant,
  type SubtaskView,
  type TaskPriority,
  type TaskRecurrence,
  type TaskStatus,
  type TaskView,
} from '@focusflow/shared-types'

export interface TaskCategoryRelation {
  id: string
  name: string
  color: string | null
}

export interface TaskTagRelation {
  tag: { id: string; name: string }
}

export interface SubtaskRecord {
  id: string
  taskId: string
  title: string
  completed: boolean
  position: number
}

export interface TaskRecord {
  id: string
  title: string
  description: string | null
  status: TaskStatus
  priority: TaskPriority
  isUrgent: boolean
  isImportant: boolean
  deadline: Date | null
  scheduledStart: Date | null
  scheduledEnd: Date | null
  recurrence?: TaskRecurrence
  categoryId: string | null
  category?: TaskCategoryRelation | null
  tags?: TaskTagRelation[]
  subtasks?: SubtaskRecord[]
  completedAt: Date | null
  createdAt: Date
  updatedAt: Date
}

export const taskInclude = {
  category: { select: { id: true, name: true, color: true } },
  tags: { select: { tag: { select: { id: true, name: true } } } },
  subtasks: {
    orderBy: { position: 'asc' as const },
    select: { id: true, taskId: true, title: true, completed: true, position: true },
  },
} satisfies Prisma.TaskInclude

export const BOARD_COLUMN_LIMIT = 100

export function toSubtaskView(subtask: SubtaskRecord): SubtaskView {
  return {
    id: subtask.id,
    taskId: subtask.taskId,
    title: subtask.title,
    completed: subtask.completed,
    position: subtask.position,
  }
}

export function toTaskView(task: TaskRecord): TaskView {
  const tags = (task.tags ?? [])
    .map((link) => ({ id: link.tag.id, name: link.tag.name }))
    .sort((left, right) => left.name.localeCompare(right.name))
  const subtasks = [...(task.subtasks ?? [])]
    .sort((left, right) => left.position - right.position)
    .map((subtask) => toSubtaskView(subtask))
  return {
    id: task.id,
    title: task.title,
    description: task.description,
    status: task.status,
    priority: task.priority,
    isUrgent: task.isUrgent,
    isImportant: task.isImportant,
    quadrant: deriveEisenhowerQuadrant(task.isUrgent, task.isImportant),
    deadline: task.deadline ? task.deadline.toISOString() : null,
    scheduledStart: task.scheduledStart ? task.scheduledStart.toISOString() : null,
    scheduledEnd: task.scheduledEnd ? task.scheduledEnd.toISOString() : null,
    recurrence: task.recurrence ?? 'NONE',
    categoryId: task.categoryId,
    category: task.category
      ? { id: task.category.id, name: task.category.name, color: task.category.color }
      : null,
    tags,
    subtasks,
    completedAt: task.completedAt ? task.completedAt.toISOString() : null,
    createdAt: task.createdAt.toISOString(),
    updatedAt: task.updatedAt.toISOString(),
  }
}

export function completionTimestamp(previous: TaskStatus, next: TaskStatus, existing: Date | null): Date | null {
  if (next !== 'COMPLETED') return null
  return previous === 'COMPLETED' && existing ? existing : new Date()
}
