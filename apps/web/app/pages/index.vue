<template>
  <div class="space-y-6">
    <div>
      <h1 class="text-2xl font-semibold tracking-tight">Hello, {{ auth.user?.name }}</h1>
      <p class="mt-1 text-sm text-secondary">
        Today is {{ summary?.date }} ({{ summary?.timezone }}). Counts cover every task you own.
      </p>
      <p class="mt-2 flex flex-wrap gap-3 text-sm">
        <NuxtLink to="/matrix" class="font-medium text-primary">Matrix</NuxtLink>
        <NuxtLink :to="plannerLink" class="font-medium text-primary">Planner</NuxtLink>
        <NuxtLink to="/board" class="font-medium text-primary">Board</NuxtLink>
        <NuxtLink to="/habits" class="font-medium text-primary">Habits</NuxtLink>
        <NuxtLink to="/goals" class="font-medium text-primary">Goals</NuxtLink>
      </p>
    </div>

    <p v-if="error" class="rounded-lg border border-danger/30 bg-danger/5 px-3 py-2 text-sm text-danger" role="alert">{{ error }}</p>
    <p v-else-if="!summary" class="text-sm text-secondary">Loading tasks…</p>

    <section v-if="summary && summary.counts.total === 0">
      <EmptyState
        title="No tasks yet"
        body="Create a task to see today’s plan and status counts here. The list stays empty until you add one."
        action-label="Create a task"
        @action="navigateTo('/tasks?create=1')"
      />
    </section>

    <template v-else-if="summary">
      <section class="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <NuxtLink
          v-for="card in cards"
          :key="card.label"
          :to="card.to"
          class="rounded-card border border-line bg-surface p-4 shadow-card"
        >
          <p class="text-sm text-secondary">{{ card.label }}</p>
          <p class="mt-2 text-3xl font-semibold">{{ card.value }}</p>
        </NuxtLink>
      </section>

      <section class="rounded-card border border-line bg-surface shadow-card">
        <div class="border-b border-line px-5 py-4">
          <h2 class="text-base font-semibold">Due today</h2>
        </div>
        <EmptyState
          v-if="summary.today.length === 0"
          class="m-5"
          title="Nothing is due today"
          body="Tasks with a deadline on this local date show up here. Status counts above still include the rest of your work."
        />
        <ul v-else class="divide-y divide-line">
          <li v-for="task in summary.today" :key="task.id" class="flex flex-col gap-2 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p class="font-medium">{{ task.title }}</p>
              <p class="mt-1 text-sm text-secondary">{{ formatWhen(task.deadline) }}</p>
            </div>
            <TaskBadges :status="task.status" :priority="task.priority" :quadrant="task.quadrant" />
          </li>
        </ul>
      </section>
    </template>

    <section class="rounded-card border border-line bg-surface shadow-card">
      <div class="flex items-center justify-between border-b border-line px-5 py-4">
        <h2 class="text-base font-semibold">Today’s habits</h2>
        <NuxtLink to="/habits" class="text-sm font-medium text-primary">Open habits</NuxtLink>
      </div>
      <p v-if="habits.length === 0" class="px-5 py-6 text-sm text-secondary">No habits yet. Check-ins for today will show up here.</p>
      <ul v-else class="divide-y divide-line">
        <li v-for="habit in habits" :key="habit.id" class="flex items-center justify-between gap-3 px-5 py-4">
          <div>
            <p class="font-medium">{{ habit.name }}</p>
            <p class="mt-1 text-sm text-secondary">{{ habit.todayCount }}/{{ habit.targetCount }} today · streak {{ habit.streak }}</p>
          </div>
          <span class="text-sm" :class="habit.todayMet ? 'text-primary' : 'text-secondary'">{{ habit.todayMet ? 'Checked in' : 'Not yet' }}</span>
        </li>
      </ul>
    </section>

    <section class="rounded-card border border-line bg-surface shadow-card">
      <div class="flex items-center justify-between border-b border-line px-5 py-4">
        <h2 class="text-base font-semibold">Active goals</h2>
        <NuxtLink to="/goals" class="text-sm font-medium text-primary">Open goals</NuxtLink>
      </div>
      <p v-if="activeGoals.length === 0" class="px-5 py-6 text-sm text-secondary">No active goals. Progress stays on the goal, not on a chart.</p>
      <ul v-else class="divide-y divide-line">
        <li v-for="goal in activeGoals" :key="goal.id" class="px-5 py-4">
          <p class="font-medium">{{ goal.title }}</p>
          <p class="mt-1 text-sm text-secondary">
            {{ goal.progress.total === 0 ? 'No milestones or tasks yet' : `${goal.progress.completed} of ${goal.progress.total}` }}
            <span v-if="goal.deadline"> · due {{ goal.deadline }}</span>
          </p>
        </li>
      </ul>
    </section>
  </div>
</template>

<script setup lang="ts">
import type { GoalView, HabitView } from '@focusflow/shared-types'
import { formatWhen } from '~/utils/datetime'
import { apiErrorMessage } from '~/utils/api-error'

const auth = useAuthStore()
const tasks = useTasksStore()
const api = useApi()
const error = ref('')
const habits = ref<HabitView[]>([])
const goals = ref<GoalView[]>([])
const activeGoals = computed(() => goals.value.filter((goal) => goal.status === 'ACTIVE'))

const summary = computed(() => tasks.summary)
const plannerLink = computed(() => (summary.value?.date ? `/planner?date=${summary.value.date}` : '/planner'))
const cards = computed(() => {
  const counts = summary.value?.counts
  return [
    { label: 'To do', value: counts?.TODO ?? 0, to: '/tasks?status=TODO' },
    { label: 'In progress', value: counts?.IN_PROGRESS ?? 0, to: '/tasks?status=IN_PROGRESS' },
    { label: 'Completed', value: counts?.COMPLETED ?? 0, to: '/tasks?status=COMPLETED' },
    { label: 'Due today', value: summary.value?.today.length ?? 0, to: '/tasks' },
  ]
})

onMounted(async () => {
  const [summary, habitRows, goalRows] = await Promise.allSettled([
    tasks.fetchSummary(),
    api<HabitView[]>('/habits'),
    api<GoalView[]>('/goals'),
  ])
  if (habitRows.status === 'fulfilled') habits.value = habitRows.value
  if (goalRows.status === 'fulfilled') goals.value = goalRows.value
  const failed = [summary, habitRows, goalRows].find((result) => result.status === 'rejected')
  if (failed && failed.status === 'rejected') {
    error.value = apiErrorMessage(failed.reason, 'Could not load the dashboard.')
  }
})
</script>
