import { Check, ShieldQuestion, X } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { Button } from '../components/ui/button'
import { ErrorBanner } from '../components/ErrorBanner'
import { LoadingState } from '../components/LoadingState'
import { decideUnlockRequest, getUnlockRequest } from '../shared/storage'
import { requestEvaluate } from '../shared/messages'
import { displayName } from '../shared/time-utils'
import type { UnlockRequest, WebsiteRule } from '../shared/types'

function readToken(): string {
  return new URLSearchParams(window.location.search).get('token') ?? ''
}

export function UnlockPage() {
  const token = useMemo(() => readToken(), [])
  const [request, setRequest] = useState<UnlockRequest | null>(null)
  const [rule, setRule] = useState<WebsiteRule | undefined>()
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState<'accepted' | 'denied' | null>(null)

  useEffect(() => {
    if (!token) {
      setError('This unlock link is missing a request token.')
      setLoading(false)
      return
    }

    void getUnlockRequest(token)
      .then((result) => {
        setRequest(result.request)
        setRule(result.rule)
        setError(null)
      })
      .catch((err: unknown) => {
        setError(err instanceof Error ? err.message : 'This unlock link is invalid.')
      })
      .finally(() => setLoading(false))
  }, [token])

  async function decide(decision: 'accepted' | 'denied') {
    if (!token) return
    setSaving(decision)
    try {
      const next = await decideUnlockRequest(token, decision)
      setRequest(next)
      await requestEvaluate()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not save this decision')
    } finally {
      setSaving(null)
    }
  }

  if (loading) {
    return <LoadingState label="Loading unlock request…" />
  }

  if (error && !request) {
    return (
      <main className="mx-auto flex min-h-screen max-w-lg flex-col items-center justify-center px-6 py-16 text-center">
        <ErrorBanner message={error} />
      </main>
    )
  }

  if (!request) return null

  const name = displayName(request.domain)
  const decided = request.status !== 'pending'

  return (
    <main className="mx-auto flex min-h-screen max-w-lg flex-col items-center justify-center px-6 py-16 text-center">
      <div className="mb-6 flex size-16 items-center justify-center rounded-3xl bg-accent-soft text-accent">
        <ShieldQuestion className="size-8" />
      </div>
      <p className="text-xs font-semibold uppercase tracking-[0.2em] text-muted">
        Unlock request
      </p>
      <h1 className="mt-2 font-display text-4xl tracking-tight text-ink">{name}</h1>
      <p className="mt-2 text-sm text-muted">{request.domain}</p>
      <p className="mt-6 max-w-sm text-base text-ink-soft">
        Someone wants to open this website. They cannot unlock it themselves. Choose Accept to
        allow it for the rest of today, or Denied to keep it blocked.
      </p>

      {error ? (
        <div className="mt-4 w-full">
          <ErrorBanner message={error} />
        </div>
      ) : null}

      {!decided ? (
        <div className="mt-8 grid w-full grid-cols-2 gap-3">
          <Button
            className="h-12"
            disabled={saving !== null || !rule}
            onClick={() => void decide('accepted')}
          >
            <Check className="size-4" />
            {saving === 'accepted' ? 'Saving…' : 'Accept'}
          </Button>
          <Button
            variant="danger"
            className="h-12"
            disabled={saving !== null}
            onClick={() => void decide('denied')}
          >
            <X className="size-4" />
            {saving === 'denied' ? 'Saving…' : 'Denied'}
          </Button>
        </div>
      ) : (
        <div className="mt-8 w-full rounded-3xl border border-line bg-card px-5 py-5">
          {request.status === 'accepted' ? (
            <>
              <p className="text-lg font-medium text-good">Accepted</p>
              <p className="mt-2 text-sm text-muted">
                {name} is unlocked until midnight. The block returns tomorrow.
              </p>
            </>
          ) : (
            <>
              <p className="text-lg font-medium text-danger">Denied</p>
              <p className="mt-2 text-sm text-muted">
                {name} stays blocked. Share a new link if you change your mind.
              </p>
            </>
          )}
        </div>
      )}

      {!rule && request.status === 'pending' ? (
        <p className="mt-4 text-sm text-danger">This website rule is no longer in the list.</p>
      ) : null}
    </main>
  )
}
