<template>
  <div class="space-y-6">
    <div class="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
      <div>
        <h1 class="text-2xl font-semibold tracking-tight">Analytics</h1>
        <p class="mt-1 text-sm text-secondary">
          Totals are calculated on the server for {{ report ? `${report.startDate} through ${report.endDate}` : 'the selected range' }} ({{ report?.timezone || auth.preferences?.timezone || 'UTC' }}).
        </p>
      </div>
      <div class="flex gap-2" role="group" aria-label="Range">
        <button type="button" class="rounded-lg px-3 py-1.5 text-sm font-medium" :class="range === '7' ? 'bg-primary text-white' : 'border border-line text-ink'" @click="range = '7'">Last 7 days</button>
        <button type="button" class="rounded-lg px-3 py-1.5 text-sm font-medium" :class="range === '30' ? 'bg-primary text-white' : 'border border-line text-ink'" @click="range = '30'">Last 30 days</button>
      </div>
    </div>

    <p v-if="error" class="text-sm text-danger" role="alert">{{ error }}</p>
    <p v-else-if="!report" class="text-sm text-secondary">Loading analytics…</p>

    <template v-else>
      <section class="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <article class="rounded-card border border-line bg-surface p-4 shadow-card">
          <p class="text-sm text-secondary">Tasks completed</p>
          <p class="mt-2 text-3xl font-semibold">{{ report.tasksCompleted }}</p>
        </article>
        <article class="rounded-card border border-line bg-surface p-4 shadow-card">
          <p class="text-sm text-secondary">Focus time</p>
          <p class="mt-2 text-3xl font-semibold">{{ formatDuration(report.focusSeconds) }}</p>
        </article>
        <article class="rounded-card border border-line bg-surface p-4 shadow-card">
          <p class="text-sm text-secondary">Website usage</p>
          <p class="mt-2 text-3xl font-semibold">{{ formatDuration(report.websiteUsedSeconds) }}</p>
        </article>
        <article class="rounded-card border border-line bg-surface p-4 shadow-card">
          <p class="text-sm text-secondary">Habit consistency</p>
          <p class="mt-2 text-3xl font-semibold">{{ consistencyLabel }}</p>
        </article>
      </section>

      <EmptyState
        v-if="!hasActivity"
        title="No activity in this range"
        body="Completed tasks, focus time, website usage, and habit check-ins will show up here. Days with nothing recorded stay at zero. Nothing on this page is sample data."
      />
      <section v-else class="rounded-card border border-line bg-surface p-4 shadow-card">
        <h2 class="text-base font-semibold">Daily productivity</h2>
        <p class="mt-1 text-sm text-secondary">Tasks completed and focus minutes. Every day in the range is on the chart, including zeros.</p>
        <div ref="chartEl" class="mt-4 h-80 w-full" role="img" aria-label="Tasks completed and focus minutes by day" />
      </section>
    </template>
  </div>
</template>

<script setup lang="ts">
import type { AnalyticsResponse } from '@focusflow/shared-types'
import { analyticsHasActivity } from '@focusflow/shared-utils'
import { BarChart, LineChart } from 'echarts/charts'
import { GridComponent, LegendComponent, TooltipComponent } from 'echarts/components'
import { init, use, type EChartsType } from 'echarts/core'
import { CanvasRenderer } from 'echarts/renderers'
import { apiErrorMessage } from '~/utils/api-error'

use([BarChart, LineChart, GridComponent, LegendComponent, TooltipComponent, CanvasRenderer])

const api = useApi()
const auth = useAuthStore()
const error = ref('')
const range = ref<'7' | '30'>('7')
const report = ref<AnalyticsResponse | null>(null)
const chartEl = ref<HTMLDivElement | null>(null)
let chart: EChartsType | null = null

const hasActivity = computed(() => (report.value ? analyticsHasActivity(report.value.series) : false))
const consistencyLabel = computed(() => {
  const consistency = report.value?.habitConsistency
  if (!consistency || consistency.expected === 0) return 'None expected'
  return `${consistency.checkIns} of ${consistency.expected}`
})

function formatDuration(seconds: number) {
  const hours = Math.floor(seconds / 3600)
  const minutes = Math.floor((seconds % 3600) / 60)
  if (hours > 0) return `${hours}h ${minutes}m`
  return `${minutes}m`
}

function renderChart() {
  if (!chartEl.value || !report.value || !hasActivity.value) {
    chart?.dispose()
    chart = null
    return
  }
  if (!chart) chart = init(chartEl.value)
  const series = report.value.series
  chart.setOption({
    color: ['#0055FA', '#172033'],
    tooltip: { trigger: 'axis' },
    legend: { textStyle: { color: '#64748B' } },
    grid: { left: 16, right: 16, top: 40, bottom: 8, containLabel: true },
    xAxis: {
      type: 'category',
      data: series.map((point) => point.date),
      axisLabel: { color: '#64748B' },
    },
    yAxis: [
      { type: 'value', minInterval: 1, name: 'Tasks', axisLabel: { color: '#64748B' }, nameTextStyle: { color: '#64748B' } },
      { type: 'value', name: 'Focus min', axisLabel: { color: '#64748B' }, nameTextStyle: { color: '#64748B' }, splitLine: { show: false } },
    ],
    series: [
      { name: 'Tasks completed', type: 'bar', data: series.map((point) => point.tasksCompleted) },
      {
        name: 'Focus minutes',
        type: 'line',
        yAxisIndex: 1,
        data: series.map((point) => Math.round((point.focusSeconds / 60) * 10) / 10),
      },
    ],
  }, true)
}

async function load() {
  error.value = ''
  try {
    report.value = await api<AnalyticsResponse>(`/analytics?range=${range.value}`)
  } catch (caught) {
    report.value = null
    error.value = apiErrorMessage(caught, 'Could not load analytics.')
  }
}

watch(range, load)
watch(report, () => renderChart(), { flush: 'post' })

function onResize() {
  chart?.resize()
}

onMounted(async () => {
  window.addEventListener('resize', onResize)
  await load()
})

onBeforeUnmount(() => {
  window.removeEventListener('resize', onResize)
  chart?.dispose()
  chart = null
})
</script>
