<template>
  <div class="rounded-card border border-dashed border-line bg-surface px-6 py-14 text-center shadow-card">
    <h2 class="text-lg font-semibold text-ink">{{ title }}</h2>
    <p class="mx-auto mt-2 max-w-md text-sm leading-6 text-secondary">{{ body }}</p>
    <button
      v-if="actionLabel"
      type="button"
      class="mt-6 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white hover:bg-primary/90"
      @click="emit('action')"
    >
      {{ actionLabel }}
    </button>
  </div>
</template>

<script setup lang="ts">
defineProps<{ title: string; body: string; actionLabel?: string }>()
const emit = defineEmits<{ action: [] }>()
</script>
