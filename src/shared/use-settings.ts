import { useCallback, useEffect, useState } from 'react'
import {
  getSettings,
  subscribeToSettings,
} from './storage'
import { fetchLiveSettings, requestSessionFlush } from './messages'
import type { ExtensionSettings } from './types'

const FALLBACK = null

export function useSettings(): {
  settings: ExtensionSettings | null
  liveUsageById: Record<string, number>
  loading: boolean
  error: string | null
  refresh: () => Promise<void>
} {
  const [settings, setSettings] = useState<ExtensionSettings | null>(FALLBACK)
  const [liveUsageById, setLiveUsageById] = useState<Record<string, number>>({})
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const refresh = useCallback(async () => {
    try {
      await requestSessionFlush()
      const live = await fetchLiveSettings()
      if (live) {
        setSettings(live.settings)
        setLiveUsageById(live.liveUsageById)
      } else {
        const stored = await getSettings()
        setSettings(stored)
        setLiveUsageById(
          Object.fromEntries(
            stored.websites.map((rule) => [rule.id, rule.usage.usedTodaySeconds]),
          ),
        )
      }
      setError(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not load settings')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    // Initial load plus live storage updates. setState here is the data-fetch pattern.
    void refresh()
    return subscribeToSettings((next) => {
      setSettings(next)
    })
  }, [refresh])

  return { settings, liveUsageById, loading, error, refresh }
}
