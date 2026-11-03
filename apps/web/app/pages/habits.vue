<template>
  <div class="space-y-8">
    <div>
      <h1 class="text-2xl font-semibold tracking-tight">Habits</h1>
      <p class="mt-1 text-sm text-secondary">
        Daily and weekly habits stay separate from tasks. A second check-in on the same date updates that day.
      </p>
    </div>

    <p v-if="error" class="text-sm text-danger" role="alert">{{ error }}</p>

    <section class="rounded-card border border-line bg-surface p-5 shadow-card">
      <h2 class="text-base font-semibold">New habit</h2>
      <form class="mt-4 grid gap-3 sm:grid-cols-[1fr_9rem_7rem_auto] sm:items-end" @submit.prevent="createHabit">
        <label class="block text-sm font-medium">
          Name
          <input v-model="draft.name" required maxlength="80" class="field mt-1" />
        </label>
        <label class="block text-sm font-medium">
          Frequency
          <select v-model="draft.frequency" class="field mt-1">
            <option value="DAILY">Daily</option>
            <option value="WEEKLY">Weekly</option>
          </select>
        </label>
        <label class="block text-sm font-medium">
          Target
          <input v-model.number="draft.targetCount" type="number" min="1" max="100" required class="field mt-1" />
        </label>
        <button type="submit" class="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white" :disabled="busy">Add habit</button>
      </form>
    </section>

    <section class="rounded-card border border-line bg-surface shadow-card">
      <div class="border-b border-line px-5 py-4">
        <h2 class="text-base font-semibold">Your habits</h2>
      </div>
      <p v-if="habits.length === 0" class="px-5 py-6 text-sm text-secondary">No habits yet. Add one to start a streak.</p>
      <ul v-else class="divide-y divide-line">
        <li v-for="habit in habits" :key="habit.id" class="px-5 py-4">
          <div class="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <button type="button" class="text-left" @click="selectHabit(habit.id)">
              <p class="font-medium" :class="selectedId === habit.id ? 'text-primary' : 'text-ink'">{{ habit.name }}</p>
              <p class="mt-1 text-sm text-secondary">
                {{ habit.frequency === 'DAILY' ? 'Daily' : 'Weekly' }} · target {{ habit.targetCount }} · streak {{ habit.streak }} · today {{ habit.todayCount }}/{{ habit.targetCount }}
              </p>
            </button>
            <div class="flex flex-wrap gap-2">
              <button type="button" class="rounded-lg bg-primary px-3 py-1.5 text-sm font-medium text-white" :disabled="busy" @click="checkIn(habit.id)">
                Check in today
              </button>
              <button type="button" class="rounded-lg border border-line px-3 py-1.5 text-sm" @click="startEdit(habit)">Edit</button>
              <button type="button" class="rounded-lg border border-danger/30 px-3 py-1.5 text-sm text-danger" @click="confirmId = habit.id">Delete</button>
            </div>
          </div>
          <form v-if="editingId === habit.id" class="mt-3 grid gap-2 sm:grid-cols-[1fr_9rem_7rem_auto] sm:items-end" @submit.prevent="saveEdit(habit.id)">
            <label class="block text-sm font-medium">
              Name
              <input v-model="edit.name" required maxlength="80" class="field mt-1" />
            </label>
            <label class="block text-sm font-medium">
              Frequency
              <select v-model="edit.frequency" class="field mt-1">
                <option value="DAILY">Daily</option>
                <option value="WEEKLY">Weekly</option>
              </select>
            </label>
            <label class="block text-sm font-medium">
              Target
              <input v-model.number="edit.targetCount" type="number" min="1" max="100" required class="field mt-1" />
            </label>
            <div class="flex gap-2">
              <button type="submit" class="rounded-lg bg-primary px-3 py-1.5 text-sm text-white">Save</button>
              <button type="button" class="rounded-lg border border-line px-3 py-1.5 text-sm" @click="editingId = ''">Cancel</button>
            </div>
          </form>
          <p v-if="confirmId === habit.id" class="mt-3 text-sm text-secondary">
            Delete this habit and its check-ins?
            <button type="button" class="ml-2 rounded-lg bg-danger px-2 py-1 text-white" @click="removeHabit(habit.id)">Delete</button>
            <button type="button" class="ml-1 rounded-lg border border-line px-2 py-1" @click="confirmId = ''">Cancel</button>
          </p>
        </li>
      </ul>
    </section>

    <section v-if="detail" class="rounded-card border border-line bg-surface p-5 shadow-card">
      <div class="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 class="text-base font-semibold">{{ detail.name }}</h2>
          <p class="mt-1 text-sm text-secondary">{{ monthLabel }} · click a day to check in</p>
        </div>
        <div class="flex gap-2">
          <button type="button" class="rounded-lg border border-line px-3 py-1.5 text-sm" @click="shiftMonth(-1)">Previous</button>
          <button type="button" class="rounded-lg border border-line px-3 py-1.5 text-sm" @click="shiftMonth(1)">Next</button>
        </div>
      </div>
      <div class="mt-4 grid grid-cols-7 gap-1 text-center text-xs font-medium text-secondary">
        <span v-for="label in weekdayLabels" :key="label">{{ label }}</span>
      </div>
      <div class="mt-1 grid grid-cols-7 gap-1">
        <button
          v-for="cell in calendar"
          :key="cell.date"
          type="button"
          class="flex min-h-14 flex-col items-center justify-center rounded-lg border text-xs"
          :class="cellClass(cell)"
          :disabled="!cell.inMonth || busy"
          @click="checkIn(detail.id, cell.date)"
        >
          <span>{{ Number(cell.date.slice(8)) }}</span>
          <span v-if="cell.inMonth" class="mt-1 text-[11px]">{{ cell.count || '' }}</span>
        </button>
      </div>
    </section>
  </div>
