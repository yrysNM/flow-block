<template>
  <div class="space-y-5">
    <div class="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
      <div>
        <h1 class="text-2xl font-semibold tracking-tight">Tasks</h1>
        <p class="mt-1 text-sm text-secondary">One list for everything you own. Status and quadrant stay independent.</p>
      </div>
      <button type="button" class="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white" @click="startCreate">
        New task
      </button>
    </div>

    <TaskForm
      v-if="formOpen"
      v-model="draft"
      :mode="editingId ? 'edit' : 'create'"
      :statuses="statusOptions"
      :submitting="saving"
      :error="formError"
      @submit="save"
      @cancel="closeForm"
    />

    <div class="flex flex-col gap-3 rounded-card border border-line bg-surface p-3 shadow-card sm:flex-row sm:items-center">
      <label class="text-sm text-secondary">
        Status
        <select v-model="filters.status" class="field ml-2" @change="reload(1)">
          <option value="">All</option>
          <option v-for="status in TASK_STATUSES" :key="status" :value="status">{{ TASK_STATUS_LABELS[status] }}</option>
        </select>
      </label>
      <label class="text-sm text-secondary">
        Sort
        <select v-model="filters.sort" class="field ml-2" @change="reload(1)">
          <option value="createdAt">Created</option>
          <option value="updatedAt">Updated</option>
          <option value="deadline">Deadline</option>
          <option value="priority">Priority</option>
          <option value="title">Title</option>
        </select>
      </label>
      <label class="text-sm text-secondary">
        Order
        <select v-model="filters.order" class="field ml-2" @change="reload(1)">
          <option value="desc">Descending</option>
          <option value="asc">Ascending</option>
        </select>
      </label>
    </div>

    <p v-if="listError" class="text-sm text-danger" role="alert">{{ listError }}</p>
    <p v-if="loading" class="text-sm text-secondary">Loading tasks…</p>

    <EmptyState
      v-if="!loading && items.length === 0 && !filters.status"
      title="No tasks yet"
      body="Add a title, a deadline if you have one, and mark whether it is urgent or important."
      action-label="Create a task"
      @action="startCreate"
    />
    <EmptyState
      v-else-if="!loading && items.length === 0"
      title="No tasks in this view"
      body="Try another status filter, or create a task in this state."
    />

    <ul v-else class="space-y-3">
      <li v-for="task in items" :key="task.id" class="rounded-card border border-line bg-surface p-4 shadow-card">
        <div class="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
          <div class="min-w-0">
            <h2 class="font-medium">{{ task.title }}</h2>
            <p v-if="task.description" class="mt-1 text-sm text-secondary">{{ task.description }}</p>
            <p class="mt-2 text-sm text-secondary">{{ formatWhen(task.deadline) }}</p>
            <div class="mt-3">
              <TaskBadges :status="task.status" :priority="task.priority" :quadrant="task.quadrant" />
            </div>
          </div>
          <div class="flex flex-wrap items-center gap-2">
            <label class="text-xs text-secondary">
              <span class="sr-only">Status for {{ task.title }}</span>
              <select
                class="field"
                :value="task.status"
                @change="changeStatus(task, ($event.target as HTMLSelectElement).value)"
              >
                <option v-for="status in allowedStatusTargets(task.status)" :key="status" :value="status">
                  {{ TASK_STATUS_LABELS[status] }}
                </option>
              </select>
            </label>
            <button type="button" class="rounded-lg border border-line px-3 py-1.5 text-sm" @click="startEdit(task)">Edit</button>
            <button type="button" class="rounded-lg border border-danger/30 px-3 py-1.5 text-sm text-danger" @click="confirmId = task.id">
              Delete
            </button>
          </div>
        </div>
        <div v-if="confirmId === task.id" class="mt-3 flex items-center gap-2 text-sm">
          <span>Delete this task?</span>
          <button type="button" class="rounded-lg bg-danger px-3 py-1.5 text-white" @click="remove(task.id)">Delete</button>
          <button type="button" class="rounded-lg border border-line px-3 py-1.5" @click="confirmId = ''">Cancel</button>
        </div>
      </li>
    </ul>

    <div v-if="meta.pageCount > 1" class="flex items-center justify-between text-sm">
      <button type="button" class="rounded-lg border border-line px-3 py-1.5 disabled:opacity-40" :disabled="meta.page <= 1" @click="reload(meta.page - 1)">
        Previous
      </button>
      <span class="text-secondary">Page {{ meta.page }} of {{ meta.pageCount }}</span>
      <button type="button" class="rounded-lg border border-line px-3 py-1.5 disabled:opacity-40" :disabled="meta.page >= meta.pageCount" @click="reload(meta.page + 1)">
        Next
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import {
  TASK_STATUSES,
  TASK_STATUS_LABELS,
  allowedStatusTargets,
  type TaskStatus,
  type TaskView,
} from '@focusflow/shared-types'
import type { ListTasksQuery } from '@focusflow/shared-schemas'
import { apiErrorMessage } from '~/utils/api-error'
import { formatWhen, fromDateTimeLocal, toDateTimeLocal } from '~/utils/datetime'
import type { TaskDraft } from '~/components/TaskForm.vue'

