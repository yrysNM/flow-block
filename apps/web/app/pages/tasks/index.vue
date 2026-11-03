<template>
  <div class="space-y-4">
    <h1 class="sr-only">Tasks</h1>

    <div class="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-2 gap-y-2 lg:flex lg:flex-wrap">
      <label class="relative min-w-0 lg:max-w-md lg:flex-1">
        <span class="sr-only">Search tasks</span>
        <svg class="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-secondary" viewBox="0 0 20 20" fill="none" aria-hidden="true">
          <circle cx="9" cy="9" r="5.25" stroke="currentColor" stroke-width="1.6" />
          <path d="M13.2 13.2 16.5 16.5" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" />
        </svg>
        <input
          v-model="search"
          type="search"
          placeholder="Search tasks..."
          class="w-full rounded-full border border-[#E4E9F2] bg-white py-2 pl-10 pr-4 text-sm text-ink shadow-[0_1px_2px_rgb(23_32_51/0.04)] outline-none placeholder:text-secondary"
        />
      </label>
      <div class="flex items-center gap-2 lg:order-last lg:ml-auto">
        <button
          type="button"
          class="grid size-10 place-items-center rounded-full bg-primary text-white shadow-[0_8px_16px_rgb(0_85_250/0.28)]"
          aria-label="New task"
          @click="startCreate"
        >
          <svg viewBox="0 0 20 20" class="size-5" fill="none" aria-hidden="true">
            <path d="M10 4.5v11M4.5 10h11" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" />
          </svg>
        </button>
        <NuxtLink
          to="/settings"
          class="grid size-10 place-items-center rounded-full bg-primary text-sm font-semibold text-white"
          :aria-label="`Account settings for ${auth.user?.name ?? 'you'}`"
        >
          {{ userInitials }}
        </NuxtLink>
      </div>
      <div class="col-span-2 flex flex-wrap items-center gap-2 lg:contents">
        <PillMenu v-model="status" label="Status" :options="statusOptions" />
        <PillMenu v-if="showCategoryFilter" v-model="category" label="Category" :options="categoryOptions" />
        <button type="button" class="px-1 text-sm font-medium text-secondary hover:text-ink" @click="clearFilters">
          Clear
        </button>
      </div>
    </div>

    <p v-if="listError" class="rounded-xl border border-danger/30 bg-danger/5 px-3 py-2 text-sm text-danger" role="alert">
      {{ listError }}
    </p>

    <div class="flex flex-col gap-3 md:flex-row md:items-start">
      <nav class="flex md:w-16 md:shrink-0 md:flex-col" aria-label="Task views">
        <button
          type="button"
          class="inline-flex items-center gap-2 rounded-2xl bg-white px-3 py-2 text-xs font-medium text-ink shadow-[0_1px_2px_rgb(23_32_51/0.04)] md:flex-col md:gap-1 md:px-2 md:py-3"
          aria-current="page"
        >
          <svg viewBox="0 0 24 24" class="size-5 text-primary" fill="none" aria-hidden="true">
            <rect x="4" y="4" width="7" height="7" rx="1.5" stroke="currentColor" stroke-width="1.7" />
            <rect x="13" y="4" width="7" height="7" rx="1.5" stroke="currentColor" stroke-width="1.7" />
            <rect x="4" y="13" width="7" height="7" rx="1.5" stroke="currentColor" stroke-width="1.7" />
            <rect x="13" y="13" width="7" height="7" rx="1.5" stroke="currentColor" stroke-width="1.7" />
          </svg>
          Matrix
        </button>
      </nav>

      <div class="min-w-0 flex-1 space-y-4">
        <p v-if="loading && items.length === 0" class="text-sm text-secondary">Loading tasks…</p>
        <EisenhowerMatrix :tasks="filtered" @select="openTask" @overflow="openOverflow" @move="moveTask" />

        <div class="flex flex-col gap-2 px-1 sm:flex-row sm:items-center sm:justify-between">
          <ul class="flex flex-wrap gap-x-4 gap-y-2" aria-label="Categories">
            <li v-for="entry in legend" :key="entry.key" class="inline-flex items-center gap-2 text-sm text-secondary">
              <span class="size-2.5 rounded-full" :style="{ background: entry.color }" />
              {{ entry.label }}
            </li>
          </ul>
          <p class="text-xs text-secondary">Drag tasks to reprioritize · Click for details</p>
        </div>

        <p v-if="!loading && items.length === 0 && !listError" class="px-1 text-sm text-secondary">
          No tasks yet. Use the add button to place one on the matrix.
        </p>
        <p v-else-if="!loading && items.length > 0 && filtered.length === 0" class="px-1 text-sm text-secondary">
          No tasks match these filters.
        </p>

        <section class="grid grid-cols-2 gap-3 md:grid-cols-5" aria-label="Task summary">
          <article v-for="card in summaryCards" :key="card.label" class="rounded-2xl border border-[#E6EBF3] bg-white px-4 py-3.5 shadow-[0_1px_2px_rgb(23_32_51/0.04)]">
            <p class="text-[1.75rem] font-semibold leading-none tracking-tight text-ink">{{ card.value }}</p>
            <p class="mt-2 text-sm text-secondary">{{ card.label }}</p>
          </article>
        </section>
      </div>
    </div>

    <div
      v-if="formOpen"
      class="fixed inset-0 z-50 flex items-end justify-center bg-ink/30 p-4 sm:items-center"
      @click.self="closeForm"
    >
      <div class="max-h-[90vh] w-full max-w-2xl overflow-auto" role="dialog" aria-modal="true" aria-labelledby="task-form-title">
        <TaskForm
          v-model="draft"
          :mode="editingId ? 'edit' : 'create'"
          :statuses="statusChoices"
          :submitting="saving"
          :error="formError"
          @submit="save"
          @cancel="closeForm"
        />
      </div>
    </div>

    <div
      v-if="selected"
      class="fixed inset-0 z-40 flex items-end justify-center bg-ink/30 p-4 sm:items-center"
      @click.self="closeDetail"
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="task-detail-title"
        class="w-full max-w-md rounded-3xl border border-line bg-white p-5 shadow-card"
      >
        <div class="flex items-start justify-between gap-3">
          <div class="min-w-0">
            <h2 id="task-detail-title" class="text-lg font-semibold text-ink">{{ selected.title }}</h2>
            <p class="mt-1 text-sm text-secondary">{{ formatWhen(selected.deadline) }}</p>
          </div>
          <button ref="detailClose" type="button" class="text-sm text-secondary hover:text-ink" @click="closeDetail">
            Close
          </button>
        </div>
        <p v-if="selected.description" class="mt-3 text-sm leading-6 text-ink">{{ selected.description }}</p>
        <div class="mt-3">
          <TaskBadges :status="selected.status" :priority="selected.priority" :quadrant="quadrantOf(selected)" />
        </div>

        <label class="mt-4 block text-sm font-medium text-ink">
          Status
          <select class="field mt-1" :value="selected.status" @change="changeStatus(selected, ($event.target as HTMLSelectElement).value)">
            <option v-for="option in detailStatuses" :key="option" :value="option">{{ TASK_STATUS_LABELS[option] }}</option>
          </select>
        </label>

        <div class="mt-4">
          <p class="text-sm font-medium text-ink">Move to</p>
          <p class="mt-1 text-xs text-secondary">This changes urgent and important only. Status stays as it is.</p>
          <div class="mt-2 grid grid-cols-2 gap-2">
            <button
              v-for="quadrant in QUADRANTS"
              :key="quadrant.id"
              type="button"
              class="rounded-xl px-3 py-2 text-left text-xs font-bold uppercase tracking-wide"
              :class="quadrantOf(selected) === quadrant.id ? 'ring-2 ring-inset ring-current' : ''"
              :style="{ background: quadrant.background, color: quadrant.accent }"
              :aria-pressed="quadrantOf(selected) === quadrant.id"
              @click="moveTask(selected.id, quadrant.id)"
            >
              {{ quadrant.title }}
            </button>
          </div>
        </div>

        <div class="mt-5 flex flex-wrap justify-end gap-2">
          <button type="button" class="rounded-lg border border-line px-3 py-2 text-sm" @click="startEdit(selected)">Edit</button>
          <button type="button" class="rounded-lg border border-danger/30 px-3 py-2 text-sm text-danger" @click="confirmDelete = true">
            Delete
          </button>
        </div>
        <div v-if="confirmDelete" class="mt-3 flex items-center justify-end gap-2 text-sm">
          <span>Delete this task?</span>
          <button type="button" class="rounded-lg bg-danger px-3 py-1.5 text-white" @click="remove(selected.id)">Delete</button>
          <button type="button" class="rounded-lg border border-line px-3 py-1.5" @click="confirmDelete = false">Cancel</button>
        </div>
      </div>
    </div>

    <div
      v-if="overflowTasks.length > 0"
      class="fixed inset-0 z-40 flex items-end justify-center bg-ink/30 p-4 sm:items-center"
      @click.self="overflowTasks = []"
    >
      <div role="dialog" aria-modal="true" aria-labelledby="overflow-title" class="w-full max-w-sm rounded-3xl border border-line bg-white p-5 shadow-card">
        <div class="flex items-center justify-between gap-3">
          <h2 id="overflow-title" class="text-base font-semibold">More tasks</h2>
          <button type="button" class="text-sm text-secondary hover:text-ink" @click="overflowTasks = []">Close</button>
        </div>
        <ul class="mt-3 divide-y divide-line">
          <li v-for="task in overflowTasks" :key="task.id">
            <button type="button" class="w-full py-2.5 text-left text-sm font-medium hover:text-primary" @click="openFromOverflow(task)">
              {{ task.title }}
            </button>
          </li>
        </ul>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import {
  TASK_STATUSES,
  TASK_STATUS_LABELS,
  allowedStatusTargets,
  type EisenhowerQuadrant,
  type TaskStatus,
  type TaskView,
} from '@focusflow/shared-types'
import { apiErrorMessage } from '~/utils/api-error'
import { formatWhen, fromDateTimeLocal, toDateTimeLocal } from '~/utils/datetime'
import {
  initials,
  legendEntries,
  matrixCounts,
  NO_CATEGORY_KEY,
  QUADRANT_FLAGS,
  QUADRANTS,
  quadrantOf,
} from '~/utils/eisenhower-board'
import type { TaskDraft } from '~/components/TaskForm.vue'