</template>

<script setup lang="ts">
import type { HabitDetailView, HabitFrequency, HabitView } from '@focusflow/shared-types'
import { addCivilDays, civilWeekStart, formatDateInTimeZone } from '@focusflow/shared-utils'
import { apiErrorMessage } from '~/utils/api-error'

const api = useApi()
const auth = useAuthStore()
const error = ref('')
const busy = ref(false)
const habits = ref<HabitView[]>([])
const detail = ref<HabitDetailView | null>(null)
const selectedId = ref('')
const month = ref('')
const confirmId = ref('')
const editingId = ref('')
const draft = reactive({ name: '', frequency: 'DAILY' as HabitFrequency, targetCount: 1 })
const edit = reactive({ name: '', frequency: 'DAILY' as HabitFrequency, targetCount: 1 })

const weekStartsOn = computed(() => auth.preferences?.weekStartsOn ?? 1)
const timeZone = computed(() => auth.preferences?.timezone || 'UTC')
const today = computed(() => formatDateInTimeZone(new Date(), timeZone.value))
const weekdayLabels = computed(() => {
  const labels = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
  return [...labels.slice(weekStartsOn.value), ...labels.slice(0, weekStartsOn.value)]
})
function monthParts(value: string): { year: number; monthNumber: number } {
  const parts = value.split('-').map(Number)
  return { year: parts[0] ?? 0, monthNumber: parts[1] ?? 1 }
}

const monthLabel = computed(() => {
  if (!detail.value) return ''
  const { year, monthNumber } = monthParts(detail.value.month)
  return new Date(Date.UTC(year, monthNumber - 1, 1)).toLocaleString('en-US', { month: 'long', year: 'numeric', timeZone: 'UTC' })
})

const calendar = computed(() => {
  if (!detail.value) return []
  const key = detail.value.month
  const { year, monthNumber } = monthParts(key)
  const first = `${key}-01`
  const lastDay = new Date(Date.UTC(year, monthNumber, 0)).getUTCDate()
  const last = `${key}-${String(lastDay).padStart(2, '0')}`
  const counts = new Map(detail.value.entries.map((entry) => [entry.date, entry.count]))
  const cells: Array<{ date: string; inMonth: boolean; count: number; met: boolean }> = []
  let cursor = civilWeekStart(first, weekStartsOn.value)
  while (cells.length < 42) {
    const inMonth = cursor >= first && cursor <= last
    const count = counts.get(cursor) ?? 0
    cells.push({ date: cursor, inMonth, count, met: count >= detail.value.targetCount })
    cursor = addCivilDays(cursor, 1)
    if (cells.length % 7 === 0 && cursor > last) break
  }
  return cells
})

