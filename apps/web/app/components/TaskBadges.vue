<template>
  <div class="flex flex-wrap items-center gap-2">
    <span class="rounded-full px-2 py-0.5 text-xs font-medium" :class="statusClass">{{ TASK_STATUS_LABELS[status] }}</span>
    <span class="rounded-full bg-background px-2 py-0.5 text-xs font-medium text-ink">{{ TASK_PRIORITY_LABELS[priority] }}</span>
    <span class="rounded-full bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary">{{ EISENHOWER_QUADRANT_LABELS[quadrant] }}</span>
  </div>
</template>

<script setup lang="ts">
import {
  EISENHOWER_QUADRANT_LABELS,
  TASK_PRIORITY_LABELS,
  TASK_STATUS_LABELS,
  type EisenhowerQuadrant,
  type TaskPriority,
  type TaskStatus,
} from '@focusflow/shared-types'

const props = defineProps<{
  status: TaskStatus
  priority: TaskPriority
  quadrant: EisenhowerQuadrant
}>()

const statusClass = computed(() => {
  if (props.status === 'COMPLETED') return 'bg-success/15 text-success'
  if (props.status === 'IN_PROGRESS') return 'bg-warning/15 text-ink'
  return 'bg-background text-secondary'
})
</script>
