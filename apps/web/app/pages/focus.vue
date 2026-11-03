<template>
  <div class="space-y-8">
    <div>
      <h1 class="text-2xl font-semibold tracking-tight">Focus</h1>
      <p class="mt-1 text-sm text-secondary">One session at a time. The clock on this page is a display. Elapsed time is calculated on the server.</p>
    </div>

    <p v-if="error" class="text-sm text-danger" role="alert">{{ error }}</p>
    <p v-if="notice" class="text-sm text-secondary">{{ notice }}</p>

    <section v-if="active" class="rounded-card border border-line bg-surface p-5 shadow-card">
      <div class="flex flex-wrap items-center justify-between gap-3">
        <p class="text-sm font-medium text-secondary">{{ statusLabel }}</p>
        <p v-if="active.task" class="text-sm text-ink">{{ active.task.title }}</p>
        <p v-else class="text-sm text-secondary">No task</p>
      </div>
      <p class="mt-6 font-mono text-6xl font-semibold tracking-tight text-ink" aria-live="polite">{{ clock }}</p>
      <p class="mt-2 text-sm text-secondary">
        {{ elapsedLabel }} elapsed of {{ plannedLabel }}
        <span v-if="displayRemaining === 0 && active.status === 'RUNNING'"> · Time is up. End the session when you are done.</span>
      </p>
      <div class="mt-6 flex flex-wrap gap-2">
        <button
          v-if="active.status === 'RUNNING'"
          type="button"
          class="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white"
          :disabled="busy"
          @click="pause"
        >
          Pause
        </button>
        <button
          v-else
          type="button"
          class="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white"
          :disabled="busy"
          @click="resume"
        >
          Resume
        </button>
        <button type="button" class="rounded-lg border border-line px-4 py-2 text-sm font-medium text-ink" :disabled="busy" @click="complete">
          Complete
        </button>
        <button type="button" class="rounded-lg border border-line px-4 py-2 text-sm font-medium text-ink" :disabled="busy" @click="stop">
          End without completing
        </button>
      </div>
    </section>

    <section v-else class="rounded-card border border-line bg-surface p-5 shadow-card">
      <h2 class="text-base font-semibold">Start a session</h2>
      <form class="mt-4 space-y-4" @submit.prevent="start">
        <div>
          <p class="text-sm font-medium">Duration</p>
          <div class="mt-2 flex flex-wrap gap-2">
            <button
              v-for="minutes in presets"
              :key="minutes"
              type="button"
              class="rounded-lg border px-3 py-1.5 text-sm font-medium"
              :class="preset === minutes ? 'border-primary bg-primary/10 text-primary' : 'border-line text-ink'"
              @click="choosePreset(minutes)"
            >
              {{ minutes }} min
            </button>
            <button
              type="button"
              class="rounded-lg border px-3 py-1.5 text-sm font-medium"
              :class="preset === 'custom' ? 'border-primary bg-primary/10 text-primary' : 'border-line text-ink'"
              @click="choosePreset('custom')"
            >
              Custom
            </button>
          </div>
          <label v-if="preset === 'custom'" class="mt-3 block max-w-xs text-sm font-medium">
            Minutes
            <input v-model.number="customMinutes" type="number" min="1" max="180" required class="field mt-1" @input="durationChosen = true" />
          </label>
        </div>
        <label class="block max-w-md text-sm font-medium">
          Task
          <select v-model="taskId" class="field mt-1">
            <option value="">No task</option>
            <option v-for="task in tasks" :key="task.id" :value="task.id">{{ task.title }}</option>
          </select>
        </label>
        <button type="submit" class="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white" :disabled="busy">
          Start focus
        </button>
      </form>
    </section>

    <section class="rounded-card border border-line bg-surface p-5 shadow-card">
      <h2 class="text-base font-semibold">History</h2>
      <p v-if="history.length === 0" class="mt-4 text-sm text-secondary">Completed and stopped sessions show up here.</p>
      <ul v-else class="mt-4 divide-y divide-line">
        <li v-for="session in history" :key="session.id" class="flex flex-col gap-1 py-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p class="font-medium text-ink">{{ session.task?.title || 'No task' }}</p>
            <p class="text-sm text-secondary">{{ formatWhen(session.startedAt) }}</p>
          </div>
          <p class="text-sm text-secondary">
            {{ statusText(session.status) }} · {{ formatClock(session.elapsedSeconds) }} / {{ formatClock(session.plannedSeconds) }}
          </p>
        </li>
      </ul>
    </section>
  </div>
</template>

<script setup lang="ts">
import {
  FOCUS_MAX_PLANNED_SECONDS,
  FOCUS_MIN_PLANNED_SECONDS,
  FOCUS_PRESET_MINUTES,
  FOCUS_SESSION_STATUS_LABELS,
  type FocusSessionListResponse,
  type FocusSessionStatus,
  type FocusSessionView,
  type TaskListResponse,
} from '@focusflow/shared-types'
import { initialFocusSelection } from '@focusflow/shared-utils'
import { apiErrorMessage } from '~/utils/api-error'

const api = useApi()
const auth = useAuthStore()
const presets = FOCUS_PRESET_MINUTES
const active = ref<FocusSessionView | null>(null)
const history = ref<FocusSessionView[]>([])
const tasks = ref<Array<{ id: string; title: string }>>([])
const error = ref('')
const notice = ref('')
const busy = ref(false)
const preset = ref<number | 'custom'>(25)
const customMinutes = ref(25)
const durationChosen = ref(false)
const taskId = ref('')
const receivedAt = ref(0)
const nowMs = ref(Date.now())
let clockTimer: number | undefined
let pollTimer: number | undefined
let loadGeneration = 0