const route = useRoute()
const router = useRouter()
const auth = useAuthStore()
const tasksStore = useTasksStore()

const items = computed(() => tasksStore.items)
const loading = computed(() => tasksStore.loading)

const search = ref('')
const status = ref<string>(readStatus(route.query.status))
const category = ref('')
const listError = ref('')
const formOpen = ref(false)
const editingId = ref('')
const saving = ref(false)
const formError = ref('')
const draft = ref<TaskDraft>(blankDraft())
const selected = ref<TaskView | null>(null)
const confirmDelete = ref(false)
const overflowTasks = ref<TaskView[]>([])
const detailClose = ref<HTMLButtonElement | null>(null)

const statusOptions = [
  { id: '', label: 'All' },
  ...TASK_STATUSES.map((value) => ({ id: value, label: TASK_STATUS_LABELS[value] })),
]

const showCategoryFilter = computed(() => items.value.some((task) => task.categoryId))
const categoryOptions = computed(() => [
  { id: '', label: 'All' },
  ...legendEntries(items.value).map((entry) => ({ id: entry.key, label: entry.label, color: entry.color })),
])

const filtered = computed(() => {
  const query = search.value.trim().toLowerCase()
  return items.value.filter((task) => {
    if (status.value && task.status !== status.value) return false
    if (category.value === NO_CATEGORY_KEY && task.categoryId) return false
    if (category.value && category.value !== NO_CATEGORY_KEY && task.categoryId !== category.value) return false
    if (!query) return true
    return `${task.title} ${task.description ?? ''}`.toLowerCase().includes(query)
  })
})