const route = useRoute()
const tasksStore = useTasksStore()
const items = computed(() => tasksStore.items)
const meta = computed(() => tasksStore.meta)
const loading = computed(() => tasksStore.loading)

const filters = reactive({
  status: '' as '' | TaskStatus,
  sort: 'createdAt' as ListTasksQuery['sort'],
  order: 'desc' as ListTasksQuery['order'],
})

const formOpen = ref(false)
const editingId = ref('')
const saving = ref(false)
const formError = ref('')
const listError = ref('')
const confirmId = ref('')
const draft = ref<TaskDraft>(blankDraft())

const statusOptions = computed(() => {
  if (!editingId.value) return [...TASK_STATUSES]
  const current = items.value.find((task) => task.id === editingId.value)
  return current ? allowedStatusTargets(current.status) : [...TASK_STATUSES]
})

function blankDraft(): TaskDraft {
  return {
    title: '',
    description: '',
    status: 'TODO',
    priority: 'MEDIUM',
    isUrgent: false,
    isImportant: false,
    deadline: '',
  }
}

function startCreate() {
  editingId.value = ''
  draft.value = blankDraft()
  formError.value = ''
  formOpen.value = true
}

function startEdit(task: TaskView) {
  editingId.value = task.id
  draft.value = {
    title: task.title,
    description: task.description ?? '',
    status: task.status,
    priority: task.priority,
    isUrgent: task.isUrgent,
    isImportant: task.isImportant,
    deadline: toDateTimeLocal(task.deadline),
  }
  formError.value = ''
  formOpen.value = true
}

function closeForm() {
  formOpen.value = false
  editingId.value = ''
  formError.value = ''
}

function query(page: number): ListTasksQuery {
  return {
    ...(filters.status ? { status: filters.status } : {}),
    sort: filters.sort,
    order: filters.order,
    page,
    pageSize: 20,
  }
}

async function reload(page = meta.value.page || 1) {
  listError.value = ''
  try {
    await tasksStore.fetchList(query(page))
  } catch (caught) {
    listError.value = apiErrorMessage(caught, 'Could not load tasks.')
  }
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
  }
  const wasEdit = Boolean(editingId.value)
  try {
    if (editingId.value) await tasksStore.update(editingId.value, payload)
    else await tasksStore.create(payload)
    closeForm()
    await reload(wasEdit ? meta.value.page : 1)
    await tasksStore.fetchSummary().catch(() => undefined)
  } catch (caught) {
    formError.value = apiErrorMessage(caught, 'Could not save the task.')
  } finally {
    saving.value = false
  }
}

async function changeStatus(task: TaskView, value: string) {
  const status = value as TaskStatus
  if (status === task.status) return
  listError.value = ''
  try {
    await tasksStore.updateStatus(task.id, status)
    await reload()
    await tasksStore.fetchSummary()
  } catch (caught) {
    listError.value = apiErrorMessage(caught, 'Could not change status.')
    await reload()
  }
}

async function remove(id: string) {
  listError.value = ''
  try {
    await tasksStore.remove(id)
    confirmId.value = ''
    await reload()
    await tasksStore.fetchSummary()
  } catch (caught) {
    listError.value = apiErrorMessage(caught, 'Could not delete the task.')
  }
}

onMounted(async () => {
  const initial = route.query.status
  if (initial === 'TODO' || initial === 'IN_PROGRESS' || initial === 'COMPLETED') filters.status = initial
  await reload(1)
  if (route.query.create === '1') startCreate()
})
</script>

<style scoped>
.field {
  border-radius: 0.65rem;
  border: 1px solid var(--color-line);
  background: white;
  padding: 0.4rem 0.6rem;
  color: var(--color-ink);
}
</style>
