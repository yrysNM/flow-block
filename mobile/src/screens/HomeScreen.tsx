import { useCallback, useEffect, useState } from 'react'
import {
  FlatList,
  RefreshControl,
  StyleSheet,
  Switch,
  Text,
  View,
} from 'react-native'
import { useFocusEffect, useNavigation } from '@react-navigation/native'
import type { NativeStackNavigationProp } from '@react-navigation/native-stack'
import { SiteCard } from '../components/SiteCard'
import { PrimaryButton } from '../components/PrimaryButton'
import {
  activeBlockedDomains,
  getSettings,
  mutateSettings,
  saveSettings,
} from '../storage'
import { colors } from '../theme'
import type { AppSettings, VpnFilterStatus } from '../types'
import { getVpnStatus, startVpn, stopVpn, syncVpnDomains } from '../vpn/VpnFilter'
import type { RootStackParamList } from '../navigation/types'

type Nav = NativeStackNavigationProp<RootStackParamList>

export function HomeScreen() {
  const navigation = useNavigation<Nav>()
  const [settings, setSettings] = useState<AppSettings | null>(null)
  const [vpn, setVpn] = useState<VpnFilterStatus | null>(null)
  const [busy, setBusy] = useState(false)

  const reload = useCallback(async () => {
    const next = await getSettings()
    setSettings(next)
    setVpn(await getVpnStatus())
  }, [])

  useFocusEffect(
    useCallback(() => {
      void reload()
    }, [reload]),
  )

  useEffect(() => {
    void reload()
  }, [reload])

  async function toggleProtection(enabled: boolean) {
    if (!settings) return
    setBusy(true)
    try {
      const next = await mutateSettings((current) => ({
        ...current,
        protectionEnabled: enabled,
      }))
      setSettings(next)
      const domains = activeBlockedDomains(next)
      if (enabled) {
        const status = await startVpn(domains)
        setVpn(status)
        await saveSettings({ ...next, vpnRunning: status.status === 'running' })
      } else {
        const status = await stopVpn()
        setVpn(status)
        await saveSettings({ ...next, vpnRunning: false })
      }
      await reload()
    } finally {
      setBusy(false)
    }
  }

  async function refreshVpn() {
    if (!settings) return
    setBusy(true)
    try {
      const domains = activeBlockedDomains(settings)
      await syncVpnDomains(domains)
      if (settings.protectionEnabled) {
        setVpn(await startVpn(domains))
      } else {
        setVpn(await getVpnStatus())
      }
    } finally {
      setBusy(false)
    }
  }

  if (!settings) {
    return (
      <View style={styles.center}>
        <Text style={styles.muted}>Loading…</Text>
      </View>
    )
  }

  return (
    <View style={styles.screen}>
      <View style={styles.hero}>
        <Text style={styles.kicker}>Flow Block</Text>
        <Text style={styles.title}>Phone-level focus</Text>
        <Text style={styles.subtitle}>
          Blocks listed domains across apps via a local VPN/DNS filter — not inside Chrome like
          the desktop extension.
        </Text>
      </View>

      <View style={styles.panel}>
        <View style={styles.row}>
          <View style={{ flex: 1 }}>
            <Text style={styles.panelTitle}>Protection</Text>
            <Text style={styles.muted}>
              {vpn?.status === 'running'
                ? 'VPN filter is on'
                : vpn?.status === 'unavailable'
                  ? 'Needs a native VPN build'
                  : 'VPN filter is off'}
            </Text>
          </View>
          <Switch
            value={settings.protectionEnabled}
            onValueChange={(value) => void toggleProtection(value)}
            disabled={busy}
            trackColor={{ false: colors.line, true: colors.accent }}
          />
        </View>
        {vpn ? <Text style={styles.vpnNote}>{vpn.message}</Text> : null}
        <PrimaryButton
          label="Sync block list to VPN"
          variant="secondary"
          onPress={() => void refreshVpn()}
          loading={busy}
        />
      </View>

      <View style={styles.listHeader}>
        <Text style={styles.section}>Blocked domains</Text>
        <PrimaryButton label="Add" onPress={() => navigation.navigate('AddSite')} />
      </View>

      <FlatList
        data={settings.websites}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
        refreshControl={<RefreshControl refreshing={busy} onRefresh={() => void reload()} />}
        ListEmptyComponent={
          <Text style={styles.empty}>
            Add youtube.com, tiktok.com, or any domain. On a VPN build they are refused for every
            app on the phone.
          </Text>
        }
        renderItem={({ item }) => (
          <SiteCard
            rule={item}
            onPress={() => navigation.navigate('SiteDetail', { ruleId: item.id })}
          />
        )}
        ItemSeparatorComponent={() => <View style={{ height: 10 }} />}
      />
    </View>
  )
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.paper, paddingTop: 12 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.paper },
  hero: { paddingHorizontal: 20, paddingBottom: 12 },
  kicker: {
    color: colors.muted,
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 2,
    textTransform: 'uppercase',
  },
  title: { color: colors.ink, fontSize: 34, fontWeight: '700', marginTop: 6 },
  subtitle: { color: colors.inkSoft, fontSize: 14, lineHeight: 20, marginTop: 8 },
  panel: {
    marginHorizontal: 20,
    marginBottom: 16,
    backgroundColor: colors.card,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: colors.line,
    padding: 16,
    gap: 12,
  },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  panelTitle: { color: colors.ink, fontSize: 16, fontWeight: '600' },
  muted: { color: colors.muted, fontSize: 13, marginTop: 2 },
  vpnNote: { color: colors.inkSoft, fontSize: 12, lineHeight: 17 },
  listHeader: {
    paddingHorizontal: 20,
    marginBottom: 8,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  section: { color: colors.ink, fontSize: 18, fontWeight: '600' },
  list: { paddingHorizontal: 20, paddingBottom: 32 },
  empty: { color: colors.muted, fontSize: 14, lineHeight: 20, marginTop: 8 },
})
