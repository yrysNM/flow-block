import { sanitizeSettings } from './storage'
import type { ExportPayload, ExtensionSettings } from './types'

export const EXPORT_VERSION = 1 as const

export function createExportPayload(settings: ExtensionSettings): ExportPayload {
  return {
    version: EXPORT_VERSION,
    exportedAt: new Date().toISOString(),
    websites: settings.websites,
    settings: {
      globalEnabled: settings.globalEnabled,
      trackingEnabled: settings.trackingEnabled,
      notifications: settings.notifications,
      theme: settings.theme,
    },
  }
}

export function parseImportPayload(raw: unknown): ExportPayload {
  if (!raw || typeof raw !== 'object') {
    throw new Error('Import file is not valid JSON')
  }

  const value = raw as Partial<ExportPayload>
  if (value.version !== 1) {
    throw new Error('Unsupported backup version')
  }
  if (!Array.isArray(value.websites)) {
    throw new Error('Backup is missing a websites list')
  }

  const nested = value.settings
  const sanitized = sanitizeSettings({
    websites: value.websites,
    globalEnabled: nested?.globalEnabled,
    trackingEnabled: nested?.trackingEnabled,
    notifications: nested?.notifications,
    theme: nested?.theme,
  })

  if (sanitized.websites.length === 0 && value.websites.length > 0) {
    throw new Error('Backup did not contain any valid websites')
  }

  return {
    version: 1,
    exportedAt: typeof value.exportedAt === 'string' ? value.exportedAt : new Date().toISOString(),
    websites: sanitized.websites,
    settings: {
      globalEnabled: sanitized.globalEnabled,
      trackingEnabled: sanitized.trackingEnabled,
      notifications: sanitized.notifications,
      theme: sanitized.theme,
    },
  }
}

export function applyImport(
  current: ExtensionSettings,
  payload: ExportPayload,
): ExtensionSettings {
  return {
    ...current,
    websites: payload.websites,
    globalEnabled: payload.settings.globalEnabled,
    trackingEnabled: payload.settings.trackingEnabled,
    notifications: payload.settings.notifications,
    theme: payload.settings.theme,
  }
}
