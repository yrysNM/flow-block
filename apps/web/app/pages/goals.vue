<template>
  <div class="space-y-8">
    <div>
      <h1 class="text-2xl font-semibold tracking-tight">Goals</h1>
      <p class="mt-1 text-sm text-secondary">
        Progress counts completed milestones and completed linked tasks. It is not stored as a percentage.
      </p>
    </div>

    <p v-if="error" class="text-sm text-danger" role="alert">{{ error }}</p>

    <section class="rounded-card border border-line bg-surface p-5 shadow-card">
      <h2 class="text-base font-semibold">New goal</h2>
      <form class="mt-4 grid gap-3 sm:grid-cols-2" @submit.prevent="createGoal">
        <label class="block text-sm font-medium sm:col-span-2">
          Title
          <input v-model="draft.title" required maxlength="160" class="field mt-1" />
        </label>
        <label class="block text-sm font-medium sm:col-span-2">
          Description
          <textarea v-model="draft.description" maxlength="2000" rows="2" class="field mt-1" />
        </label>
        <label class="block text-sm font-medium">
          Deadline
          <input v-model="draft.deadline" type="date" class="field mt-1" />
        </label>
        <label class="block text-sm font-medium">
          Status
          <select v-model="draft.status" class="field mt-1">
            <option value="ACTIVE">Active</option>
            <option value="COMPLETED">Completed</option>
            <option value="ARCHIVED">Archived</option>
          </select>
        </label>
        <div class="sm:col-span-2">
          <button type="submit" class="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white" :disabled="busy">Add goal</button>
        </div>
      </form>
    </section>

    <p v-if="goals.length === 0" class="text-sm text-secondary">No goals yet.</p>

    <article v-for="goal in goals" :key="goal.id" class="rounded-card border border-line bg-surface p-5 shadow-card">
      <div class="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <h2 class="text-base font-semibold">{{ goal.title }}</h2>
          <p v-if="goal.description" class="mt-1 text-sm text-secondary">{{ goal.description }}</p>
          <p class="mt-2 text-sm text-secondary">
            {{ statusLabel(goal.status) }} · {{ goal.deadline ? `Deadline ${goal.deadline}` : 'No deadline' }} · {{ progressLabel(goal) }}
          </p>
        </div>
        <div class="flex flex-wrap gap-2">
          <button type="button" class="rounded-lg border border-line px-3 py-1.5 text-sm" @click="toggle(goal.id)">
            {{ openId === goal.id ? 'Hide' : 'Edit' }}
          </button>
          <button type="button" class="rounded-lg border border-danger/30 px-3 py-1.5 text-sm text-danger" @click="confirmId = goal.id">Delete</button>
        </div>
      </div>
      <p v-if="confirmId === goal.id" class="mt-3 text-sm text-secondary">
        Delete this goal? Linked tasks stay in your task list.
        <button type="button" class="ml-2 rounded-lg bg-danger px-2 py-1 text-white" @click="removeGoal(goal.id)">Delete</button>
        <button type="button" class="ml-1 rounded-lg border border-line px-2 py-1" @click="confirmId = ''">Cancel</button>
      </p>

      <div v-if="openId === goal.id" class="mt-5 space-y-5 border-t border-line pt-5">
        <form class="grid gap-3 sm:grid-cols-2" @submit.prevent="saveGoal(goal)">
          <label class="block text-sm font-medium sm:col-span-2">
            Title
            <input v-model="edit.title" required maxlength="160" class="field mt-1" />
          </label>
          <label class="block text-sm font-medium sm:col-span-2">
            Description
            <textarea v-model="edit.description" maxlength="2000" rows="2" class="field mt-1" />
          </label>
          <label class="block text-sm font-medium">
            Deadline
            <input v-model="edit.deadline" type="date" class="field mt-1" />
          </label>
          <label class="block text-sm font-medium">
            Status
            <select v-model="edit.status" class="field mt-1">
              <option value="ACTIVE">Active</option>
              <option value="COMPLETED">Completed</option>
              <option value="ARCHIVED">Archived</option>
            </select>
          </label>
          <div class="sm:col-span-2">
            <button type="submit" class="rounded-lg bg-primary px-3 py-1.5 text-sm text-white" :disabled="busy">Save goal</button>
          </div>
        </form>

        <div>
          <h3 class="text-sm font-semibold">Milestones</h3>
          <form class="mt-3 flex flex-col gap-2 sm:flex-row" @submit.prevent="addMilestone(goal.id)">
            <input v-model="milestoneTitle" required maxlength="160" placeholder="Add a milestone" class="field" />
            <button type="submit" class="rounded-lg border border-line px-3 py-1.5 text-sm" :disabled="busy">Add</button>
          </form>
          <p v-if="goal.milestones.length === 0" class="mt-3 text-sm text-secondary">No milestones yet.</p>
          <ul v-else class="mt-3 divide-y divide-line">
            <li v-for="(milestone, index) in goal.milestones" :key="milestone.id" class="flex flex-col gap-2 py-3 sm:flex-row sm:items-center sm:justify-between">
              <label class="flex items-center gap-2 text-sm">
                <input type="checkbox" :checked="milestone.completed" @change="toggleMilestone(goal.id, milestone.id, !milestone.completed)" />
                <span :class="milestone.completed ? 'text-secondary line-through' : 'text-ink'">{{ milestone.title }}</span>
              </label>
              <div class="flex gap-2">
                <button type="button" class="rounded-lg border border-line px-2 py-1 text-xs" :disabled="index === 0 || busy" @click="moveMilestone(goal, index, -1)">Up</button>
                <button type="button" class="rounded-lg border border-line px-2 py-1 text-xs" :disabled="index === goal.milestones.length - 1 || busy" @click="moveMilestone(goal, index, 1)">Down</button>
                <button type="button" class="rounded-lg border border-danger/30 px-2 py-1 text-xs text-danger" @click="removeMilestone(goal.id, milestone.id)">Delete</button>
              </div>
            </li>
          </ul>
        </div>

        <div>
          <h3 class="text-sm font-semibold">Linked tasks</h3>
          <form class="mt-3 flex flex-col gap-2 sm:flex-row" @submit.prevent="linkTask(goal.id)">
            <select v-model="linkTaskId" class="field" required>
              <option value="" disabled>Choose an existing task</option>
              <option v-for="task in availableTasks(goal)" :key="task.id" :value="task.id">{{ task.title }}</option>
            </select>
            <button type="submit" class="rounded-lg border border-line px-3 py-1.5 text-sm" :disabled="busy || availableTasks(goal).length === 0">Link</button>
          </form>
          <p v-if="tasks.length === 0" class="mt-2 text-sm text-secondary">You have no tasks to link yet.</p>
          <p v-else-if="goal.tasks.length === 0" class="mt-3 text-sm text-secondary">No tasks linked.</p>
          <ul v-else class="mt-3 divide-y divide-line">
            <li v-for="task in goal.tasks" :key="task.id" class="flex items-center justify-between gap-3 py-3 text-sm">
              <span>{{ task.title }} <span class="text-secondary">· {{ task.status === 'COMPLETED' ? 'Completed' : task.status === 'IN_PROGRESS' ? 'In progress' : 'To do' }}</span></span>
              <button type="button" class="rounded-lg border border-line px-2 py-1 text-xs" @click="unlinkTask(goal.id, task.id)">Unlink</button>
            </li>
          </ul>
        </div>
      </div>
    </article>
  </div>
