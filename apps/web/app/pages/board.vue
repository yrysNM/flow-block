<template>
  <div class="space-y-5">
    <div>
      <h1 class="text-2xl font-semibold tracking-tight">Board</h1>
      <p class="mt-1 text-sm text-secondary">
        The same tasks as the list. Dragging a card changes status only, and leaves urgent and important alone.
      </p>
    </div>

    <div class="flex flex-col gap-3 rounded-card border border-line bg-surface p-3 shadow-card lg:flex-row lg:flex-wrap lg:items-end">
      <label class="text-sm text-secondary">
        Search
        <input v-model="filters.q" type="search" placeholder="Title or description" class="field ml-2" />
      </label>
      <label class="text-sm text-secondary">
        Priority
        <select v-model="filters.priority" class="field ml-2" @change="load">
          <option value="">All</option>
          <option v-for="priority in TASK_PRIORITIES" :key="priority" :value="priority">{{ TASK_PRIORITY_LABELS[priority] }}</option>
        </select>
      </label>
      <label class="text-sm text-secondary">
        Category
        <select v-model="filters.categoryId" class="field ml-2" @change="load">
          <option value="">All</option>
          <option value="none">No category</option>
          <option v-for="category in catalog.categories" :key="category.id" :value="category.id">{{ category.name }}</option>
        </select>
      </label>
    </div>

    <p v-if="error" class="text-sm text-danger" role="alert">{{ error }}</p>
    <p v-if="loading && !board" class="text-sm text-secondary">Loading board…</p>

    <div v-else class="grid gap-4 lg:grid-cols-3">
      <section
        v-for="column in columns"
        :key="column.status"
        class="min-h-64 rounded-card border bg-surface p-3 shadow-card"
        :class="overStatus === column.status ? 'border-primary' : 'border-line'"
        @dragover.prevent="overStatus = column.status"
        @drop.prevent="onDrop(column.status)"
      >
        <header class="mb-3 flex items-center justify-between">
          <h2 class="text-sm font-semibold">{{ TASK_STATUS_LABELS[column.status] }}</h2>
          <span class="rounded-full bg-background px-2 py-0.5 text-xs font-medium text-secondary">{{ column.count }}</span>
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
            <p v-if="task.category" class="mt-1 text-xs text-secondary">{{ task.category.name }}</p>
            <p v-if="task.tags.length" class="mt-1 text-xs text-secondary">{{ task.tags.map((tag) => tag.name).join(', ') }}</p>
            <div class="mt-2">
              <TaskBadges :status="task.status" :priority="task.priority" :quadrant="task.quadrant" />
            </div>
            <label class="mt-3 block text-xs text-secondary">
              Status
              <select
                class="field mt-1"
                :value="task.status"
                @change="changeStatus(task, ($event.target as HTMLSelectElement).value)"
              >
                <option v-for="status in allowedStatusTargets(task.status)" :key="status" :value="status">
                  {{ TASK_STATUS_LABELS[status] }}
                </option>
              </select>
            </label>
          </li>
        </ul>
      </section>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { BoardTasksQuery } from '@focusflow/shared-schemas'
import {
  TASK_PRIORITIES,
  TASK_PRIORITY_LABELS,
  TASK_STATUS_LABELS,
  allowedStatusTargets,
  canTransitionTaskStatus,
  type TaskBoardResponse,
  type TaskPriority,
  type TaskStatus,
  type TaskView,
} from '@focusflow/shared-types'
import { apiErrorMessage } from '~/utils/api-error'

const tasks = useTasksStore()
const catalog = useCatalogStore()
const board = ref<TaskBoardResponse | null>(null)
const loading = ref(true)
const error = ref('')
const draggingId = ref('')
const dragFrom = ref<TaskStatus | ''>('')
const overStatus = ref<TaskStatus | ''>('')
let searchTimer: ReturnType<typeof setTimeout> | undefined

const filters = reactive({
  q: '',
  priority: '' as '' | TaskPriority,
  categoryId: '',
})

const columns = computed(() => board.value?.columns ?? [])

function boardQuery(): BoardTasksQuery {
  return {
    ...(filters.priority ? { priority: filters.priority } : {}),
    ...(filters.categoryId ? { categoryId: filters.categoryId as BoardTasksQuery['categoryId'] } : {}),
    ...(filters.q.trim() ? { q: filters.q.trim() } : {}),
  }
}

async function load() {
  error.value = ''
  if (!board.value) loading.value = true
  try {
    board.value = await tasks.fetchBoard(boardQuery())
  } catch (caught) {
    error.value = apiErrorMessage(caught, 'Could not load the board.')
  } finally {
    loading.value = false
  }
}

function onDragStart(task: TaskView, event: DragEvent) {
  const target = event.target
  if (target instanceof Element && target.closest('select, button, a, input, label')) {
    event.preventDefault()
    return
  }
  draggingId.value = task.id
  dragFrom.value = task.status
  event.dataTransfer?.setData('text/plain', task.id)
  if (event.dataTransfer) event.dataTransfer.effectAllowed = 'move'
}

function clearDrag() {
  draggingId.value = ''
  dragFrom.value = ''
  overStatus.value = ''
}

async function onDrop(target: TaskStatus) {
  const id = draggingId.value
  const from = dragFrom.value
  clearDrag()
  if (!id || !from || from === target) return
  if (!canTransitionTaskStatus(from, target)) {
    error.value = `Cannot change a task from ${from} to ${target}`
    return
  }
  error.value = ''
  try {
    await tasks.updateStatus(id, target)
    await load()
    await tasks.fetchSummary().catch(() => undefined)
  } catch (caught) {
    error.value = apiErrorMessage(caught, 'Could not move the task.')
    await load()
  }
}

async function changeStatus(task: TaskView, value: string) {
  const status = value as TaskStatus
  if (status === task.status) return
  if (!canTransitionTaskStatus(task.status, status)) {
    error.value = `Cannot change a task from ${task.status} to ${status}`
    return
  }
  error.value = ''
  try {
    await tasks.updateStatus(task.id, status)
    await load()
    await tasks.fetchSummary().catch(() => undefined)
  } catch (caught) {
    error.value = apiErrorMessage(caught, 'Could not change status.')
    await load()
  }
}

watch(() => filters.q, () => {
  clearTimeout(searchTimer)
  searchTimer = setTimeout(() => {
    void load()
  }, 250)
})

onMounted(async () => {
  await catalog.fetchCategories().catch(() => undefined)
  await load()
})

onBeforeUnmount(() => clearTimeout(searchTimer))
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
