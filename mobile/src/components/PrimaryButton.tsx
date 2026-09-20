import { ActivityIndicator, Pressable, StyleSheet, Text } from 'react-native'
import { colors } from '../theme'

export function PrimaryButton({
  label,
  onPress,
  variant = 'default',
  disabled,
  loading,
}: {
  label: string
  onPress: () => void
  variant?: 'default' | 'secondary' | 'danger'
  disabled?: boolean
  loading?: boolean
}) {
  return (
    <Pressable
      disabled={disabled || loading}
      onPress={onPress}
      style={({ pressed }) => [
        styles.base,
        variant === 'secondary' && styles.secondary,
        variant === 'danger' && styles.danger,
        (disabled || loading) && styles.disabled,
        pressed && styles.pressed,
      ]}
    >
      {loading ? (
        <ActivityIndicator color={variant === 'secondary' ? colors.ink : colors.white} />
      ) : (
        <Text
          style={[
            styles.label,
            variant === 'secondary' && styles.labelSecondary,
          ]}
        >
          {label}
        </Text>
      )}
    </Pressable>
  )
}

const styles = StyleSheet.create({
  base: {
    minHeight: 48,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 16,
    backgroundColor: colors.accent,
  },
  secondary: {
    backgroundColor: colors.paper2,
    borderWidth: 1,
    borderColor: colors.line,
  },
  danger: { backgroundColor: colors.danger },
  disabled: { opacity: 0.5 },
  pressed: { opacity: 0.88 },
  label: { color: colors.white, fontSize: 15, fontWeight: '600' },
  labelSecondary: { color: colors.ink },
})
