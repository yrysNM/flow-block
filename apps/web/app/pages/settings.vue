<template>
  <div class="max-w-xl space-y-6">
    <form class="space-y-5 rounded-card border border-line bg-surface p-5 shadow-card" @submit.prevent="save">
      <div>
        <h1 class="text-2xl font-semibold tracking-tight">Settings</h1>
        <p class="mt-1 text-sm text-secondary">
          Name, theme, time zone, and the default focus length are stored on your account. Theme changes the shell. Language is stored, and the interface stays in English.
        </p>
      </div>
      <label class="block text-sm font-medium">
        Name
        <input v-model="name" required maxlength="80" autocomplete="name" class="field mt-1" />
      </label>
      <label class="block text-sm font-medium">
        Email
        <input :value="auth.user?.email ?? ''" type="email" readonly class="field mt-1" />
        <span class="mt-1 block text-xs font-normal text-secondary">Email cannot be changed.</span>
      </label>
      <label class="block text-sm font-medium">
        Theme
        <select v-model="theme" class="field mt-1">
          <option value="light">Light</option>
          <option value="dark">Dark</option>
          <option value="system">System</option>
        </select>
        <span class="mt-1 block text-xs font-normal text-secondary">Light and dark apply immediately after you save. System follows this device.</span>
      </label>
      <label class="block text-sm font-medium">
        Time zone
        <input v-model="timezone" required class="field mt-1" placeholder="UTC" />
        <span class="mt-1 block text-xs font-normal text-secondary">IANA name, for example Europe/Berlin. “Today” on the dashboard uses this zone.</span>
      </label>
      <label class="block text-sm font-medium">
        Week starts on
        <select v-model.number="weekStartsOn" class="field mt-1">
          <option :value="0">Sunday</option>
          <option :value="1">Monday</option>
          <option :value="2">Tuesday</option>
          <option :value="3">Wednesday</option>
          <option :value="4">Thursday</option>
          <option :value="5">Friday</option>
          <option :value="6">Saturday</option>
        </select>
      </label>
      <label class="block text-sm font-medium">
        Default focus length
        <input v-model.number="focusMinutes" type="number" min="1" max="180" required class="field mt-1" />
        <span class="mt-1 block text-xs font-normal text-secondary">Minutes. The focus page starts here. Completing a session does not change a task’s status.</span>
      </label>
      <label class="block text-sm font-medium">
        Language
        <select v-model="language" class="field mt-1">
          <option value="en">English</option>
        </select>
        <span class="mt-1 block text-xs font-normal text-secondary">Stored on your account. The interface stays in English. This is not a translation system.</span>
      </label>
      <p v-if="message" class="text-sm text-success" role="status">{{ message }}</p>
      <p v-if="error" class="text-sm text-danger" role="alert">{{ error }}</p>
      <button type="submit" class="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white disabled:opacity-60" :disabled="pending">
        {{ pending ? 'Saving…' : 'Save settings' }}
      </button>
    </form>

    <form class="space-y-5 rounded-card border border-line bg-surface p-5 shadow-card" @submit.prevent="savePassword">
      <div>
        <h2 class="text-lg font-semibold tracking-tight">Password</h2>
        <p class="mt-1 text-sm text-secondary">Enter your current password. A successful change keeps this session signed in.</p>
      </div>
      <label class="block text-sm font-medium">
        Current password
        <input v-model="currentPassword" type="password" required autocomplete="current-password" maxlength="200" class="field mt-1" />
      </label>
      <label class="block text-sm font-medium">
        New password
        <input v-model="newPassword" type="password" required autocomplete="new-password" minlength="8" maxlength="200" class="field mt-1" />
      </label>
      <p v-if="passwordMessage" class="text-sm text-success" role="status">{{ passwordMessage }}</p>
      <p v-if="passwordError" class="text-sm text-danger" role="alert">{{ passwordError }}</p>
      <button type="submit" class="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white disabled:opacity-60" :disabled="passwordPending">
        {{ passwordPending ? 'Updating…' : 'Change password' }}
      </button>
    </form>
  </div>
</template>

<script setup lang="ts">
import type { AccountLanguage, ThemePreference } from '@focusflow/shared-types'
import { apiErrorMessage } from '~/utils/api-error'

const auth = useAuthStore()
const name = ref(auth.user?.name ?? '')
const timezone = ref(auth.preferences?.timezone ?? 'UTC')
const weekStartsOn = ref(auth.preferences?.weekStartsOn ?? 1)
const theme = ref<ThemePreference>(auth.preferences?.theme ?? 'system')
const focusMinutes = ref(Math.round((auth.preferences?.focusDefaultSeconds ?? 1500) / 60))
const language = ref<AccountLanguage>('en')
const pending = ref(false)
const error = ref('')
const message = ref('')
const currentPassword = ref('')
const newPassword = ref('')
const passwordPending = ref(false)
const passwordError = ref('')
const passwordMessage = ref('')

async function save() {
  error.value = ''
  message.value = ''
  const minutes = Math.round(focusMinutes.value)
  if (!Number.isInteger(minutes) || minutes < 1 || minutes > 180) {
    error.value = 'Default focus length must be between 1 and 180 minutes.'
    return
  }
  pending.value = true
  try {
    if (name.value.trim() !== auth.user?.name) await auth.updateName(name.value.trim())
    await auth.updatePreferences({
      timezone: timezone.value.trim(),
      weekStartsOn: weekStartsOn.value,
      theme: theme.value,
      focusDefaultSeconds: minutes * 60,
      language: language.value,
    })
    message.value = 'Saved.'
  } catch (caught) {
    error.value = apiErrorMessage(caught, 'Could not save settings.')
  } finally {
    pending.value = false
  }
}

async function savePassword() {
  passwordError.value = ''
  passwordMessage.value = ''
  passwordPending.value = true
  try {
    await auth.changePassword({
      currentPassword: currentPassword.value,
      newPassword: newPassword.value,
    })
    currentPassword.value = ''
    newPassword.value = ''
    passwordMessage.value = 'Password updated. You are still signed in.'
  } catch (caught) {
    passwordError.value = apiErrorMessage(caught, 'Could not change the password.')
  } finally {
    passwordPending.value = false
  }
}
</script>

<style scoped>
.field {
  width: 100%;
  border-radius: 0.65rem;
  border: 1px solid var(--color-line);
  background: var(--color-surface);
  color: var(--color-ink);
  padding: 0.55rem 0.75rem;
}
</style>
