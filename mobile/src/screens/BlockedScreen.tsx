import { useCallback, useState } from 'react'
import { Share, StyleSheet, Text, View } from 'react-native'
import { useFocusEffect, useRoute } from '@react-navigation/native'
import type { RouteProp } from '@react-navigation/native'
import { PrimaryButton } from '../components/PrimaryButton'
import { displayName } from '../domain'
import {
  createUnlockRequest,
  getSettings,
  isRequestOpen,
  isTrustedUnlockActive,
} from '../storage'
import { colors } from '../theme'
import type { UnlockRequest, WebsiteRule } from '../types'
import type { RootStackParamList } from '../navigation/types'

type Route = RouteProp<RootStackParamList, 'Blocked'>

export function BlockedScreen() {
  const route = useRoute<Route>()
  const domain = route.params.domain
  const [rule, setRule] = useState<WebsiteRule | undefined>()
  const [request, setRequest] = useState<UnlockRequest | undefined>()
  const [note, setNote] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  const reload = useCallback(async () => {
    const settings = await getSettings()
    const found =
      settings.websites.find((item) => item.id === route.params.ruleId) ??
      settings.websites.find((item) => item.domain === domain)
    setRule(found)
    setRequest(
      found
        ? settings.unlockRequests.find((item) => item.ruleId === found.id)
        : undefined,
    )
  }, [domain, route.params.ruleId])

  useFocusEffect(
    useCallback(() => {
      void reload()
    }, [reload]),
  )

  const unlocked = rule ? isTrustedUnlockActive(rule) : false
  const pending = request ? isRequestOpen(request) : false
  const denied = request?.status === 'denied'

  async function askTrustedPerson() {
    if (!rule) {
      setError('This blocked site is missing a saved rule.')
      return
    }
    setBusy(true)
    setError('')
    try {
      const created = await createUnlockRequest(rule.id)
      await Share.share({
        message: `Please open this link and tap Accept or Denied:\n${created.url}`,
        url: created.url,
      })
      setNote('Send the link to a trusted person. Opening it here will not unlock it for you.')
      await reload()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not create a share link')
    } finally {
      setBusy(false)
    }
  }

  return (
    <View style={styles.screen}>
      <Text style={styles.kicker}>Website blocked</Text>
      <Text style={styles.title}>{displayName(domain)}</Text>
      <Text style={styles.domain}>{domain}</Text>

      {unlocked ? (
        <Text style={styles.body}>
          A trusted person accepted this request. {displayName(domain)} is allowed until midnight.
        </Text>
      ) : (
        <>
          <Text style={styles.body}>
            This domain is on your phone-level block list. You cannot unlock it yourself.
          </Text>
          {denied ? (
            <Text style={styles.danger}>
              A trusted person denied this request. Share a new link to ask again.
            </Text>
          ) : pending ? (
            <Text style={styles.bodySoft}>
              Waiting for a trusted person to open the link and tap Accept or Denied.
            </Text>
          ) : (
            <Text style={styles.bodySoft}>
              Share a link with a friend. They open an HTTPS page and choose Accept or Denied.
            </Text>
          )}
          {note ? <Text style={styles.good}>{note}</Text> : null}
          {error ? <Text style={styles.danger}>{error}</Text> : null}
          <PrimaryButton
            label={pending ? 'Share link again' : 'Ask a trusted person'}
            onPress={() => void askTrustedPerson()}
            loading={busy}
          />
        </>
      )}
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
  bodySoft: { color: colors.inkSoft, fontSize: 14, lineHeight: 20 },
  good: { color: colors.good, fontSize: 13 },
  danger: { color: colors.danger, fontSize: 13 },
})
