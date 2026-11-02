<template>
  <div class="space-y-5">
    <div class="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
      <div>
        <h1 class="text-2xl font-semibold tracking-tight">Planner</h1>
        <p class="mt-1 text-sm text-secondary">
          One day at a time. Moving a block changes its time only. Status and quadrant stay put.
        </p>
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

    <div class="flex flex-wrap items-center gap-2">
      <button type="button" class="rounded-lg border border-line px-3 py-1.5 text-sm" @click="setDate(shiftCivilDate(date, -1))">Previous</button>
      <button type="button" class="rounded-lg border border-line px-3 py-1.5 text-sm" @click="setDate(today)">Today</button>
      <button type="button" class="rounded-lg border border-line px-3 py-1.5 text-sm" @click="setDate(shiftCivilDate(date, 1))">Next</button>
      <p class="text-sm font-medium">{{ dayLabel }}</p>
      <p class="text-xs text-secondary">{{ timeZone }}</p>
    </div>

    <p v-if="error" class="text-sm text-danger" role="alert">{{ error }}</p>
    <p v-if="loading && !planner" class="text-sm text-secondary">Loading the day…</p>

    <div v-else class="grid gap-4 lg:grid-cols-[minmax(0,1.6fr)_minmax(16rem,1fr)]">
      <section class="rounded-card border border-line bg-surface p-3 shadow-card">
        <header class="mb-3 flex items-center justify-between">
          <h2 class="text-sm font-semibold">Timeline</h2>
          <span class="rounded-full bg-background px-2 py-0.5 text-xs font-medium text-secondary">{{ planner?.counts.timeline ?? 0 }}</span>
        </header>
        <p v-if="(planner?.timeline.length ?? 0) < (planner?.counts.timeline ?? 0)" class="mb-2 text-xs text-secondary">
          Showing {{ planner?.timeline.length }} of {{ planner?.counts.timeline }}
        </p>
        <p v-if="(planner?.timeline.length ?? 0) === 0" class="mb-3 text-sm text-secondary">
          Nothing is scheduled. Drop a task on an hour, or use Schedule in the unscheduled list.
        </p>
        <ol class="max-h-[70vh] space-y-1 overflow-y-auto pr-1">
          <li
            v-for="hour in hours"
            :key="hour"
            class="grid grid-cols-[3.5rem_minmax(0,1fr)] gap-2 rounded-lg border border-transparent px-1 py-1"
            :class="overHour === hour ? 'border-primary bg-primary/5' : ''"
            @dragover.prevent="overHour = hour"
            @drop.prevent="onDrop(hour)"
          >
            <span class="pt-2 text-xs text-secondary">{{ hourLabel(hour) }}</span>
            <div class="min-h-12 space-y-2">
              <article
                v-for="task in blocksAt(hour)"
                :key="task.id"
                draggable="true"
                class="cursor-grab rounded-lg border border-line bg-background p-2 active:cursor-grabbing"
                @dragstart="onDragStart(task, $event)"
                @dragend="clearDrag"
              >
                <p class="font-medium">{{ task.title }}</p>
                <p class="text-xs text-secondary">{{ formatClock(task.scheduledStart!, timeZone) }} – {{ formatClock(task.scheduledEnd!, timeZone) }}</p>
                <div class="mt-2 flex flex-wrap gap-2">
                  <button type="button" class="rounded-lg border border-line px-2 py-1 text-xs" @click="startEdit(task)">Edit</button>
                  <button type="button" class="rounded-lg border border-line px-2 py-1 text-xs" @click="unschedule(task.id)">Unschedule</button>
                </div>
              </article>
            </div>
          </li>
        </ol>
      </section>

      <section class="rounded-card border border-line bg-surface p-3 shadow-card">
        <header class="mb-3 flex items-center justify-between">
          <h2 class="text-sm font-semibold">Unscheduled</h2>
          <span class="rounded-full bg-background px-2 py-0.5 text-xs font-medium text-secondary">{{ planner?.counts.unscheduled ?? 0 }}</span>
        </header>
        <p v-if="(planner?.unscheduled.length ?? 0) < (planner?.counts.unscheduled ?? 0)" class="mb-2 text-xs text-secondary">
          Showing {{ planner?.unscheduled.length }} of {{ planner?.counts.unscheduled }}
        </p>
        <p v-if="(planner?.unscheduled.length ?? 0) === 0" class="text-sm text-secondary">No tasks are waiting for a time.</p>
        <ul class="max-h-[70vh] space-y-2 overflow-y-auto">
          <li
            v-for="task in planner?.unscheduled ?? []"
            :key="task.id"
            draggable="true"
            class="cursor-grab rounded-lg border border-line bg-background p-3 active:cursor-grabbing"
            @dragstart="onDragStart(task, $event)"
            @dragend="clearDrag"
          >
            <p class="font-medium">{{ task.title }}</p>
            <p class="mt-1 text-xs text-secondary">{{ TASK_STATUS_LABELS[task.status] }}</p>
            <div class="mt-2 grid grid-cols-2 gap-2">
              <label class="text-xs text-secondary">
                Start
                <select v-model.number="startHour[task.id]" class="field mt-1">
                  <option v-for="hour in hours" :key="hour" :value="hour">{{ hourLabel(hour) }}</option>
                </select>
              </label>
              <label class="text-xs text-secondary">
                Length
                <select v-model.number="duration[task.id]" class="field mt-1">
                  <option :value="30">30 min</option>
                  <option :value="60">1 hour</option>
                  <option :value="90">90 min</option>
                  <option :value="120">2 hours</option>
                </select>
              </label>
            </div>
            <div class="mt-2 flex flex-wrap gap-2">
              <button type="button" class="rounded-lg bg-primary px-2 py-1 text-xs font-medium text-white" @click="schedule(task.id, startHour[task.id] ?? 9, duration[task.id] ?? 60)">
                Schedule
              </button>
              <button type="button" class="rounded-lg border border-line px-2 py-1 text-xs" @click="startEdit(task)">Edit</button>
            </div>
          </li>
        </ul>
      </section>
    </div>
  </div>
