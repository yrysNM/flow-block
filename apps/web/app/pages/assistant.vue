<template>
  <div class="max-w-xl space-y-6">
    <form class="space-y-5 rounded-card border border-line bg-surface p-5 shadow-card" @submit.prevent="submit">
      <div>
        <h1 class="text-2xl font-semibold tracking-tight">Assistant</h1>
        <p class="mt-1 text-sm text-secondary">
          The assistant is not connected to a model. Your prompt is checked and is not stored. No task is created.
        </p>
      </div>
      <label class="block text-sm font-medium">
        Prompt
        <textarea
          v-model="prompt"
          required
          :maxlength="maxLength"
          rows="5"
          class="field mt-1"
          placeholder="Describe the work you want to plan"
        />
      </label>
      <p v-if="error" class="text-sm text-danger" role="alert">{{ error }}</p>
      <button type="submit" class="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white disabled:opacity-60" :disabled="pending || prompt.trim().length === 0">
        {{ pending ? 'Sending…' : 'Ask' }}
      </button>
    </form>

    <section v-if="result?.status === 'not-configured'" class="rounded-card border border-line bg-surface p-5 shadow-card" role="status">
      <h2 class="text-lg font-semibold">Not configured</h2>
      <p class="mt-1 text-sm text-secondary">
        No model is connected. Nothing was suggested, and no task was created.
      </p>
    </section>

    <section v-else-if="result?.status === 'suggestions'" class="space-y-3">
      <h2 class="text-lg font-semibold">Suggestions</h2>
      <article v-for="(item, index) in result.suggestions" :key="index" class="rounded-card border border-line bg-surface p-4 shadow-card">
        <p class="font-medium text-ink">{{ item.title }}</p>
        <p v-if="item.notes" class="mt-1 text-sm text-secondary">{{ item.notes }}</p>
        <p class="mt-2 text-xs font-medium uppercase tracking-wide text-secondary">{{ item.priority }}</p>
      </article>
    </section>
  </div>
</template>

<script setup lang="ts">
import { ASSISTANT_PROMPT_MAX_LENGTH, type AssistantResult } from '@focusflow/shared-types'
import { apiErrorMessage } from '~/utils/api-error'

const api = useApi()
const prompt = ref('')
const pending = ref(false)
const error = ref('')
const result = ref<AssistantResult | null>(null)
const maxLength = ASSISTANT_PROMPT_MAX_LENGTH

async function submit() {
  error.value = ''
  result.value = null
  pending.value = true
  try {
    result.value = await api<AssistantResult>('/assistant', {
      method: 'POST',
      body: { prompt: prompt.value },
    })
  } catch (caught) {
    error.value = apiErrorMessage(caught, 'Could not ask the assistant.')
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
  background: var(--color-surface);
  color: var(--color-ink);
  padding: 0.55rem 0.75rem;
}
</style>
