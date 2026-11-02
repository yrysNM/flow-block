<template>
  <form class="max-w-xl space-y-5 rounded-card border border-line bg-surface p-5 shadow-card" @submit.prevent="save">
    <div>
      <h1 class="text-2xl font-semibold tracking-tight">Settings</h1>
      <p class="mt-1 text-sm text-secondary">
        Your name and time zone are stored on your account. The interface stays on the light design system in this release.
      </p>
    </div>
    <label class="block text-sm font-medium">
      Name
      <input v-model="name" required maxlength="80" class="field mt-1" />
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
    <p v-if="message" class="text-sm text-success" role="status">{{ message }}</p>
    <p v-if="error" class="text-sm text-danger" role="alert">{{ error }}</p>
    <button type="submit" class="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white disabled:opacity-60" :disabled="pending">
      {{ pending ? 'Saving…' : 'Save settings' }}
    </button>
  </form>
</template>

<script setup lang="ts">
import { apiErrorMessage } from '~/utils/api-error'

const auth = useAuthStore()
const name = ref(auth.user?.name ?? '')
const timezone = ref(auth.preferences?.timezone ?? 'UTC')
const weekStartsOn = ref(auth.preferences?.weekStartsOn ?? 1)
const pending = ref(false)
const error = ref('')
const message = ref('')

async function save() {
  error.value = ''
  message.value = ''
  pending.value = true
  try {
    if (name.value.trim() !== auth.user?.name) await auth.updateName(name.value.trim())
    await auth.updatePreferences({
      timezone: timezone.value.trim(),
      weekStartsOn: weekStartsOn.value,
    })
    message.value = 'Saved.'
  } catch (caught) {
    error.value = apiErrorMessage(caught, 'Could not save settings.')
  } finally {
    pending.value = false
  }
}
</script>

<style scoped>
.field {
  width: 100%;
  border-radius: 0.65rem;
  border: 1px solid var(--color-line);
  padding: 0.55rem 0.75rem;
}
</style>
