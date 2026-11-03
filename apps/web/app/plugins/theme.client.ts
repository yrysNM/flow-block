export default defineNuxtPlugin(() => {
  const auth = useAuthStore()
  watch(
    () => auth.preferences?.theme ?? 'system',
    (theme) => {
      document.documentElement.dataset.theme = theme
    },
    { immediate: true },
  )
})
