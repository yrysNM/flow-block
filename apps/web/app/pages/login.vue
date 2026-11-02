<template>
  <form class="space-y-4" @submit.prevent="submit">
    <div>
      <h2 class="text-xl font-semibold text-ink">Log in</h2>
      <p class="mt-1 text-sm text-secondary">Use the email and password for your FocusFlow account.</p>
    </div>
    <label class="block text-sm font-medium">
      Email
      <input v-model="email" type="email" autocomplete="email" required class="field mt-1" />
    </label>
    <label class="block text-sm font-medium">
      Password
      <input v-model="password" type="password" autocomplete="current-password" required class="field mt-1" />
    </label>
    <p v-if="error" class="text-sm text-danger" role="alert">{{ error }}</p>
    <button type="submit" class="w-full rounded-lg bg-primary px-4 py-2.5 text-sm font-medium text-white disabled:opacity-60" :disabled="pending">
      {{ pending ? 'Signing in…' : 'Log in' }}
    </button>
    <p class="text-center text-sm text-secondary">
      New here?
      <NuxtLink to="/register" class="font-medium text-primary">Create an account</NuxtLink>
    </p>
  </form>
</template>

<script setup lang="ts">
import { loginSchema } from '@focusflow/shared-schemas'
import { apiErrorMessage } from '~/utils/api-error'

definePageMeta({ layout: 'auth' })

const auth = useAuthStore()
const email = ref('')
const password = ref('')
const error = ref('')
const pending = ref(false)

async function submit() {
  error.value = ''
  const parsed = loginSchema.safeParse({ email: email.value, password: password.value })
  if (!parsed.success) {
    error.value = parsed.error.issues[0]?.message ?? 'Check the form and try again.'
    return
  }
  pending.value = true
  try {
    await auth.login(parsed.data)
    await navigateTo('/')
  } catch (caught) {
    error.value = apiErrorMessage(caught, 'Could not log in.')
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
  padding: 0.6rem 0.75rem;
}
</style>
