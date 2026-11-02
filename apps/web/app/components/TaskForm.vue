<template>
  <form class="rounded-card border border-line bg-surface p-5 shadow-card" @submit.prevent="submit">
    <div class="flex items-start justify-between gap-3">
      <div>
        <h2 class="text-base font-semibold text-ink">{{ mode === 'create' ? 'New task' : 'Edit task' }}</h2>
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
      <label class="block text-sm font-medium text-ink">
        Category
        <select v-model="model.categoryId" class="field mt-1">
          <option value="">No category</option>
          <option v-for="category in categories" :key="category.id" :value="category.id">{{ category.name }}</option>
        </select>
      </label>
      <div class="flex flex-col justify-end gap-2 text-sm sm:col-span-2">
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

    <div v-if="mode === 'create'" class="mt-5 border-t border-line pt-4 text-sm text-secondary">
      Save the task to add subtasks and tags.
    </div>

    <div v-else-if="showOrganizer" class="mt-5 space-y-5 border-t border-line pt-4">
      <section>
        <h3 class="text-sm font-semibold text-ink">Tags</h3>
        <ul v-if="attachedTags.length" class="mt-2 flex flex-wrap gap-2">
          <li v-for="tag in attachedTags" :key="tag.id" class="inline-flex items-center gap-1 rounded-full bg-background px-2 py-1 text-xs">
            {{ tag.name }}
            <button type="button" class="text-secondary hover:text-ink" :disabled="organizing" @click="emit('detachTag', tag.id)">
              Remove
            </button>
          </li>
        </ul>
        <p v-else class="mt-2 text-sm text-secondary">No tags on this task.</p>
        <div class="mt-3 flex flex-wrap items-center gap-2">
          <select v-model="selectedTagId" class="field max-w-xs">
            <option value="">Choose a tag</option>
            <option v-for="tag in unusedTags" :key="tag.id" :value="tag.id">{{ tag.name }}</option>
          </select>
          <button type="button" class="rounded-lg border border-line px-3 py-2 text-sm disabled:opacity-40" :disabled="!selectedTagId || organizing" @click="attach">
            Attach
          </button>
          <NuxtLink to="/categories" class="text-sm text-primary">Manage tags</NuxtLink>
        </div>
      </section>

      <section>
        <h3 class="text-sm font-semibold text-ink">Subtasks</h3>
        <ul v-if="subtasks.length" class="mt-2 space-y-2">
          <li v-for="(subtask, index) in subtasks" :key="subtask.id" class="flex flex-wrap items-center gap-2 text-sm">
            <label class="inline-flex min-w-0 flex-1 items-center gap-2">
              <input
                type="checkbox"
                class="size-4 accent-primary"
                :checked="subtask.completed"
                :disabled="organizing"
                @change="emit('toggleSubtask', subtask.id, ($event.target as HTMLInputElement).checked)"
              />
              <span :class="subtask.completed ? 'text-secondary line-through' : 'text-ink'">{{ subtask.title }}</span>
            </label>
            <button type="button" class="rounded-lg border border-line px-2 py-1 text-xs disabled:opacity-40" :disabled="index === 0 || organizing" @click="emit('moveSubtask', subtask.id, -1)">
              Up
            </button>
            <button type="button" class="rounded-lg border border-line px-2 py-1 text-xs disabled:opacity-40" :disabled="index === subtasks.length - 1 || organizing" @click="emit('moveSubtask', subtask.id, 1)">
              Down
            </button>
            <button type="button" class="rounded-lg border border-danger/30 px-2 py-1 text-xs text-danger" :disabled="organizing" @click="emit('deleteSubtask', subtask.id)">
              Delete
            </button>
          </li>
        </ul>
        <p v-else class="mt-2 text-sm text-secondary">No subtasks yet.</p>
        <div class="mt-3 flex flex-wrap gap-2">
          <input v-model="subtaskTitle" maxlength="200" placeholder="Subtask title" class="field max-w-sm" />
          <button type="button" class="rounded-lg border border-line px-3 py-2 text-sm disabled:opacity-40" :disabled="!subtaskTitle.trim() || organizing" @click="addSubtask">
            Add subtask
          </button>
        </div>
      </section>
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
  type CategoryView,
  type SubtaskView,
  type TagView,
  type TaskPriority,
  type TaskStatus,
  type TaskTagRef,
} from '@focusflow/shared-types'

export interface TaskDraft {
  title: string
  description: string
  status: TaskStatus
  priority: TaskPriority
  isUrgent: boolean
  isImportant: boolean
  deadline: string
  categoryId: string
}

const model = defineModel<TaskDraft>({ required: true })
const props = withDefaults(defineProps<{
  mode: 'create' | 'edit'
  statuses: TaskStatus[]
  submitting: boolean
  organizing: boolean
  error: string
  categories: CategoryView[]
  tags: TagView[]
  attachedTags: TaskTagRef[]
  subtasks: SubtaskView[]
  showOrganizer?: boolean
}>(), {
  showOrganizer: true,
})
const emit = defineEmits<{
  submit: []
  cancel: []
  attachTag: [tagId: string]
  detachTag: [tagId: string]
  addSubtask: [title: string]
  toggleSubtask: [id: string, completed: boolean]
  moveSubtask: [id: string, direction: -1 | 1]
  deleteSubtask: [id: string]
}>()

const selectedTagId = ref('')
const subtaskTitle = ref('')
const quadrant = computed(() => deriveEisenhowerQuadrant(model.value.isUrgent, model.value.isImportant))
const unusedTags = computed(() => props.tags.filter((tag) => !props.attachedTags.some((attached) => attached.id === tag.id)))

function submit() {
  emit('submit')
}

function attach() {
  if (!selectedTagId.value) return
  emit('attachTag', selectedTagId.value)
  selectedTagId.value = ''
}

function addSubtask() {
  const title = subtaskTitle.value.trim()
  if (!title) return
  emit('addSubtask', title)
  subtaskTitle.value = ''
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