</template>

<script setup lang="ts">
import type { GoalStatus, GoalView, TaskListResponse, TaskView } from '@focusflow/shared-types'
import { apiErrorMessage } from '~/utils/api-error'

const api = useApi()
const error = ref('')
const busy = ref(false)
const goals = ref<GoalView[]>([])
const tasks = ref<TaskView[]>([])
const openId = ref('')
const confirmId = ref('')
const milestoneTitle = ref('')
const linkTaskId = ref('')
const draft = reactive({ title: '', description: '', deadline: '', status: 'ACTIVE' as GoalStatus })
const edit = reactive({ title: '', description: '', deadline: '', status: 'ACTIVE' as GoalStatus })

function progressLabel(goal: GoalView) {
  if (goal.progress.total === 0) return 'No milestones or tasks yet'
  return `${goal.progress.completed} of ${goal.progress.total}`
}

function statusLabel(status: GoalStatus) {
  if (status === 'COMPLETED') return 'Completed'
  if (status === 'ARCHIVED') return 'Archived'
  return 'Active'
}

function availableTasks(goal: GoalView) {
  const linked = new Set(goal.tasks.map((task) => task.id))
  return tasks.value.filter((task) => !linked.has(task.id))
}

function replaceGoal(next: GoalView) {
  const index = goals.value.findIndex((goal) => goal.id === next.id)
  if (index === -1) goals.value = [next, ...goals.value]
  else goals.value[index] = next
}

function toggle(id: string) {
  if (openId.value === id) {
    openId.value = ''
    return
  }
  const goal = goals.value.find((item) => item.id === id)
  if (!goal) return
  openId.value = id
  edit.title = goal.title
  edit.description = goal.description ?? ''
  edit.deadline = goal.deadline ?? ''
  edit.status = goal.status
  milestoneTitle.value = ''
  linkTaskId.value = ''
}

async function load() {
  const [goalRows, taskPage] = await Promise.all([
    api<GoalView[]>('/goals'),
    api<TaskListResponse>('/tasks?pageSize=100'),
  ])
  goals.value = goalRows
  tasks.value = taskPage.data
}