const legend = computed(() => legendEntries(filtered.value))

const summaryCards = computed(() => {
  const zone = auth.preferences?.timezone || 'UTC'
  const weekStartsOn = auth.preferences?.weekStartsOn ?? 1
  const counts = matrixCounts(items.value, zone, weekStartsOn)
  return [
    { label: 'Due today', value: counts.dueToday },
    { label: 'Overdue', value: counts.overdue },
    { label: 'In progress', value: counts.inProgress },
    { label: 'Due this week', value: counts.dueThisWeek },
    { label: 'Finished', value: counts.finished },
  ]
})

const userInitials = computed(() => initials(auth.user?.name || 'You'))

const statusChoices = computed(() => {
  if (!editingId.value) return [...TASK_STATUSES]
  const current = items.value.find((task) => task.id === editingId.value)
  return current ? allowedStatusTargets(current.status) : [...TASK_STATUSES]
})

const detailStatuses = computed(() => (selected.value ? allowedStatusTargets(selected.value.status) : []))

watch(
  () => route.query.status,
  (value) => {
    const next = readStatus(value)
    if (next !== status.value) status.value = next
  },
)

watch(status, (value) => {
  if (readStatus(route.query.status) === value) return
  const query = { ...route.query }
  if (value) query.status = value
  else delete query.status
  void router.replace({ query })
})

