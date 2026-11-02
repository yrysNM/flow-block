<template>
  <div class="flex min-h-screen items-center justify-center bg-background px-4 py-12">
    <div class="w-full max-w-md">
      <div class="mb-8 text-center">
        <p class="text-sm font-semibold tracking-wide text-primary">FocusFlow</p>
        <h1 class="mt-2 text-3xl font-semibold text-ink">Focus on what matters.</h1>
      </div>
      <div class="rounded-card border border-line bg-surface p-6 shadow-card sm:p-8">
        <slot />
      </div>
    </div>
  </div>
</template>
