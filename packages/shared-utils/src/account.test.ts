import { describe, expect, it } from 'vitest'
import { accountPreferences, initialFocusSelection } from './account'

describe('account preferences', () => {
  it('round-trips a dark theme and keeps language English', () => {
    expect(accountPreferences({
      timezone: 'Europe/Berlin',
      theme: 'dark',
      weekStartsOn: 0,
      focusDefaultSeconds: 15 * 60,
      language: 'en',
    })).toEqual({
      timezone: 'Europe/Berlin',
      theme: 'dark',
      weekStartsOn: 0,
      focusDefaultSeconds: 15 * 60,
      language: 'en',
    })
    expect(accountPreferences({ theme: 'light' }).theme).toBe('light')
    expect(accountPreferences({ theme: 'nope', language: 'fr' })).toMatchObject({
      theme: 'system',
      language: 'en',
    })
  })
})

describe('initial focus selection', () => {
  it('uses the saved default as the focus page duration', () => {
    expect(initialFocusSelection(25 * 60)).toEqual({ preset: 25, customMinutes: 25 })
    expect(initialFocusSelection(15 * 60)).toEqual({ preset: 15, customMinutes: 15 })
    expect(initialFocusSelection(50 * 60)).toEqual({ preset: 50, customMinutes: 50 })
    expect(initialFocusSelection(40 * 60)).toEqual({ preset: 'custom', customMinutes: 40 })
  })

  it('falls back to 25 minutes when the stored value is missing or out of range', () => {
    expect(initialFocusSelection(undefined)).toEqual({ preset: 25, customMinutes: 25 })
    expect(initialFocusSelection(30)).toEqual({ preset: 25, customMinutes: 25 })
  })
})
