import type { PublicPreferences, PublicUser, SessionResponse } from '@focusflow/shared-types'
import type { ChangePasswordInput, LoginInput, RegisterInput, UpdatePreferencesInput } from '@focusflow/shared-schemas'
import { defineStore } from 'pinia'

export const useAuthStore = defineStore('auth', {
  state: () => ({
    user: null as PublicUser | null,
    preferences: null as PublicPreferences | null,
    ready: false,
  }),
  actions: {
    async fetchMe() {
      const api = useApi()
      try {
        const session = await api<SessionResponse>('/auth/me')
        this.user = session.user
        this.preferences = session.preferences
      } catch {
        this.user = null
        this.preferences = null
      } finally {
        this.ready = true
      }
    },
    async register(input: RegisterInput) {
      const api = useApi()
      const session = await api<SessionResponse>('/auth/register', { method: 'POST', body: input })
      this.user = session.user
      this.preferences = session.preferences
      this.ready = true
    },
    async login(input: LoginInput) {
      const api = useApi()
      const session = await api<SessionResponse>('/auth/login', { method: 'POST', body: input })
      this.user = session.user
      this.preferences = session.preferences
      this.ready = true
    },
    async logout() {
      const api = useApi()
      try {
        await api('/auth/logout', { method: 'POST' })
      } finally {
        this.user = null
        this.preferences = null
        this.ready = true
      }
    },
    async updateName(name: string) {
      const api = useApi()
      const session = await api<SessionResponse>('/users/me', { method: 'PATCH', body: { name } })
      this.user = session.user
      this.preferences = session.preferences
    },
    async updatePreferences(input: UpdatePreferencesInput) {
      const api = useApi()
      const preferences = await api<PublicPreferences>('/users/me/preferences', { method: 'PATCH', body: input })
      this.preferences = preferences
    },
    async changePassword(input: ChangePasswordInput) {
      const api = useApi()
      await api('/users/me/password', { method: 'PATCH', body: input })
    },
  },
})
