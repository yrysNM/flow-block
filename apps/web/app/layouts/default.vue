<template>
  <div class="min-h-screen bg-background text-ink">
    <a
      href="#main"
      class="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50 focus:rounded-lg focus:bg-surface focus:px-3 focus:py-2"
    >
      Skip to content
    </a>
    <div class="lg:grid lg:grid-cols-[16.5rem_minmax(0,1fr)]">
      <AppSidebar :open="navOpen" @close="navOpen = false" />
      <div class="min-w-0">
        <AppTopbar @open-nav="navOpen = true" />
        <main
          id="main"
          class="mx-auto w-full px-4 sm:px-6 lg:px-8"
          :class="wide ? 'max-w-[1240px] py-4' : 'max-w-6xl py-6'"
        >
          <slot />
        </main>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
const navOpen = ref(false)
const route = useRoute()
const wide = computed(() => route.path.startsWith('/tasks'))
</script>
