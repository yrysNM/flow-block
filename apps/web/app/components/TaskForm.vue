<template>
  <form class="rounded-card border border-line bg-surface p-5 shadow-card" @submit.prevent="submit">
    <div class="flex items-start justify-between gap-3">
      <div>
        <h2 id="task-form-title" class="text-base font-semibold text-ink">{{ mode === 'create' ? 'New task' : 'Edit task' }}</h2>
        <p class="mt-1 text-sm text-secondary">Urgency and importance set the quadrant. They do not change status.</p>
      </div>
      <button type="button" class="text-sm text-secondary hover:text-ink" @click="emit('cancel')">Close</button>
    </div>

    <div class="mt-4 grid gap-4 sm:grid-cols-2">
      <label class="sm:col-span-2 block text-sm font-medium text-ink">
        Title
        <input v-model="model.title" required maxlength="200" class="field mt-1" />
      </label>
      <label class="sm:col-span-2 block text-sm font-medium text-ink">
        Description
        <textarea v-model="model.description" maxlength="5000" rows="3" class="field mt-1" />
      </label>
      <label class="block text-sm font-medium text-ink">
        Status
        <select v-model="model.status" class="field mt-1">
          <option v-for="status in statuses" :key="status" :value="status">{{ TASK_STATUS_LABELS[status] }}</option>
        </select>
      </label>
      <label class="block text-sm font-medium text-ink">
        Priority
        <select v-model="model.priority" class="field mt-1">
          <option v-for="priority in TASK_PRIORITIES" :key="priority" :value="priority">{{ TASK_PRIORITY_LABELS[priority] }}</option>
        </select>
      </label>
      <label class="block text-sm font-medium text-ink">
        Deadline
        <input v-model="model.deadline" type="datetime-local" class="field mt-1" />
      </label>
      <div class="flex flex-col justify-end gap-2 text-sm">
        <label class="inline-flex items-center gap-2">
          <input v-model="model.isUrgent" type="checkbox" class="size-4 accent-primary" />
          Urgent
        </label>
        <label class="inline-flex items-center gap-2">
          <input v-model="model.isImportant" type="checkbox" class="size-4 accent-primary" />
          Important
        </label>
        <p class="text-secondary">Quadrant: {{ EISENHOWER_QUADRANT_LABELS[quadrant] }}</p>
      </div>
    </div>

    <p v-if="error" class="mt-3 text-sm text-danger" role="alert">{{ error }}</p>
    <div class="mt-5 flex justify-end gap-2">
      <button type="button" class="rounded-lg border border-line px-3 py-2 text-sm" @click="emit('cancel')">Cancel</button>
      <button type="submit" class="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white disabled:opacity-60" :disabled="submitting">
        {{ submitting ? 'Saving…' : 'Save task' }}
      </button>
    </div>
  </form>
</template>

<script setup lang="ts">
import {
  EISENHOWER_QUADRANT_LABELS,
  TASK_PRIORITIES,
  TASK_PRIORITY_LABELS,
  TASK_STATUS_LABELS,
  deriveEisenhowerQuadrant,
  type TaskPriority,
  type TaskStatus,
} from '@focusflow/shared-types'

export interface TaskDraft {
  title: string
  description: string
  status: TaskStatus
  priority: TaskPriority
  isUrgent: boolean
  isImportant: boolean
  deadline: string
}

const model = defineModel<TaskDraft>({ required: true })
defineProps<{
  mode: 'create' | 'edit'
  statuses: TaskStatus[]
  submitting: boolean
  error: string
}>()
const emit = defineEmits<{ submit: []; cancel: [] }>()

const quadrant = computed(() => deriveEisenhowerQuadrant(model.value.isUrgent, model.value.isImportant))

function submit() {
  emit('submit')
}
</script>

<style scoped>
.field {
  width: 100%;
  border-radius: 0.65rem;
  border: 1px solid var(--color-line);
  background: white;
  padding: 0.55rem 0.75rem;
  font-size: 0.925rem;
  color: var(--color-ink);
}
</style>
