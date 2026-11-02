<template>
  <div class="space-y-8">
    <div>
      <h1 class="text-2xl font-semibold tracking-tight">Blocking</h1>
      <p class="mt-1 text-sm text-secondary">
        Block or allow a domain. During a focus session, block rules are on. Otherwise they follow the schedule below.
      </p>
    </div>

    <p v-if="error" class="text-sm text-danger" role="alert">{{ error }}</p>

    <section class="rounded-card border border-line bg-surface p-5 shadow-card">
      <h2 class="text-base font-semibold">{{ editingId ? 'Edit rule' : 'Add a rule' }}</h2>
      <form class="mt-4 grid gap-3 sm:grid-cols-2" @submit.prevent="save">
        <label class="block text-sm font-medium sm:col-span-2">
          Domain
          <input v-model="domain" required maxlength="253" placeholder="example.com" class="field mt-1" />
        </label>
        <label class="block text-sm font-medium">
          List
          <select v-model="mode" class="field mt-1">
            <option value="BLOCK">Block</option>
            <option value="ALLOW">Allow</option>
          </select>
        </label>
        <label class="block text-sm font-medium">
          Daily limit in minutes
          <input v-model="dailyLimit" type="number" min="1" max="1440" placeholder="Optional" class="field mt-1" />
        </label>
        <label class="flex items-center gap-2 text-sm font-medium sm:col-span-2">
          <input v-model="enabled" type="checkbox" />
          Enabled
        </label>
        <label class="flex items-center gap-2 text-sm font-medium sm:col-span-2">
          <input v-model="useSchedule" type="checkbox" />
          Only during a time window
        </label>
        <label v-if="useSchedule" class="block text-sm font-medium">
          Start
          <input v-model="scheduleStart" type="time" required class="field mt-1" />
        </label>
        <label v-if="useSchedule" class="block text-sm font-medium">
          End
          <input v-model="scheduleEnd" type="time" required class="field mt-1" />
        </label>
        <div class="flex gap-2 sm:col-span-2">
          <button type="submit" class="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white" :disabled="busy">
            {{ editingId ? 'Save rule' : 'Add rule' }}
          </button>
          <button v-if="editingId" type="button" class="rounded-lg border border-line px-4 py-2 text-sm" @click="resetForm">Cancel</button>
        </div>
      </form>
    </section>

    <section class="rounded-card border border-line bg-surface p-5 shadow-card">
      <h2 class="text-base font-semibold">Rules</h2>
      <p v-if="rules.length === 0" class="mt-4 text-sm text-secondary">No website rules yet.</p>
      <ul v-else class="mt-4 divide-y divide-line">
        <li v-for="rule in rules" :key="rule.id" class="flex flex-col gap-2 py-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p class="font-medium text-ink">{{ rule.domain }}</p>
            <p class="text-sm text-secondary">{{ describe(rule) }}</p>
          </div>
          <div class="flex gap-2">
            <button type="button" class="rounded-lg border border-line px-3 py-1.5 text-sm" @click="edit(rule)">Edit</button>
            <button type="button" class="rounded-lg border border-danger/30 px-3 py-1.5 text-sm text-danger" @click="confirmId = rule.id">Delete</button>
          </div>
          <p v-if="confirmId === rule.id" class="text-sm text-secondary sm:basis-full">
            Delete this rule?
            <button type="button" class="ml-2 rounded-lg bg-danger px-2 py-1 text-white" @click="remove(rule.id)">Delete</button>
            <button type="button" class="ml-1 rounded-lg border border-line px-2 py-1" @click="confirmId = ''">Cancel</button>
          </p>
        </li>
      </ul>
    </section>

    <section class="rounded-card border border-line bg-surface p-5 shadow-card">
      <h2 class="text-base font-semibold">Usage today</h2>
      <p v-if="usage.length === 0" class="mt-4 text-sm text-secondary">Usage shows up here after the extension reports a visit.</p>
      <ul v-else class="mt-4 divide-y divide-line">
        <li v-for="row in usage" :key="row.ruleId" class="flex items-center justify-between py-3 text-sm">
          <span class="font-medium text-ink">{{ row.domain }}</span>
          <span class="text-secondary">{{ formatSeconds(row.usedSeconds) }}<template v-if="row.dailyLimitMinutes"> / {{ row.dailyLimitMinutes }} min</template></span>
        </li>
      </ul>
    </section>
  </div>
</template>

