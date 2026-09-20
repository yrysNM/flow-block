import { useCallback, useState } from 'react'
import { Alert, Share, StyleSheet, Switch, Text, View } from 'react-native'
import { useFocusEffect, useNavigation, useRoute } from '@react-navigation/native'
import type { RouteProp } from '@react-navigation/native'
import type { NativeStackNavigationProp } from '@react-navigation/native-stack'
import { PrimaryButton } from '../components/PrimaryButton'
import { displayName } from '../domain'
import {
  createUnlockRequest,
  deleteWebsite,
  getSettings,
  isTrustedUnlockActive,
  updateWebsite,
} from '../storage'
import { colors } from '../theme'
import type { WebsiteRule } from '../types'
import type { RootStackParamList } from '../navigation/types'

type Nav = NativeStackNavigationProp<RootStackParamList>
type Route = RouteProp<RootStackParamList, 'SiteDetail'>

export function SiteDetailScreen() {
  const navigation = useNavigation<Nav>()
  const route = useRoute<Route>()
  const [rule, setRule] = useState<WebsiteRule | null>(null)
  const [note, setNote] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  const reload = useCallback(async () => {
    const settings = await getSettings()
    setRule(settings.websites.find((item) => item.id === route.params.ruleId) ?? null)
  }, [route.params.ruleId])

  useFocusEffect(
    useCallback(() => {
      void reload()
    }, [reload]),
  )

  if (!rule) {
    return (
      <View style={styles.screen}>
        <Text style={styles.muted}>Site not found.</Text>
      </View>
    )
  }

  const current = rule
  const locked = current.enabled && !isTrustedUnlockActive(current)

  async function shareUnlock() {
    setBusy(true)
    setError('')
    try {
      const created = await createUnlockRequest(current.id)
      await Share.share({
        message: `Please open this unlock link and tap Accept or Denied:\n${created.url}`,
        url: created.url,
      })
      setNote(
        'Link shared. A trusted person opens the HTTPS page — even on another phone — once a backend is wired.',
      )
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not create unlock link')
    } finally {
      setBusy(false)
    }
  }

  async function onToggle(enabled: boolean) {
    if (locked && !enabled) {
      setError('You cannot turn this off yourself while it is blocked. Ask a trusted person.')
      return
    }
    const next = await updateWebsite(current.id, { enabled })
    setRule(next)
  }

  async function onDelete() {
    try {
      await deleteWebsite(current.id)
      navigation.goBack()
    } catch (err) {
      Alert.alert('Locked', err instanceof Error ? err.message : 'Could not delete')
    }
  }

  return (
    <View style={styles.screen}>
      <Text style={styles.title}>{displayName(current.domain)}</Text>
      <Text style={styles.domain}>{current.domain}</Text>

      <View style={styles.panel}>
        <View style={styles.row}>
          <View style={{ flex: 1 }}>
            <Text style={styles.panelTitle}>Enabled</Text>
            <Text style={styles.muted}>Include this domain in the VPN filter</Text>
          </View>
          <Switch
            value={current.enabled}
            onValueChange={(value) => void onToggle(value)}
            trackColor={{ false: colors.line, true: colors.accent }}
          />
        </View>
      </View>

      {locked ? (
        <View style={styles.panel}>
          <Text style={styles.panelTitle}>You cannot unlock this yourself</Text>
          <Text style={styles.muted}>
            Share an HTTPS unlock link. Unlike the Chrome extension, a friend on another phone can
            Accept once the unlock API is hosted.
          </Text>
          <PrimaryButton
            label="Ask a trusted person"
            onPress={() => void shareUnlock()}
            loading={busy}
          />
          {note ? <Text style={styles.good}>{note}</Text> : null}
          {error ? <Text style={styles.error}>{error}</Text> : null}
        </View>
      ) : null}

      <PrimaryButton
        label="Preview blocked screen"
        variant="secondary"
        onPress={() =>
          navigation.navigate('Blocked', { domain: current.domain, ruleId: current.id })
        }
      />

      <PrimaryButton label="Delete website" variant="danger" onPress={() => void onDelete()} />
    </View>
  )
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.paper,
    padding: 20,
    gap: 14,
  },
  title: { color: colors.ink, fontSize: 32, fontWeight: '700' },
  domain: { color: colors.muted, fontSize: 14, marginTop: -6 },
  panel: {
    backgroundColor: colors.card,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: colors.line,
    padding: 16,
    gap: 12,
  },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  panelTitle: { color: colors.ink, fontSize: 16, fontWeight: '600' },
  muted: { color: colors.muted, fontSize: 13, lineHeight: 18, marginTop: 2 },
  good: { color: colors.good, fontSize: 13 },
  error: { color: colors.danger, fontSize: 13 },
})
