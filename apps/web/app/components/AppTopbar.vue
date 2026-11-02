<template>
  <header class="sticky top-0 z-20 flex items-center justify-between gap-3 border-b border-line bg-surface/95 px-4 py-3 backdrop-blur sm:px-6">
    <div class="flex items-center gap-3">
      <button
        type="button"
        class="rounded-lg border border-line px-2.5 py-1.5 text-sm lg:hidden"
        @click="emit('open-nav')"
      >
        Menu
      </button>
      <p class="text-sm font-medium text-ink">{{ title }}</p>
    </div>
    <div class="flex items-center gap-3">
      <p class="hidden text-sm text-secondary sm:block">{{ auth.user?.name }}</p>
      <button type="button" class="rounded-lg border border-line px-3 py-1.5 text-sm font-medium text-ink hover:bg-background" @click="logout">
        Log out
      </button>
    </div>
  </header>
</template>

<script setup lang="ts">
const emit = defineEmits<{ 'open-nav': [] }>()
const auth = useAuthStore()
const route = useRoute()

const title = computed(() => {
  if (route.path.startsWith('/tasks')) return 'Tasks'
  if (route.path.startsWith('/board')) return 'Board'
  if (route.path.startsWith('/categories')) return 'Categories'
  if (route.path.startsWith('/settings')) return 'Settings'
  return 'Dashboard'
})

async function logout() {
  await auth.logout()
  await navigateTo('/login')
}
</script>
