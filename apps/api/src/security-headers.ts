export function securityHeaders(secureRequest: boolean): Record<string, string> {
  const headers: Record<string, string> = {
    'X-Content-Type-Options': 'nosniff',
    'X-Frame-Options': 'DENY',
    'Referrer-Policy': 'no-referrer',
    'X-DNS-Prefetch-Control': 'off',
    'Permissions-Policy': 'camera=(), microphone=(), geolocation=()',
  }
  if (secureRequest) {
    headers['Strict-Transport-Security'] = 'max-age=15552000; includeSubDomains'
  }
  return headers
}
