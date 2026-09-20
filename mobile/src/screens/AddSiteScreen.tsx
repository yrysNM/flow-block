import { useState } from 'react'
import { StyleSheet, Text, TextInput, View } from 'react-native'
import { useNavigation } from '@react-navigation/native'
import type { NativeStackNavigationProp } from '@react-navigation/native-stack'
import { PrimaryButton } from '../components/PrimaryButton'
import { addWebsite } from '../storage'
import { colors } from '../theme'
import type { RootStackParamList } from '../navigation/types'

type Nav = NativeStackNavigationProp<RootStackParamList>

export function AddSiteScreen() {
  const navigation = useNavigation<Nav>()
  const [value, setValue] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  async function save() {
    setSaving(true)
    setError(null)
    try {
      await addWebsite(value)
      navigation.goBack()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not add website')
    } finally {
      setSaving(false)
    }
  }

  return (
    <View style={styles.screen}>
      <Text style={styles.title}>Add a domain</Text>
      <Text style={styles.subtitle}>
        Phone-level filter matches hostnames (youtube.com), not full Chrome URLs.
      </Text>
      <TextInput
        autoCapitalize="none"
        autoCorrect={false}
        placeholder="youtube.com"
        placeholderTextColor={colors.muted}
        style={styles.input}
        value={value}
        onChangeText={setValue}
        onSubmitEditing={() => void save()}
      />
      {error ? <Text style={styles.error}>{error}</Text> : null}
      <PrimaryButton label="Add to block list" onPress={() => void save()} loading={saving} />
    </View>
  )
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.paper,
    padding: 20,
    gap: 12,
  },
  title: { color: colors.ink, fontSize: 28, fontWeight: '700' },
  subtitle: { color: colors.inkSoft, fontSize: 14, lineHeight: 20 },
  input: {
    marginTop: 8,
    borderWidth: 1,
    borderColor: colors.line,
    backgroundColor: colors.card,
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 14,
    color: colors.ink,
    fontSize: 16,
  },
  error: { color: colors.danger, fontSize: 13 },
})
