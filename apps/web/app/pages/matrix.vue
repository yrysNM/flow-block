<template>
  <div class="space-y-5">
    <div class="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
      <div>
        <h1 class="text-2xl font-semibold tracking-tight">Matrix</h1>
        <p class="mt-1 text-sm text-secondary">
          Drag a task between quadrants to change urgent and important. Status stays where it is.
        </p>
      </div>
      <button type="button" class="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white" @click="startCreate('DO')">
        New task
      </button>
    </div>

    <TaskForm
      v-if="formOpen"
      v-model="draft"
      :mode="editingId ? 'edit' : 'create'"
      :statuses="statusOptions"
      :submitting="saving"
      :organizing="false"
      :error="formError"
      :categories="catalog.categories"
      :tags="[]"
      :attached-tags="[]"
      :subtasks="[]"
      :show-organizer="false"
      @submit="save"
      @cancel="closeForm"
    />

    <p v-if="error" class="text-sm text-danger" role="alert">{{ error }}</p>
    <p v-if="loading && !matrix" class="text-sm text-secondary">Loading matrix…</p>

    <div v-else class="grid grid-cols-1 gap-4 md:grid-cols-2">
      <section
        v-for="column in matrix?.quadrants ?? []"
        :key="column.quadrant"
        class="min-h-48 rounded-card border bg-surface p-3 shadow-card"
        :class="overQuadrant === column.quadrant ? 'border-primary' : 'border-line'"
        @dragover.prevent="overQuadrant = column.quadrant"
        @drop.prevent="onDrop(column.quadrant)"
      >
        <header class="mb-3 flex items-start justify-between gap-2">
          <div>
            <h2 class="text-sm font-semibold">{{ EISENHOWER_QUADRANT_LABELS[column.quadrant] }}</h2>
            <p class="text-xs text-secondary">{{ hints[column.quadrant] }}</p>
          </div>
          <div class="flex items-center gap-2">
            <span class="rounded-full bg-background px-2 py-0.5 text-xs font-medium text-secondary">{{ column.count }}</span>
            <button type="button" class="rounded-lg border border-line px-2 py-1 text-xs" @click="startCreate(column.quadrant)">Add</button>
          </div>
        </header>
        <p v-if="column.tasks.length < column.count" class="mb-2 text-xs text-secondary">
          Showing {{ column.tasks.length }} of {{ column.count }}
        </p>
        <p v-if="column.tasks.length === 0" class="text-sm text-secondary">No tasks</p>
        <ul class="space-y-2">
          <li
            v-for="task in column.tasks"
            :key="task.id"
            draggable="true"
            class="cursor-grab rounded-lg border border-line bg-background p-3 active:cursor-grabbing"
            @dragstart="onDragStart(task, $event)"
            @dragend="clearDrag"
          >
            <p class="font-medium">{{ task.title }}</p>
            <p class="mt-1 text-xs text-secondary">{{ TASK_STATUS_LABELS[task.status] }}</p>
            <div class="mt-3 flex flex-col gap-2 sm:flex-row">
              <label class="min-w-0 flex-1 text-xs text-secondary">
                Quadrant
                <select
                  class="field mt-1"
                  :value="task.quadrant"
                  @change="moveTo(task, ($event.target as HTMLSelectElement).value)"
                >
                  <option v-for="quadrant in EISENHOWER_QUADRANTS" :key="quadrant" :value="quadrant">
                    {{ EISENHOWER_QUADRANT_LABELS[quadrant] }}
                  </option>
                </select>
              </label>
              <button type="button" class="self-end rounded-lg border border-line px-3 py-1.5 text-sm" @click="startEdit(task)">Edit</button>
            </div>
          </li>
        </ul>
      </section>
    </div>
  </div>
</template>

<script setup lang="ts">
import {
  EISENHOWER_QUADRANTS,
  EISENHOWER_QUADRANT_LABELS,
  TASK_STATUSES,
  TASK_STATUS_LABELS,
  allowedStatusTargets,
  flagsForQuadrant,
  type EisenhowerQuadrant,
  type TaskMatrixResponse,
  type TaskView,
} from '@focusflow/shared-types'
import { apiErrorMessage } from '~/utils/api-error'
import { fromDateTimeLocal, toDateTimeLocal } from '~/utils/datetime'
import type { TaskDraft } from '~/components/TaskForm.vue'

const hints: Record<EisenhowerQuadrant, string> = {
  DO: 'Urgent and important',
  SCHEDULE: 'Important, not urgent',
  DELEGATE: 'Urgent, not important',
  ELIMINATE: 'Neither urgent nor important',
}

