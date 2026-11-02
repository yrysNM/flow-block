import { proxyRequest } from 'h3'

export default defineEventHandler((event) => {
  const config = useRuntimeConfig()
  const target = String(config.apiProxyTarget).replace(/\/$/, '')
  const path = event.path || event.node.req.url || '/api'
  return proxyRequest(event, `${target}${path}`)
})
