import type {
  BoardTasksQuery,
  CreateSubtaskInput,
  CreateTaskInput,
  ListTasksQuery,
  UpdateSubtaskInput,
  UpdateTaskInput,
  UpdateTaskQuadrantInput,
  UpdateTaskScheduleInput,
} from '@focusflow/shared-schemas'
import type {
  PageMeta,
  SubtaskView,
  TaskBoardResponse,
  TaskListResponse,
  TaskMatrixResponse,
  TaskPlannerResponse,
  TaskStatus,
  TaskSummary,
  TaskView,
} from '@focusflow/shared-types'
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
    async fetchBoard(query: BoardTasksQuery) {
      const api = useApi()
      return api<TaskBoardResponse>('/tasks/board', { query })
    },
    async fetchMatrix(query: BoardTasksQuery) {
      const api = useApi()
      return api<TaskMatrixResponse>('/tasks/matrix', { query })
    },
    async fetchPlanner(date?: string) {
      const api = useApi()
      return api<TaskPlannerResponse>('/tasks/planner', { query: date ? { date } : {} })
    },
    async updateQuadrant(id: string, input: UpdateTaskQuadrantInput) {
      const api = useApi()
      return api<TaskView>(`/tasks/${id}/quadrant`, { method: 'PATCH', body: input })
    },
    async updateSchedule(id: string, input: UpdateTaskScheduleInput) {
      const api = useApi()
      return api<TaskView>(`/tasks/${id}/schedule`, { method: 'PATCH', body: input })
    },
    async attachTag(taskId: string, tagId: string) {
      const api = useApi()
      return api<TaskView>(`/tasks/${taskId}/tags`, { method: 'POST', body: { tagId } })
    },
    async detachTag(taskId: string, tagId: string) {
      const api = useApi()
      return api<TaskView>(`/tasks/${taskId}/tags/${tagId}`, { method: 'DELETE' })
    },
    async addSubtask(taskId: string, input: CreateSubtaskInput) {
      const api = useApi()
      return api<SubtaskView>(`/tasks/${taskId}/subtasks`, { method: 'POST', body: input })
    },
    async updateSubtask(taskId: string, subtaskId: string, input: UpdateSubtaskInput) {
      const api = useApi()
      return api<SubtaskView>(`/tasks/${taskId}/subtasks/${subtaskId}`, { method: 'PATCH', body: input })
    },
    async reorderSubtasks(taskId: string, ids: string[]) {
      const api = useApi()
      return api<SubtaskView[]>(`/tasks/${taskId}/subtasks/reorder`, { method: 'PATCH', body: { ids } })
    },
    async removeSubtask(taskId: string, subtaskId: string) {
      const api = useApi()
      await api(`/tasks/${taskId}/subtasks/${subtaskId}`, { method: 'DELETE' })
    },
  },
})