const tasks = useTasksStore()
const catalog = useCatalogStore()
const matrix = ref<TaskMatrixResponse | null>(null)
const loading = ref(true)
const error = ref('')
const formError = ref('')
const formOpen = ref(false)
const editingId = ref('')
const saving = ref(false)
const draft = ref<TaskDraft>(blankDraft('DO'))
const draggingId = ref('')
const dragFrom = ref<EisenhowerQuadrant | ''>('')
const overQuadrant = ref<EisenhowerQuadrant | ''>('')

const statusOptions = computed(() => {
  if (!editingId.value) return [...TASK_STATUSES]
  const current = matrix.value?.quadrants.flatMap((column) => column.tasks).find((task) => task.id === editingId.value)
  return allowedStatusTargets(current?.status ?? draft.value.status)
})

function blankDraft(quadrant: EisenhowerQuadrant): TaskDraft {
  const flags = flagsForQuadrant(quadrant)
  return {
    title: '',
    description: '',
    status: 'TODO',
    priority: 'MEDIUM',
    isUrgent: flags.isUrgent,
    isImportant: flags.isImportant,
    deadline: '',
    categoryId: '',
    recurrence: 'NONE',
  }
}

function draftFromTask(task: TaskView): TaskDraft {
  return {
    title: task.title,
    description: task.description ?? '',
    status: task.status,
    priority: task.priority,
    isUrgent: task.isUrgent,
    isImportant: task.isImportant,
    deadline: toDateTimeLocal(task.deadline),
    categoryId: task.categoryId ?? '',
    recurrence: task.recurrence,
  }
}

async function load() {
  error.value = ''
  if (!matrix.value) loading.value = true
  try {
    matrix.value = await tasks.fetchMatrix({})
  } catch (caught) {
    error.value = apiErrorMessage(caught, 'Could not load the matrix.')
  } finally {
    loading.value = false
  }
}

function startCreate(quadrant: EisenhowerQuadrant) {
  editingId.value = ''
  draft.value = blankDraft(quadrant)
  formError.value = ''
  formOpen.value = true
}

function startEdit(task: TaskView) {
  editingId.value = task.id
  draft.value = draftFromTask(task)
  formError.value = ''
  formOpen.value = true
}

function closeForm() {
  formOpen.value = false
  editingId.value = ''
  formError.value = ''
}

async function save() {
  formError.value = ''
  saving.value = true
  const payload = {
    title: draft.value.title.trim(),
    description: draft.value.description.trim() || null,
    status: draft.value.status,
    priority: draft.value.priority,
    isUrgent: draft.value.isUrgent,
    isImportant: draft.value.isImportant,
    deadline: fromDateTimeLocal(draft.value.deadline),
    categoryId: draft.value.categoryId || null,
    recurrence: draft.value.recurrence,
  }
  try {
    if (editingId.value) await tasks.update(editingId.value, payload)
    else await tasks.create(payload)
    closeForm()
    await load()
    await tasks.fetchSummary().catch(() => undefined)
  } catch (caught) {
    formError.value = apiErrorMessage(caught, 'Could not save the task.')
  } finally {
    saving.value = false
  }
}

function onDragStart(task: TaskView, event: DragEvent) {
  const target = event.target
  if (target instanceof Element && target.closest('select, button, a, input, label')) {
    event.preventDefault()
    return
  }
  draggingId.value = task.id
  dragFrom.value = task.quadrant
  event.dataTransfer?.setData('text/plain', task.id)
  if (event.dataTransfer) event.dataTransfer.effectAllowed = 'move'
}

function clearDrag() {
  draggingId.value = ''
  dragFrom.value = ''
  overQuadrant.value = ''
}

async function moveTo(task: TaskView, value: string) {
  const quadrant = value as EisenhowerQuadrant
  if (quadrant === task.quadrant) return
  await writeQuadrant(task.id, quadrant)
}

async function onDrop(quadrant: EisenhowerQuadrant) {
  const id = draggingId.value
  const from = dragFrom.value
  clearDrag()
  if (!id || !from || from === quadrant) return
  await writeQuadrant(id, quadrant)
}

async function writeQuadrant(id: string, quadrant: EisenhowerQuadrant) {
  error.value = ''
  try {
    await tasks.updateQuadrant(id, flagsForQuadrant(quadrant))
    await load()
  } catch (caught) {
    error.value = apiErrorMessage(caught, 'Could not move the task.')
    await load()
  }
}

onMounted(async () => {
  await catalog.fetchCategories().catch(() => undefined)
  await load()
})
</script>

<style scoped>
.field {
  width: 100%;
  border-radius: 0.65rem;
  border: 1px solid var(--color-line);
  background: white;
  padding: 0.4rem 0.6rem;
  color: var(--color-ink);
}
</style>
