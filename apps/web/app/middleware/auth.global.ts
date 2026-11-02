export default defineNuxtRouteMiddleware(async (to) => {
  const auth = useAuthStore()
  if (!auth.ready) await auth.fetchMe()
  const isAuthPage = to.path === '/login' || to.path === '/register'
  if (!auth.user && !isAuthPage) return navigateTo('/login')
  if (auth.user && isAuthPage) return navigateTo('/')
})
