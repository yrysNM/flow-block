<template>
  <form class="space-y-4" @submit.prevent="submit">
    <div>
      <h2 class="text-xl font-semibold text-ink">Create your account</h2>
      <p class="mt-1 text-sm text-secondary">One account for tasks now, and for focus tools later.</p>
    </div>
    <label class="block text-sm font-medium">
      Name
      <input v-model="name" autocomplete="name" required maxlength="80" class="field mt-1" />
    </label>
    <label class="block text-sm font-medium">
      Email
      <input v-model="email" type="email" autocomplete="email" required class="field mt-1" />
    </label>
    <label class="block text-sm font-medium">
      Password
      <input v-model="password" type="password" autocomplete="new-password" required minlength="8" class="field mt-1" />
    </label>
    <p v-if="error" class="text-sm text-danger" role="alert">{{ error }}</p>
    <button type="submit" class="w-full rounded-lg bg-primary px-4 py-2.5 text-sm font-medium text-white disabled:opacity-60" :disabled="pending">
      {{ pending ? 'Creating account…' : 'Create account' }}
    </button>
    <p class="text-center text-sm text-secondary">
      Already have an account?
      <NuxtLink to="/login" class="font-medium text-primary">Log in</NuxtLink>
    </p>
  </form>
</template>

<script setup lang="ts">
import { registerSchema } from '@focusflow/shared-schemas'
import { apiErrorMessage } from '~/utils/api-error'

definePageMeta({ layout: 'auth' })

const auth = useAuthStore()
const name = ref('')
const email = ref('')
const password = ref('')
const error = ref('')
const pending = ref(false)

async function submit() {
  error.value = ''
  const parsed = registerSchema.safeParse({ name: name.value, email: email.value, password: password.value })
  if (!parsed.success) {
    error.value = parsed.error.issues[0]?.message ?? 'Check the form and try again.'
    return
  }
  pending.value = true
  try {
    await auth.register(parsed.data)
    await navigateTo('/')
  } catch (caught) {
    error.value = apiErrorMessage(caught, 'Could not create the account.')
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
