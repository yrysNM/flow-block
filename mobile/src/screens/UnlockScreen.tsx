import { useEffect, useMemo, useState } from 'react'
import { StyleSheet, Text, View } from 'react-native'
import { useRoute } from '@react-navigation/native'
import type { RouteProp } from '@react-navigation/native'
import { PrimaryButton } from '../components/PrimaryButton'
import { displayName } from '../domain'
import { decideUnlockRequest, getUnlockRequest } from '../storage'
import { colors } from '../theme'
import type { UnlockRequest, WebsiteRule } from '../types'
import type { RootStackParamList } from '../navigation/types'

type Route = RouteProp<RootStackParamList, 'Unlock'>

export function UnlockScreen() {
  const route = useRoute<Route>()
  const token = useMemo(() => route.params.token ?? '', [route.params.token])
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
        setError(
          err instanceof Error
            ? err.message
            : 'This unlock link is invalid or needs the unlock backend.',
        )
      })
      .finally(() => setLoading(false))
  }, [token])

  async function decide(decision: 'accepted' | 'denied') {
    if (!token) return
    setSaving(decision)
    try {
      const next = await decideUnlockRequest(token, decision)
      setRequest(next)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not save this decision')
    } finally {
      setSaving(null)
    }
  }

  if (loading) {
    return (
      <View style={styles.screen}>
        <Text style={styles.muted}>Loading unlock request…</Text>
      </View>
    )
  }

  if (error && !request) {
    return (
      <View style={styles.screen}>
        <Text style={styles.danger}>{error}</Text>
        <Text style={styles.muted}>
          Local decisions work on this device. Cross-phone Accept needs a hosted unlock API that
          both phones share.
        </Text>
      </View>
    )
  }

  if (!request) return null

  const name = displayName(request.domain)
  const decided = request.status !== 'pending'

  return (
    <View style={styles.screen}>
      <Text style={styles.kicker}>Unlock request</Text>
      <Text style={styles.title}>{name}</Text>
      <Text style={styles.domain}>{request.domain}</Text>
      <Text style={styles.body}>
        Someone wants access to this domain on their phone. Choose Accept to allow it until
        midnight, or Denied to keep it blocked.
      </Text>

      {error ? <Text style={styles.danger}>{error}</Text> : null}

      {!decided ? (
        <View style={styles.actions}>
          <View style={{ flex: 1 }}>
            <PrimaryButton
              label={saving === 'accepted' ? 'Saving…' : 'Accept'}
              onPress={() => void decide('accepted')}
              disabled={saving !== null || !rule}
              loading={saving === 'accepted'}
            />
          </View>
          <View style={{ flex: 1 }}>
            <PrimaryButton
              label={saving === 'denied' ? 'Saving…' : 'Denied'}
              variant="danger"
              onPress={() => void decide('denied')}
              disabled={saving !== null}
              loading={saving === 'denied'}
            />
          </View>
        </View>
      ) : (
        <View style={styles.result}>
          <Text
            style={[
              styles.resultTitle,
              request.status === 'accepted' ? styles.good : styles.danger,
            ]}
          >
            {request.status === 'accepted' ? 'Accepted' : 'Denied'}
          </Text>
          <Text style={styles.muted}>
            {request.status === 'accepted'
              ? `${name} is unlocked until midnight on their phone (once sync/backend is live).`
              : `${name} stays blocked.`}
          </Text>
        </View>
      )}

      {!rule && request.status === 'pending' ? (
        <Text style={styles.danger}>This website rule is no longer in the list on this device.</Text>
      ) : null}
    </View>
  )
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.paper,
    padding: 24,
    justifyContent: 'center',
    gap: 12,
  },
  kicker: {
    color: colors.muted,
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 2,
    textTransform: 'uppercase',
  },
  title: { color: colors.ink, fontSize: 36, fontWeight: '700' },
  domain: { color: colors.muted, fontSize: 14 },
  body: { color: colors.inkSoft, fontSize: 16, lineHeight: 22, marginTop: 8 },
  muted: { color: colors.muted, fontSize: 13, lineHeight: 18 },
  danger: { color: colors.danger, fontSize: 13 },
  good: { color: colors.good },
  actions: { flexDirection: 'row', gap: 10, marginTop: 8 },
  result: {
    marginTop: 8,
    backgroundColor: colors.card,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: colors.line,
    padding: 16,
    gap: 8,
  },
  resultTitle: { fontSize: 18, fontWeight: '700' },
})
