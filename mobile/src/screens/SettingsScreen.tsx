import { useCallback, useState } from 'react'
import { StyleSheet, Text, TextInput, View } from 'react-native'
import { useFocusEffect, useNavigation } from '@react-navigation/native'
import type { NativeStackNavigationProp } from '@react-navigation/native-stack'
import { PrimaryButton } from '../components/PrimaryButton'
import { getSettings, mutateSettings } from '../storage'
import { colors } from '../theme'
import type { AppSettings } from '../types'
import type { RootStackParamList } from '../navigation/types'

type Nav = NativeStackNavigationProp<RootStackParamList>

export function SettingsScreen() {
  const navigation = useNavigation<Nav>()
  const [settings, setSettings] = useState<AppSettings | null>(null)
  const [baseUrl, setBaseUrl] = useState('')
  const [note, setNote] = useState('')

  const reload = useCallback(async () => {
    const next = await getSettings()
    setSettings(next)
    setBaseUrl(next.unlockBaseUrl)
  }, [])

  useFocusEffect(
    useCallback(() => {
      void reload()
    }, [reload]),
  )

  async function saveBaseUrl() {
    const next = await mutateSettings((current) => ({
      ...current,
      unlockBaseUrl: baseUrl.trim() || current.unlockBaseUrl,
    }))
    setSettings(next)
    setNote('Unlock base URL saved. Point this at your hosted Accept/Denied API.')
  }

  if (!settings) {
    return (
      <View style={styles.screen}>
        <Text style={styles.muted}>Loading…</Text>
      </View>
    )
  }

  return (
    <View style={styles.screen}>
      <Text style={styles.title}>Settings</Text>
      <Text style={styles.subtitle}>
        Desktop Chrome stays the extension. This app is for Android phone-level DNS/VPN blocking.
      </Text>

      <View style={styles.panel}>
        <Text style={styles.panelTitle}>Trusted unlock base URL</Text>
        <Text style={styles.muted}>
          Friends open `https://…/unlock?token=…`. Local storage works on-device; cross-phone needs
          a real backend.
        </Text>
        <TextInput
          autoCapitalize="none"
          autoCorrect={false}
          value={baseUrl}
          onChangeText={setBaseUrl}
          placeholder="https://unlock.example.com"
          placeholderTextColor={colors.muted}
          style={styles.input}
        />
        <PrimaryButton label="Save unlock URL" onPress={() => void saveBaseUrl()} />
        {note ? <Text style={styles.good}>{note}</Text> : null}
      </View>

      <PrimaryButton
        label="Open sample unlock screen"
        variant="secondary"
        onPress={() => navigation.navigate('Unlock', { token: 'demo-missing' })}
      />
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
  title: { color: colors.ink, fontSize: 28, fontWeight: '700' },
  subtitle: { color: colors.inkSoft, fontSize: 14, lineHeight: 20 },
  panel: {
    backgroundColor: colors.card,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: colors.line,
    padding: 16,
    gap: 10,
  },
  panelTitle: { color: colors.ink, fontSize: 16, fontWeight: '600' },
  muted: { color: colors.muted, fontSize: 13, lineHeight: 18 },
  input: {
    borderWidth: 1,
    borderColor: colors.line,
    backgroundColor: colors.paper,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 12,
    color: colors.ink,
  },
  good: { color: colors.good, fontSize: 13 },
})