<script setup lang="ts">
import type { WebsiteRuleMode, WebsiteRuleView, WebsiteUsageResponse, WebsiteUsageTotal } from '@focusflow/shared-types'
import { apiErrorMessage } from '~/utils/api-error'

const api = useApi()
const error = ref('')
const busy = ref(false)
const rules = ref<WebsiteRuleView[]>([])
const usage = ref<WebsiteUsageTotal[]>([])
const editingId = ref('')
const confirmId = ref('')
const domain = ref('')
const mode = ref<WebsiteRuleMode>('BLOCK')
const enabled = ref(true)
const dailyLimit = ref<number | ''>('')
const useSchedule = ref(false)
const scheduleStart = ref('09:00')
const scheduleEnd = ref('17:00')

function minutesFromTime(value: string): number | null {
  const match = /^(\d{2}):(\d{2})$/.exec(value)
  if (!match) return null
  return Number(match[1]) * 60 + Number(match[2])
}

function timeFromMinutes(value: number | null): string {
  if (value === null) return '09:00'
  const hours = Math.floor(value / 60)
  const minutes = value % 60
  return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`
}

function formatSeconds(total: number): string {
  const minutes = Math.floor(total / 60)
  const seconds = total % 60
  if (minutes === 0) return `${seconds}s`
  return `${minutes}m ${seconds}s`
}

function describe(rule: WebsiteRuleView): string {
  const list = rule.mode === 'ALLOW' ? 'Allow' : 'Block'
  const state = rule.enabled ? list : `${list}, off`
  const limit = rule.dailyLimitMinutes ? `${rule.dailyLimitMinutes} min a day` : 'no daily limit'
  const schedule = rule.scheduleStartMinute === null || rule.scheduleEndMinute === null
    ? 'all day'
    : `${timeFromMinutes(rule.scheduleStartMinute)}–${timeFromMinutes(rule.scheduleEndMinute)}`
  return `${state} · ${limit} · ${schedule}`
}

function resetForm() {
  editingId.value = ''
  domain.value = ''
  mode.value = 'BLOCK'
  enabled.value = true
  dailyLimit.value = ''
  useSchedule.value = false
  scheduleStart.value = '09:00'
  scheduleEnd.value = '17:00'
}

function edit(rule: WebsiteRuleView) {
  editingId.value = rule.id
  domain.value = rule.domain
  mode.value = rule.mode
  enabled.value = rule.enabled
  dailyLimit.value = rule.dailyLimitMinutes ?? ''
  useSchedule.value = rule.scheduleStartMinute !== null && rule.scheduleEndMinute !== null
  scheduleStart.value = timeFromMinutes(rule.scheduleStartMinute)
  scheduleEnd.value = timeFromMinutes(rule.scheduleEndMinute)
  confirmId.value = ''
}

function payload() {
  const start = useSchedule.value ? minutesFromTime(scheduleStart.value) : null
  const end = useSchedule.value ? minutesFromTime(scheduleEnd.value) : null
  return {
    domain: domain.value,
    mode: mode.value,
    enabled: enabled.value,
    dailyLimitMinutes: dailyLimit.value === '' ? null : Number(dailyLimit.value),
    scheduleStartMinute: start,
    scheduleEndMinute: end,
  }
}

async function load() {
  const [ruleRows, usagePage] = await Promise.all([
    api<WebsiteRuleView[]>('/websites'),
    api<WebsiteUsageResponse>('/websites/usage'),
  ])
  rules.value = ruleRows
  usage.value = usagePage.totals
}

async function save() {
  const body = payload()
  if (body.scheduleStartMinute === null && useSchedule.value) {
    error.value = 'Choose a start and end.'
    return
  }
  busy.value = true
  error.value = ''
  try {
    if (editingId.value) {
      await api(`/websites/${editingId.value}`, { method: 'PATCH', body })
    } else {
      await api('/websites', { method: 'POST', body })
    }
    resetForm()
    await load()
  } catch (caught) {
    error.value = apiErrorMessage(caught, 'Could not save that rule.')
  } finally {
    busy.value = false
  }
}

async function remove(id: string) {
  busy.value = true
  error.value = ''
  try {
    await api(`/websites/${id}`, { method: 'DELETE' })
    if (editingId.value === id) resetForm()
    confirmId.value = ''
    await load()
  } catch (caught) {
    error.value = apiErrorMessage(caught, 'Could not delete that rule.')
  } finally {
    busy.value = false
  }
}

onMounted(() => {
  void load().catch((caught: unknown) => {
    error.value = apiErrorMessage(caught, 'Could not load website rules.')
  })
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
