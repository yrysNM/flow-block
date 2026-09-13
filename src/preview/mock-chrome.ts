import { SETTINGS_STORAGE_KEY } from '../shared/constants'
import { createDefaultSettings, createWebsiteRule } from '../shared/storage'
import type { ExtensionSettings, RuntimeMessage } from '../shared/types'

type ChangeListener = (
  changes: Record<string, { oldValue?: unknown; newValue?: unknown }>,
  area: string,
) => void

function seedSettings(): ExtensionSettings {
  const now = new Date()
  const youtube = createWebsiteRule('youtube.com', {
    timeLimit: true,
    dailyLimitMinutes: 60,
    now,
  })
  youtube.usage.usedTodaySeconds = 42 * 60
  const reddit = createWebsiteRule('reddit.com', {
    timeLimit: true,
    dailyLimitMinutes: 30,
    now,
  })
  reddit.usage.usedTodaySeconds = 18 * 60
  const instagram = createWebsiteRule('instagram.com', {
    blocking: true,
    timeLimit: false,
    now,
  })
  instagram.usage.usedTodaySeconds = 12 * 60
  const settings = {
    ...createDefaultSettings(now),
    websites: [youtube, reddit, instagram],
  }
  settings.unlockRequests = [
    {
      id: 'preview-unlock',
      token: 'preview-unlock-token',
      ruleId: instagram.id,
      domain: instagram.domain,
      createdAt: now.toISOString(),
      expiresAt: new Date(now.getTime() + 24 * 60 * 60 * 1000).toISOString(),
      status: 'pending',
    },
  ]
  return settings
}

export function installChromeMock(): void {
  const local = new Map<string, unknown>([[SETTINGS_STORAGE_KEY, seedSettings()]])
  const session = new Map<string, unknown>()
  const localListeners = new Set<ChangeListener>()

  const storageArea = (map: Map<string, unknown>, area: string) => ({
    get: async (key?: string | string[] | Record<string, unknown>) => {
      if (!key) return Object.fromEntries(map)
      const keys = Array.isArray(key) ? key : typeof key === 'string' ? [key] : Object.keys(key)
      const result: Record<string, unknown> = {}
      for (const item of keys) {
        if (map.has(item)) result[item] = map.get(item)
      }
      return result
    },
    set: async (items: Record<string, unknown>) => {
      const changes: Record<string, { oldValue?: unknown; newValue?: unknown }> = {}
      for (const [key, value] of Object.entries(items)) {
        changes[key] = { oldValue: map.get(key), newValue: value }
        map.set(key, value)
      }
      for (const listener of localListeners) listener(changes, area)
    },
    remove: async (key: string) => {
      map.delete(key)
    },
  })

  const chromeMock = {
    storage: {
      local: storageArea(local, 'local'),
      session: storageArea(session, 'session'),
      onChanged: {
        addListener(listener: ChangeListener) {
          localListeners.add(listener)
        },
        removeListener(listener: ChangeListener) {
          localListeners.delete(listener)
        },
      },
    },
    runtime: {
      id: 'preview',
      getURL(path: string) {
        return `/${path}`
      },
      async sendMessage(message: RuntimeMessage) {
        if (message.type === 'GET_LIVE_SETTINGS' || message.type === 'FLUSH_SESSION') {
          const settings = (local.get(SETTINGS_STORAGE_KEY) as ExtensionSettings) ?? seedSettings()
          return {
            settings,
            liveUsageById: Object.fromEntries(
              settings.websites.map((rule) => [rule.id, rule.usage.usedTodaySeconds]),
            ),
            session: null,
          }
        }
        return { ok: true }
      },
      openOptionsPage() {
        window.dispatchEvent(new CustomEvent('preview:open-options'))
      },
      onMessage: {
        addListener() {},
        removeListener() {},
      },
    },
    tabs: {
      async query() {
        return []
      },
      async update() {},
      async goBack() {},
      async create() {},
    },
    notifications: {
      async create() {},
    },
    windows: {
      WINDOW_ID_NONE: -1,
    },
    idle: {
      async queryState() {
        return 'active'
      },
    },
    alarms: {
      async create() {},
    },
  }

  Object.assign(globalThis, { chrome: chromeMock })
}