async function createGoal() {
  error.value = ''
  busy.value = true
  try {
    const created = await api<GoalView>('/goals', {
      method: 'POST',
      body: {
        title: draft.title,
        description: draft.description.trim() ? draft.description.trim() : null,
        deadline: draft.deadline || null,
        status: draft.status,
      },
    })
    draft.title = ''
    draft.description = ''
    draft.deadline = ''
    draft.status = 'ACTIVE'
    replaceGoal(created)
    toggle(created.id)
  } catch (caught) {
    error.value = apiErrorMessage(caught, 'Could not create the goal.')
  } finally {
    busy.value = false
  }
}

async function saveGoal(goal: GoalView) {
  error.value = ''
  busy.value = true
  try {
    const updated = await api<GoalView>(`/goals/${goal.id}`, {
      method: 'PATCH',
      body: {
        title: edit.title,
        description: edit.description.trim() ? edit.description.trim() : null,
        deadline: edit.deadline || null,
        status: edit.status,
      },
    })
    replaceGoal(updated)
  } catch (caught) {
    error.value = apiErrorMessage(caught, 'Could not update the goal.')
  } finally {
    busy.value = false
  }
}

async function removeGoal(id: string) {
  error.value = ''
  busy.value = true
  try {
    await api(`/goals/${id}`, { method: 'DELETE' })
    goals.value = goals.value.filter((goal) => goal.id !== id)
    confirmId.value = ''
    if (openId.value === id) openId.value = ''
  } catch (caught) {
    error.value = apiErrorMessage(caught, 'Could not delete the goal.')
  } finally {
    busy.value = false
  }
}

async function addMilestone(goalId: string) {
  error.value = ''
  busy.value = true
  try {
    const updated = await api<GoalView>(`/goals/${goalId}/milestones`, {
      method: 'POST',
      body: { title: milestoneTitle.value },
    })
    milestoneTitle.value = ''
    replaceGoal(updated)
  } catch (caught) {
    error.value = apiErrorMessage(caught, 'Could not add the milestone.')
  } finally {
    busy.value = false
  }
}

async function toggleMilestone(goalId: string, milestoneId: string, completed: boolean) {
  error.value = ''
  busy.value = true
  try {
    const updated = await api<GoalView>(`/goals/${goalId}/milestones/${milestoneId}`, {
      method: 'PATCH',
      body: { completed },
    })
    replaceGoal(updated)
  } catch (caught) {
    error.value = apiErrorMessage(caught, 'Could not update the milestone.')
  } finally {
    busy.value = false
  }
}

async function moveMilestone(goal: GoalView, index: number, delta: number) {
  const nextIndex = index + delta
  if (nextIndex < 0 || nextIndex >= goal.milestones.length) return
  const ids = goal.milestones.map((milestone) => milestone.id)
  const moved = ids[index]
  if (!moved) return
  ids.splice(index, 1)
  ids.splice(nextIndex, 0, moved)
  error.value = ''
  busy.value = true
  try {
    const updated = await api<GoalView>(`/goals/${goal.id}/milestones/reorder`, { method: 'POST', body: { ids } })
    replaceGoal(updated)
  } catch (caught) {
    error.value = apiErrorMessage(caught, 'Could not reorder milestones.')
  } finally {
    busy.value = false
  }
}

async function removeMilestone(goalId: string, milestoneId: string) {
  error.value = ''
  busy.value = true
  try {
    await api(`/goals/${goalId}/milestones/${milestoneId}`, { method: 'DELETE' })
    const updated = await api<GoalView>(`/goals/${goalId}`)
    replaceGoal(updated)
  } catch (caught) {
    error.value = apiErrorMessage(caught, 'Could not delete the milestone.')
  } finally {
    busy.value = false
  }
}

async function linkTask(goalId: string) {
  if (!linkTaskId.value) return
  error.value = ''
  busy.value = true
  try {
    const updated = await api<GoalView>(`/goals/${goalId}/tasks`, {
      method: 'POST',
      body: { taskId: linkTaskId.value },
    })
    linkTaskId.value = ''
    replaceGoal(updated)
  } catch (caught) {
    error.value = apiErrorMessage(caught, 'Could not link the task.')
  } finally {
    busy.value = false
  }
}

async function unlinkTask(goalId: string, taskId: string) {
  error.value = ''
  busy.value = true
  try {
    const updated = await api<GoalView>(`/goals/${goalId}/tasks/${taskId}`, { method: 'DELETE' })
    replaceGoal(updated)
  } catch (caught) {
    error.value = apiErrorMessage(caught, 'Could not unlink the task.')
  } finally {
    busy.value = false
  }
}

onMounted(async () => {
  try {
    await load()
  } catch (caught) {
    error.value = apiErrorMessage(caught, 'Could not load goals.')
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