watch(categoryOptions, (options) => {
  if (category.value && !options.some((option) => option.id === category.value)) category.value = ''
})

watch(selected, async (task, previous) => {
  if (!task || task.id === previous?.id) return
  await nextTick()
  detailClose.value?.focus()
})

function readStatus(value: unknown): '' | TaskStatus {
  if (value === 'TODO' || value === 'IN_PROGRESS' || value === 'COMPLETED') return value
  return ''
}

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

function clearFilters() {
  search.value = ''
  status.value = ''
  category.value = ''
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
  selected.value = null
  confirmDelete.value = false
  formOpen.value = true
}

function closeForm() {
  formOpen.value = false
  editingId.value = ''
  formError.value = ''
}

function openTask(task: TaskView) {
  confirmDelete.value = false
  selected.value = task
}

function openOverflow(tasks: TaskView[]) {
  overflowTasks.value = tasks
}

function openFromOverflow(task: TaskView) {
  overflowTasks.value = []
  openTask(task)
}

function closeDetail() {
  selected.value = null
  confirmDelete.value = false
}

function onKey(event: KeyboardEvent) {
  if (event.key !== 'Escape') return
  if (formOpen.value) closeForm()
  else if (overflowTasks.value.length > 0) overflowTasks.value = []
  else if (selected.value) closeDetail()
}

async function reload() {
  listError.value = ''
  try {
    await tasksStore.fetchAll()
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
  try {
    const saved = editingId.value
      ? await tasksStore.update(editingId.value, payload)
      : await tasksStore.create(payload)
    tasksStore.replaceLocal(saved)
    closeForm()
  } catch (caught) {
    formError.value = apiErrorMessage(caught, 'Could not save the task.')
  } finally {
    saving.value = false
  }
}

async function moveTask(id: string, quadrant: EisenhowerQuadrant) {
  const current = tasksStore.items.find((task) => task.id === id)
  if (!current) return
  const flags = QUADRANT_FLAGS[quadrant]
  if (current.isUrgent === flags.isUrgent && current.isImportant === flags.isImportant) return
  const previous = current
  const optimistic = { ...current, ...flags, quadrant }
  tasksStore.replaceLocal(optimistic)
  if (selected.value?.id === id) selected.value = optimistic
  listError.value = ''
  try {
    const saved = await tasksStore.update(id, {
      isUrgent: flags.isUrgent,
      isImportant: flags.isImportant,
    })
    tasksStore.replaceLocal(saved)
    if (selected.value?.id === id) selected.value = saved
  } catch (caught) {
    tasksStore.replaceLocal(previous)
    if (selected.value?.id === id) selected.value = previous
    listError.value = apiErrorMessage(caught, 'Could not move the task.')
  }
}

async function changeStatus(task: TaskView, value: string) {
  const next = value as TaskStatus
  if (next === task.status) return
  listError.value = ''
  try {
    const saved = await tasksStore.updateStatus(task.id, next)
    tasksStore.replaceLocal(saved)
    if (selected.value?.id === task.id) selected.value = saved
  } catch (caught) {
    listError.value = apiErrorMessage(caught, 'Could not change status.')
    await reload()
  }
}

async function remove(id: string) {
  listError.value = ''
  try {
    await tasksStore.remove(id)
    tasksStore.removeLocal(id)
    overflowTasks.value = overflowTasks.value.filter((task) => task.id !== id)
    closeDetail()
  } catch (caught) {
    listError.value = apiErrorMessage(caught, 'Could not delete the task.')
  }
}

onMounted(async () => {
  window.addEventListener('keydown', onKey)
  await reload()
  if (route.query.create === '1') {
    startCreate()
    const query = { ...route.query }
    delete query.create
    void router.replace({ query })
  }
})

onBeforeUnmount(() => {
  window.removeEventListener('keydown', onKey)
})
</script>

<style scoped>
.field {
  width: 100%;
  border-radius: 0.65rem;
  border: 1px solid var(--color-line);
  background: white;
  padding: 0.45rem 0.65rem;
  color: var(--color-ink);
}
</style>
