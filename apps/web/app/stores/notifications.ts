import type { NotificationListResponse, NotificationView } from '@focusflow/shared-types'
import { defineStore } from 'pinia'

export const useNotificationsStore = defineStore('notifications', {
  state: () => ({
    items: [] as NotificationView[],
    unreadCount: 0,
  }),
  actions: {
    async refresh() {
      const api = useApi()
      const response = await api<NotificationListResponse>('/notifications')
      this.items = response.data
      this.unreadCount = response.unreadCount
    },
    async markRead(id: string) {
      const api = useApi()
      const wasUnread = this.items.some((item) => item.id === id && item.readAt === null)
      const updated = await api<NotificationView>(`/notifications/${id}/read`, { method: 'POST' })
      this.items = this.items.map((item) => (item.id === updated.id ? updated : item))
      if (wasUnread && updated.readAt) this.unreadCount = Math.max(0, this.unreadCount - 1)
    },
    async markAllRead() {
      const api = useApi()
      const response = await api<NotificationListResponse>('/notifications/read-all', { method: 'POST' })
      this.items = response.data
      this.unreadCount = response.unreadCount
    },
  },
})