function cellClass(cell: { inMonth: boolean; met: boolean; date: string }) {
  if (!cell.inMonth) return 'border-transparent text-secondary/40'
  if (cell.met) return 'border-primary/30 bg-primary/10 font-medium text-primary'
  if (cell.date === today.value) return 'border-line bg-background text-ink'
  return 'border-line text-ink hover:bg-background'
}

function replaceHabit(next: HabitView) {
  const index = habits.value.findIndex((habit) => habit.id === next.id)
  if (index === -1) habits.value = [...habits.value, next].sort((left, right) => left.name.localeCompare(right.name))
  else habits.value[index] = next
}

async function loadList() {
  habits.value = await api<HabitView[]>('/habits')
}

async function loadDetail(id: string) {
  const query = month.value ? `?month=${month.value}` : ''
  detail.value = await api<HabitDetailView>(`/habits/${id}${query}`)
  month.value = detail.value.month
  selectedId.value = id
}

async function selectHabit(id: string) {
  error.value = ''
  month.value = ''
  try {
    await loadDetail(id)
  } catch (caught) {
    error.value = apiErrorMessage(caught, 'Could not load that habit.')
  }
}

async function shiftMonth(delta: number) {
  if (!detail.value) return
  const { year, monthNumber } = monthParts(detail.value.month)
  const next = new Date(Date.UTC(year, monthNumber - 1 + delta, 1))
  month.value = next.toISOString().slice(0, 7)
  try {
    await loadDetail(detail.value.id)
  } catch (caught) {
    error.value = apiErrorMessage(caught, 'Could not change the month.')
  }
}

async function createHabit() {
  error.value = ''
  busy.value = true
  try {
    const created = await api<HabitView>('/habits', {
      method: 'POST',
      body: { name: draft.name, frequency: draft.frequency, targetCount: draft.targetCount },
    })
    draft.name = ''
    draft.frequency = 'DAILY'
    draft.targetCount = 1
    replaceHabit(created)
    await selectHabit(created.id)
  } catch (caught) {
    error.value = apiErrorMessage(caught, 'Could not create the habit.')
  } finally {
    busy.value = false
  }
}

function startEdit(habit: HabitView) {
  editingId.value = habit.id
  edit.name = habit.name
  edit.frequency = habit.frequency
  edit.targetCount = habit.targetCount
}

async function saveEdit(id: string) {
  error.value = ''
  busy.value = true
  try {
    const updated = await api<HabitView>(`/habits/${id}`, {
      method: 'PATCH',
      body: { name: edit.name, frequency: edit.frequency, targetCount: edit.targetCount },
    })
    editingId.value = ''
    replaceHabit(updated)
    if (selectedId.value === id) await loadDetail(id)
  } catch (caught) {
    error.value = apiErrorMessage(caught, 'Could not update the habit.')
  } finally {
    busy.value = false
  }
}

async function removeHabit(id: string) {
  error.value = ''
  busy.value = true
  try {
    await api(`/habits/${id}`, { method: 'DELETE' })
    habits.value = habits.value.filter((habit) => habit.id !== id)
    confirmId.value = ''
    if (selectedId.value === id) {
      selectedId.value = ''
      detail.value = null
    }
  } catch (caught) {
    error.value = apiErrorMessage(caught, 'Could not delete the habit.')
  } finally {
    busy.value = false
  }
}

async function checkIn(id: string, date?: string) {
  error.value = ''
  busy.value = true
  try {
    const result = await api<{ habit: HabitView }>(`/habits/${id}/check-ins`, {
      method: 'POST',
      body: date ? { date } : {},
    })
    replaceHabit(result.habit)
    if (!selectedId.value) selectedId.value = id
    if (selectedId.value === id) await loadDetail(id)
  } catch (caught) {
    error.value = apiErrorMessage(caught, 'Could not check in.')
  } finally {
    busy.value = false
  }
}

onMounted(async () => {
  month.value = today.value.slice(0, 7)
  try {
    await loadList()
    if (habits.value[0]) await loadDetail(habits.value[0].id)
  } catch (caught) {
    error.value = apiErrorMessage(caught, 'Could not load habits.')
  }
})
</script>

<style scoped>
.field {
  width: 100%;
  border-radius: 0.65rem;
  border: 1px solid var(--color-line);
  background: white;
  padding: 0.45rem 0.7rem;
  color: var(--color-ink);
}
</style>