</template>

<script setup lang="ts">
import { TASK_STATUSES, TASK_STATUS_LABELS, allowedStatusTargets, type TaskPlannerResponse, type TaskView } from '@focusflow/shared-types'
import { formatDateInTimeZone } from '@focusflow/shared-utils'
import { apiErrorMessage } from '~/utils/api-error'
import { fromDateTimeLocal, toDateTimeLocal } from '~/utils/datetime'
import { blockOnDay, formatClock, hourInZone, shiftCivilDate } from '~/utils/schedule'
import type { TaskDraft } from '~/components/TaskForm.vue'

const route = useRoute()
const auth = useAuthStore()
const tasks = useTasksStore()
const catalog = useCatalogStore()
const planner = ref<TaskPlannerResponse | null>(null)
const loading = ref(true)
const error = ref('')
const formError = ref('')
const formOpen = ref(false)
const editingId = ref('')
const saving = ref(false)
const draft = ref<TaskDraft>(blankDraft())
const date = ref('')
const draggingId = ref('')
const overHour = ref<number | null>(null)
const startHour = reactive<Record<string, number>>({})
const duration = reactive<Record<string, number>>({})
const hours = Array.from({ length: 24 }, (_, hour) => hour)

const timeZone = computed(() => auth.preferences?.timezone || planner.value?.timezone || 'UTC')
const today = computed(() => formatDateInTimeZone(new Date(), timeZone.value))
const dayLabel = computed(() => {
  if (!date.value) return ''
  const [year, month, day] = date.value.split('-').map(Number)
  const noon = new Date(Date.UTC(year ?? 1970, (month ?? 1) - 1, day ?? 1, 12))
  return new Intl.DateTimeFormat('en-US', {
    timeZone: 'UTC',
    weekday: 'long',
    month: 'long',
    day: 'numeric',
  }).format(noon)
})

const statusOptions = computed(() => {
  if (!editingId.value) return [...TASK_STATUSES]
  const current = [...(planner.value?.timeline ?? []), ...(planner.value?.unscheduled ?? [])].find((task) => task.id === editingId.value)
  return allowedStatusTargets(current?.status ?? draft.value.status)
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
    categoryId: '',
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
  }
}

function hourLabel(hour: number): string {
  const sample = new Date(Date.UTC(2026, 0, 1, hour))
  return new Intl.DateTimeFormat('en-US', { hour: 'numeric', timeZone: 'UTC' }).format(sample)
}

function blocksAt(hour: number): TaskView[] {
  return (planner.value?.timeline ?? []).filter((task) => task.scheduledStart && hourInZone(task.scheduledStart, timeZone.value) === hour)
}

function rememberChoices(rows: TaskView[]) {
  for (const task of rows) {
    if (startHour[task.id] === undefined) startHour[task.id] = 9
    if (duration[task.id] === undefined) duration[task.id] = 60
  }
}

async function load() {
  if (!date.value) return
  error.value = ''
  if (!planner.value) loading.value = true
  try {
    planner.value = await tasks.fetchPlanner(date.value)
    rememberChoices(planner.value.unscheduled)
  } catch (caught) {
    error.value = apiErrorMessage(caught, 'Could not load the planner.')
  } finally {
    loading.value = false
  }
}

async function setDate(next: string) {
  await navigateTo({ path: '/planner', query: { date: next } })
}

function startCreate() {
  editingId.value = ''
  draft.value = blankDraft()
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
  event.dataTransfer?.setData('text/plain', task.id)
  if (event.dataTransfer) event.dataTransfer.effectAllowed = 'move'
}

function clearDrag() {
  draggingId.value = ''
  overHour.value = null
}

function lengthMinutes(task: TaskView): number {
  if (!task.scheduledStart || !task.scheduledEnd) return 60
  return Math.max(15, Math.round((Date.parse(task.scheduledEnd) - Date.parse(task.scheduledStart)) / 60_000))
}

async function schedule(id: string, hour: number, minutes: number) {
  const block = blockOnDay(date.value, hour, minutes, timeZone.value)
  if (!block) {
    error.value = 'That block would run past midnight. Pick an earlier start or a shorter length.'
    return
  }
  error.value = ''
  try {
    await tasks.updateSchedule(id, block)
    await load()
  } catch (caught) {
    error.value = apiErrorMessage(caught, 'Could not schedule the task.')
    await load()
  }
}

async function unschedule(id: string) {
  error.value = ''
  try {
    await tasks.updateSchedule(id, { scheduledStart: null, scheduledEnd: null })
    await load()
  } catch (caught) {
    error.value = apiErrorMessage(caught, 'Could not clear the time block.')
  }
}

async function onDrop(hour: number) {
  const id = draggingId.value
  clearDrag()
  if (!id) return
  const task = [...(planner.value?.timeline ?? []), ...(planner.value?.unscheduled ?? [])].find((item) => item.id === id)
  await schedule(id, hour, task ? lengthMinutes(task) : 60)
}

watch(() => route.query.date, async (value) => {
  const next = typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value) ? value : today.value
  if (typeof value !== 'string') {
    await navigateTo({ path: '/planner', query: { date: next } }, { replace: true })
    return
  }
  date.value = next
  await load()
}, { immediate: true })

onMounted(async () => {
  await catalog.fetchCategories().catch(() => undefined)
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
