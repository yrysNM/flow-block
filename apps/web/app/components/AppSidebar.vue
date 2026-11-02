<template>
  <div>
    <div
      v-if="open"
      class="fixed inset-0 z-30 bg-ink/30 lg:hidden"
      @click="emit('close')"
    />
    <aside
      class="fixed inset-y-0 left-0 z-40 flex w-64 flex-col border-r border-line bg-surface px-4 py-5 transition-transform lg:static lg:z-auto lg:w-auto lg:translate-x-0"
      :class="open ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'"
    >
      <div class="flex items-center justify-between px-2">
        <NuxtLink to="/" class="text-lg font-semibold tracking-tight text-ink" @click="emit('close')">
          FocusFlow
        </NuxtLink>
        <button type="button" class="rounded-lg px-2 py-1 text-sm text-secondary lg:hidden" @click="emit('close')">
          Close
        </button>
      </div>
      <p class="mt-1 px-2 text-xs text-secondary">Focus on what matters.</p>

      <nav class="mt-8 flex flex-1 flex-col gap-6" aria-label="Primary">
        <div>
          <p class="px-2 text-xs font-semibold uppercase tracking-wide text-secondary">Workspace</p>
          <ul class="mt-2 space-y-1">
            <li v-for="item in primary" :key="item.to">
              <NuxtLink
                :to="item.to"
                class="block rounded-lg px-3 py-2 text-sm font-medium"
                :class="isActive(item.to) ? 'bg-primary/10 text-primary' : 'text-ink hover:bg-background'"
                @click="emit('close')"
              >
                {{ item.label }}
              </NuxtLink>
            </li>
          </ul>
        </div>
        <div>
          <p class="px-2 text-xs font-semibold uppercase tracking-wide text-secondary">Later</p>
          <ul class="mt-2 space-y-1">
            <li v-for="item in later" :key="item">
              <button
                type="button"
                class="flex w-full items-center justify-between rounded-lg px-3 py-2 text-left text-sm text-secondary"
                disabled
                :aria-disabled="true"
                title="Not in this release"
              >
                <span>{{ item }}</span>
                <span class="text-[11px] uppercase tracking-wide">Soon</span>
              </button>
            </li>
          </ul>
        </div>
      </nav>
    </aside>
  </div>
</template>

<script setup lang="ts">
defineProps<{ open: boolean }>()
const emit = defineEmits<{ close: [] }>()
const route = useRoute()

const primary = [
  { label: 'Dashboard', to: '/' },
  { label: 'Tasks', to: '/tasks' },
  { label: 'Board', to: '/board' },
  { label: 'Matrix', to: '/matrix' },
  { label: 'Planner', to: '/planner' },
  { label: 'Categories', to: '/categories' },
  { label: 'Settings', to: '/settings' },
]

const later = ['Focus', 'Habits', 'Goals', 'Analytics']

function isActive(path: string) {
  if (path === '/') return route.path === '/'
  return route.path === path || route.path.startsWith(`${path}/`)
}

function onKey(event: KeyboardEvent) {
  if (event.key === 'Escape') emit('close')
}

onMounted(() => window.addEventListener('keydown', onKey))
onBeforeUnmount(() => window.removeEventListener('keydown', onKey))
</script>
