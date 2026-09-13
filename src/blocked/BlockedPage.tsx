import { Ban, Copy, Share2 } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { Button } from '../components/ui/button'
import { createUnlockRequest, getSettings, subscribeToSettings } from '../shared/storage'
import { displayName, formatDuration } from '../shared/time-utils'
import type { BlockReason, ExtensionSettings } from '../shared/types'
import { isRequestOpen, isTrustedUnlockActive } from '../shared/unlock'

function readParams() {
  const params = new URLSearchParams(window.location.search)
  return {
    domain: params.get('domain') ?? 'this website',
    reason: (params.get('reason') as BlockReason | null) ?? 'blocked',
    limit: Number(params.get('limit') ?? 0),
    used: Number(params.get('used') ?? 0),
    ruleId: params.get('ruleId') ?? '',
  }
}

async function goBack() {
  if (typeof chrome !== 'undefined' && chrome.tabs) {
    const tabs = await chrome.tabs.query({ active: true, currentWindow: true })
    const tab = tabs[0]
    if (tab?.id !== undefined) {
      try {
        await chrome.tabs.goBack(tab.id)
        return
      } catch {
        await chrome.tabs.update(tab.id, { url: 'chrome://newtab/' })
        return
      }
    }
  }
  if (window.history.length > 1) {
    window.history.back()
    return
  }
  window.location.href = 'about:blank'
}

async function openSite(domain: string) {
  const target = `https://${domain}`
  if (typeof chrome !== 'undefined' && chrome.tabs) {
    const tabs = await chrome.tabs.query({ active: true, currentWindow: true })
    const tab = tabs[0]
    if (tab?.id !== undefined) {
      await chrome.tabs.update(tab.id, { url: target })
      return
    }
  }
  window.location.href = target
}

async function shareUrl(url: string): Promise<'shared' | 'copied'> {
  try {
    if (navigator.share) {
      await navigator.share({
        title: 'Unlock request',
        text: 'Please open this link and tap Accept or Denied.',
        url,
      })
      return 'shared'
    }
  } catch {
    // Fall through to clipboard if share is cancelled or unavailable.
  }
  await navigator.clipboard.writeText(url)
  return 'copied'
}

export function BlockedPage() {
  const params = useMemo(() => readParams(), [])
  const [settings, setSettings] = useState<ExtensionSettings | null>(null)
  const [shareUrlValue, setShareUrlValue] = useState('')
  const [shareNote, setShareNote] = useState('')
  const [shareError, setShareError] = useState('')
  const [sharing, setSharing] = useState(false)

  useEffect(() => {
    void getSettings().then(setSettings)
    return subscribeToSettings(setSettings)
  }, [])

  const rule = useMemo(() => {
    if (!settings) return undefined
    if (params.ruleId) {
      return settings.websites.find((item) => item.id === params.ruleId)
    }
    return settings.websites.find((item) => item.domain === params.domain)
  }, [settings, params.domain, params.ruleId])

  const request = useMemo(() => {
    if (!settings || !rule) return undefined
    return settings.unlockRequests.find((item) => item.ruleId === rule.id)
  }, [settings, rule])

  const unlocked = rule ? isTrustedUnlockActive(rule) : false
  const pending = request ? isRequestOpen(request) : false
  const denied = request?.status === 'denied'
  const isLimit = params.reason === 'limit'
  const name = displayName(params.domain)

  async function askTrustedPerson() {
    if (!rule) {
      setShareError('This blocked site is missing a saved rule.')
      return
    }
    setSharing(true)
    setShareError('')
    try {
      const created = await createUnlockRequest(rule.id)
      setShareUrlValue(created.url)
      const result = await shareUrl(created.url)
      setShareNote(
        result === 'shared'
          ? 'Ask your trusted person to open the link and tap Accept or Denied.'
          : 'Link copied. Send it to a trusted person — opening it here will not let you Accept it yourself.',
      )
    } catch (err) {
      setShareError(err instanceof Error ? err.message : 'Could not create a share link')
    } finally {
      setSharing(false)
    }
  }

  return (
    <main className="mx-auto flex min-h-screen max-w-lg flex-col items-center justify-center px-6 py-16 text-center">
      <div className="mb-6 flex size-16 items-center justify-center rounded-3xl bg-accent-soft text-accent">
        <Ban className="size-8" />
      </div>
      <p className="text-xs font-semibold uppercase tracking-[0.2em] text-muted">
        Website Blocked
      </p>
      <h1 className="mt-2 font-display text-4xl tracking-tight text-ink">{name}</h1>
      <p className="mt-2 text-sm text-muted">{params.domain}</p>

      {unlocked ? (
        <>
          <p className="mt-6 max-w-sm text-base text-ink-soft">
            A trusted person accepted this request. You can open {name} until midnight.
          </p>
          <Button className="mt-8 min-w-40" onClick={() => void openSite(params.domain)}>
            Open site
          </Button>
        </>
      ) : (
        <>
          <p className="mt-6 max-w-sm text-base text-ink-soft">
            {isLimit
              ? 'Daily time limit reached. You cannot unlock this site yourself.'
              : 'This website is currently blocked. You cannot unlock it yourself.'}
          </p>
          {isLimit && (
            <div className="mt-6 w-full rounded-3xl border border-line bg-card px-5 py-4 text-left">
              <p className="text-sm text-ink">
                You have used your {params.limit}-minute limit for today.
              </p>
              <dl className="mt-4 grid grid-cols-2 gap-3 text-sm">
                <div>
                  <dt className="text-muted">Daily limit</dt>
                  <dd className="font-medium">{params.limit} minutes</dd>
                </div>
                <div>
                  <dt className="text-muted">Used today</dt>
                  <dd className="font-medium">{formatDuration(params.used)}</dd>
                </div>
              </dl>
              <p className="mt-4 text-sm text-muted">Your limit will reset tomorrow.</p>
            </div>
          )}
          {denied ? (
            <p className="mt-4 text-sm text-danger">
              A trusted person denied this request. Share a new link to ask again.
            </p>
          ) : pending ? (
            <p className="mt-4 text-sm text-ink-soft">
              Waiting for a trusted person to open the link and tap Accept or Denied.
            </p>
          ) : (
            <p className="mt-4 text-sm text-muted">
              Share a link with a friend or trusted person. They open it and choose Accept or
              Denied.
            </p>
          )}

          {shareUrlValue ? (
            <p className="mt-3 w-full break-all rounded-2xl bg-paper-2 px-3 py-2 text-left text-xs text-ink-soft">
              {shareUrlValue}
            </p>
          ) : null}
          {shareNote ? <p className="mt-2 text-sm text-good">{shareNote}</p> : null}
          {shareError ? <p className="mt-2 text-sm text-danger">{shareError}</p> : null}

          <div className="mt-8 flex w-full flex-col gap-3 sm:flex-row">
            <Button
              className="min-w-40 flex-1"
              disabled={sharing || !rule}
              onClick={() => void askTrustedPerson()}
            >
              {pending ? <Copy className="size-4" /> : <Share2 className="size-4" />}
              {sharing ? 'Preparing…' : pending ? 'Copy link again' : 'Ask a trusted person'}
            </Button>
            <Button variant="secondary" className="min-w-40 flex-1" onClick={() => void goBack()}>
              Go Back
            </Button>
          </div>
        </>
      )}
    </main>
  )
}
