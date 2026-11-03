import type { CreateTaskInput, ListTasksQuery, UpdateTaskInput } from '@focusflow/shared-schemas'
import type { PageMeta, TaskListResponse, TaskStatus, TaskSummary, TaskView } from '@focusflow/shared-types'
import { defineStore } from 'pinia'

export const useTasksStore = defineStore('tasks', {
  state: () => ({
    items: [] as TaskView[],
    meta: { page: 1, pageSize: 20, total: 0, pageCount: 0 } as PageMeta,
    summary: null as TaskSummary | null,
    loading: false,
  }),
  actions: {
    async fetchList(query: ListTasksQuery) {
      const api = useApi()
      this.loading = true
      try {
        const response = await api<TaskListResponse>('/tasks', { query })
        this.items = response.data
        this.meta = response.meta
      } finally {
        this.loading = false
      }
    },
    async fetchAll() {
      const api = useApi()
      this.loading = true
      try {
        const pageSize = 100
        const query = { pageSize, sort: 'createdAt' as const, order: 'desc' as const }
        const first = await api<TaskListResponse>('/tasks', { query: { ...query, page: 1 } })
        const data = [...first.data]
        for (let page = 2; page <= first.meta.pageCount; page += 1) {
          const next = await api<TaskListResponse>('/tasks', { query: { ...query, page } })
          data.push(...next.data)
        }
        this.items = data
        this.meta = first.meta
      } finally {
        this.loading = false
      }
    },
    replaceLocal(task: TaskView) {
      const index = this.items.findIndex((item) => item.id === task.id)
      if (index === -1) {
        this.items = [task, ...this.items]
        return
      }
      const next = this.items.slice()
      next[index] = task
      this.items = next
    },
    removeLocal(id: string) {
      this.items = this.items.filter((item) => item.id !== id)
    },
    async fetchSummary() {
      const api = useApi()
      this.summary = await api<TaskSummary>('/tasks/summary')
    },
    async create(input: CreateTaskInput) {
      const api = useApi()
      return api<TaskView>('/tasks', { method: 'POST', body: input })
    },
    async update(id: string, input: UpdateTaskInput) {
      const api = useApi()
      return api<TaskView>(`/tasks/${id}`, { method: 'PATCH', body: input })
    },
    async updateStatus(id: string, status: TaskStatus) {
      const api = useApi()
      return api<TaskView>(`/tasks/${id}/status`, { method: 'PATCH', body: { status } })
    },
    async remove(id: string) {
      const api = useApi()
      await api(`/tasks/${id}`, { method: 'DELETE' })
    },
  },
})