const displayRemaining = computed(() => {
  if (!active.value) return 0
  if (active.value.status !== 'RUNNING') return active.value.remainingSeconds
  const drift = (nowMs.value - receivedAt.value) / 1000
  return Math.max(0, active.value.remainingSeconds - drift)
})

const displayElapsed = computed(() => {
  if (!active.value) return 0
  if (active.value.status !== 'RUNNING') return active.value.elapsedSeconds
  const drift = (nowMs.value - receivedAt.value) / 1000
  return Math.max(0, active.value.elapsedSeconds + drift)
})

const clock = computed(() => formatClock(displayRemaining.value))
const elapsedLabel = computed(() => formatClock(displayElapsed.value))
const plannedLabel = computed(() => (active.value ? formatClock(active.value.plannedSeconds) : ''))
const statusLabel = computed(() => (active.value ? FOCUS_SESSION_STATUS_LABELS[active.value.status] : ''))

function formatClock(totalSeconds: number): string {
  const seconds = Math.max(0, Math.floor(totalSeconds))
  const hours = Math.floor(seconds / 3600)
  const minutes = Math.floor((seconds % 3600) / 60)
  const rest = seconds % 60
  if (hours > 0) return `${hours}:${String(minutes).padStart(2, '0')}:${String(rest).padStart(2, '0')}`
  return `${String(minutes).padStart(2, '0')}:${String(rest).padStart(2, '0')}`
}

function formatWhen(iso: string): string {
  return new Date(iso).toLocaleString()
}

function statusText(status: FocusSessionStatus): string {
  return FOCUS_SESSION_STATUS_LABELS[status]
}

function remember(session: FocusSessionView | null) {
  active.value = session
  receivedAt.value = Date.now()
  nowMs.value = receivedAt.value
}

async function loadActive() {
  const generation = ++loadGeneration
  const session = await api<FocusSessionView | null>('/focus-sessions/active')
  if (generation !== loadGeneration) return
  remember(session)
}

async function loadHistory() {
  const page = await api<FocusSessionListResponse>('/focus-sessions?pageSize=20')
  history.value = page.data
}

async function loadTasks() {
  const page = await api<TaskListResponse>('/tasks?pageSize=100&sort=updatedAt')
  tasks.value = page.data
    .filter((task) => task.status !== 'COMPLETED')
    .map((task) => ({ id: task.id, title: task.title }))
}

watch(
  () => auth.preferences?.focusDefaultSeconds,
  (seconds) => {
    if (durationChosen.value || seconds === undefined) return
    const selection = initialFocusSelection(seconds)
    preset.value = selection.preset
    customMinutes.value = selection.customMinutes
    durationChosen.value = true
  },
  { immediate: true },
)

function choosePreset(minutes: number | 'custom') {
  durationChosen.value = true
  preset.value = minutes
}

function plannedSeconds(): number {
  const minutes = preset.value === 'custom' ? customMinutes.value : preset.value
  return Math.round(minutes * 60)
}

async function start() {
  const seconds = plannedSeconds()
  if (!Number.isInteger(seconds) || seconds < FOCUS_MIN_PLANNED_SECONDS || seconds > FOCUS_MAX_PLANNED_SECONDS) {
    error.value = 'Choose between 1 and 180 minutes.'
    return
  }
  busy.value = true
  error.value = ''
  notice.value = ''
  try {
    const session = await api<FocusSessionView>('/focus-sessions', {
      method: 'POST',
      body: {
        plannedSeconds: seconds,
        taskId: taskId.value ? taskId.value : null,
      },
    })
    remember(session)
    const age = Date.parse(session.serverNow) - Date.parse(session.startedAt)
    if (age > 3000 || session.plannedSeconds !== seconds) {
      notice.value = 'You already have a focus session. End it before starting a different one.'
    }
  } catch (caught) {
    error.value = apiErrorMessage(caught, 'Could not start a focus session.')
  } finally {
    busy.value = false
  }
}

async function runAction(path: string, fallback: string) {
  if (!active.value) return
  busy.value = true
  error.value = ''
  notice.value = ''
  try {
    const session = await api<FocusSessionView>(path, { method: 'POST' })
    if (session.endedAt) {
      loadGeneration += 1
      active.value = null
      await loadHistory()
    } else {
      remember(session)
    }
  } catch (caught) {
    error.value = apiErrorMessage(caught, fallback)
  } finally {
    busy.value = false
  }
}

function pause() {
  if (!active.value) return
  return runAction(`/focus-sessions/${active.value.id}/pause`, 'Could not pause.')
}

function resume() {
  if (!active.value) return
  return runAction(`/focus-sessions/${active.value.id}/resume`, 'Could not resume.')
}

function complete() {
  if (!active.value) return
  return runAction(`/focus-sessions/${active.value.id}/complete`, 'Could not complete the session.')
}

function stop() {
  if (!active.value) return
  return runAction(`/focus-sessions/${active.value.id}/stop`, 'Could not end the session.')
}

onMounted(() => {
  void Promise.all([loadActive(), loadHistory(), loadTasks()]).catch((caught: unknown) => {
    error.value = apiErrorMessage(caught, 'Could not load focus sessions.')
  })
  clockTimer = window.setInterval(() => {
    nowMs.value = Date.now()
  }, 1000)
  pollTimer = window.setInterval(() => {
    void loadActive().catch(() => {})
  }, 15000)
})

onUnmounted(() => {
  if (clockTimer) window.clearInterval(clockTimer)
  if (pollTimer) window.clearInterval(pollTimer)
})
</script>

<style scoped>
.field {
  width: 100%;
  border-radius: 0.65rem;
  border: 1px solid var(--color-line);
  padding: 0.55rem 0.75rem;
  background: white;
}
</style>
