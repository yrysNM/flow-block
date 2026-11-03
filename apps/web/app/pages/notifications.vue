<template>
  <div class="max-w-xl space-y-6">
    <div class="flex flex-wrap items-end justify-between gap-3">
      <div>
        <h1 class="text-2xl font-semibold tracking-tight">Notifications</h1>
        <p class="mt-1 text-sm text-secondary">
          In-app notes for a completed focus session and a new recurring task. Nothing here is email or a sample row.
        </p>
      </div>
      <button
        v-if="store.unreadCount > 0"
        type="button"
        class="rounded-lg border border-line px-3 py-2 text-sm font-medium text-ink hover:bg-surface disabled:opacity-60"
        :disabled="pending"
        @click="markAll"
      >
        Mark all read
      </button>
    </div>

    <p v-if="error" class="text-sm text-danger" role="alert">{{ error }}</p>
    <p v-else-if="loading" class="text-sm text-secondary">Loading notifications…</p>
    <p v-else-if="store.items.length === 0" class="rounded-card border border-line bg-surface p-5 text-sm text-secondary shadow-card">
      No notifications yet. Completing a focus session or a repeating task will add one.
    </p>

    <ul v-else class="space-y-3">
      <li v-for="item in store.items" :key="item.id" class="rounded-card border border-line bg-surface p-4 shadow-card">
        <div class="flex items-start justify-between gap-3">
          <div>
            <p class="font-medium text-ink">{{ item.title }}</p>
            <p class="mt-1 text-xs text-secondary">{{ item.readAt ? 'Read' : 'Unread' }}</p>
          </div>
          <button
            v-if="!item.readAt"
            type="button"
            class="rounded-lg border border-line px-3 py-1.5 text-sm text-ink hover:bg-background disabled:opacity-60"
            :disabled="pending"
            @click="markOne(item.id)"
          >
            Mark read
          </button>
        </div>
        <NuxtLink :to="item.linkPath" class="mt-3 inline-block text-sm font-medium text-primary">Open</NuxtLink>
      </li>
    </ul>
  </div>
</template>

<script setup lang="ts">
import { apiErrorMessage } from '~/utils/api-error'

const store = useNotificationsStore()
const loading = ref(true)
const pending = ref(false)
const error = ref('')

onMounted(async () => {
  try {
    await store.refresh()
  } catch (caught) {
    error.value = apiErrorMessage(caught, 'Could not load notifications.')
  } finally {
    loading.value = false
  }
})

async function markOne(id: string) {
  error.value = ''
  pending.value = true
  try {
    await store.markRead(id)
  } catch (caught) {
    error.value = apiErrorMessage(caught, 'Could not mark that notification read.')
  } finally {
    pending.value = false
  }
}

async function markAll() {
  error.value = ''
  pending.value = true
  try {
    await store.markAllRead()
  } catch (caught) {
    error.value = apiErrorMessage(caught, 'Could not mark notifications read.')
  } finally {
    pending.value = false
  }
}
</script>
