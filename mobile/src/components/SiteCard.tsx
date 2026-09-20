import { Pressable, StyleSheet, Text, View } from 'react-native'
import { displayName } from '../domain'
import { isTrustedUnlockActive } from '../storage'
import { colors } from '../theme'
import type { WebsiteRule } from '../types'

export function SiteCard({
  rule,
  onPress,
}: {
  rule: WebsiteRule
  onPress: () => void
}) {
  const unlocked = isTrustedUnlockActive(rule)

  return (
    <Pressable onPress={onPress} style={({ pressed }) => [styles.card, pressed && styles.pressed]}>
      <View style={styles.row}>
        <View style={{ flex: 1 }}>
          <Text style={styles.title}>{displayName(rule.domain)}</Text>
          <Text style={styles.domain}>{rule.domain}</Text>
        </View>
        <View style={[styles.badge, unlocked ? styles.badgeGood : styles.badgeAccent]}>
          <Text style={styles.badgeText}>
            {!rule.enabled ? 'Off' : unlocked ? 'Unlocked today' : 'Blocked'}
          </Text>
        </View>
      </View>
    </Pressable>
  )
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.card,
    borderColor: colors.line,
    borderWidth: 1,
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  pressed: { opacity: 0.85 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  title: { color: colors.ink, fontSize: 18, fontWeight: '600' },
  domain: { color: colors.muted, fontSize: 13, marginTop: 2 },
  badge: {
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  badgeAccent: { backgroundColor: colors.accentSoft },
  badgeGood: { backgroundColor: '#D8EBDF' },
  badgeText: { color: colors.inkSoft, fontSize: 12, fontWeight: '600' },
})
