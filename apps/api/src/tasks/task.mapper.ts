import { deriveEisenhowerQuadrant, type TaskPriority, type TaskStatus, type TaskView } from '@focusflow/shared-types'

export interface TaskRecord {
  id: string
  title: string
  description: string | null
  status: TaskStatus
  priority: TaskPriority
  isUrgent: boolean
  isImportant: boolean
  deadline: Date | null
  categoryId: string | null
  completedAt: Date | null
  createdAt: Date
  updatedAt: Date
}

export function toTaskView(task: TaskRecord): TaskView {
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
    categoryId: task.categoryId,
    completedAt: task.completedAt ? task.completedAt.toISOString() : null,
    createdAt: task.createdAt.toISOString(),
    updatedAt: task.updatedAt.toISOString(),
  }
}

export function completionTimestamp(previous: TaskStatus, next: TaskStatus, existing: Date | null): Date | null {
  if (next !== 'COMPLETED') return null
  return previous === 'COMPLETED' && existing ? existing : new Date()
}
