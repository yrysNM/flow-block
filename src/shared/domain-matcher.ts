const PROTOCOL_RE = /^[a-z][a-z0-9+.-]*:/i
const IPV4_RE = /^(?:\d{1,3}\.){3}\d{1,3}$/
const LABEL_RE = /^(?:[a-z0-9](?:[a-z0-9-]*[a-z0-9])?|xn--[a-z0-9-]+)$/

export function extractHostname(url: string): string | null {
  const trimmed = url.trim()
  if (!trimmed) return null

  let candidate = trimmed
  if (!PROTOCOL_RE.test(candidate)) {
    candidate = `https://${candidate}`
  }

  try {
    const parsed = new URL(candidate)
    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
      return null
    }

    let hostname = parsed.hostname.trim().toLowerCase()
    if (hostname.startsWith('[') && hostname.endsWith(']')) {
      hostname = hostname.slice(1, -1)
    }
    hostname = hostname.replace(/\.+$/, '')
    return hostname || null
  } catch {
    return null
  }
}

export function stripWww(hostname: string): string {
  return hostname.startsWith('www.') ? hostname.slice(4) : hostname
}

export function isValidHostname(hostname: string): boolean {
  if (!hostname || hostname.length > 253 || hostname.includes(' ')) {
    return false
  }

  if (IPV4_RE.test(hostname)) {
    return hostname.split('.').every((part) => {
      const value = Number(part)
      return value >= 0 && value <= 255
    })
  }

  const labels = hostname.split('.')
  if (labels.length < 2) return false
  if (labels.some((label) => label.length === 0 || label.length > 63)) {
    return false
  }
  return labels.every((label) => LABEL_RE.test(label))
}

export function normalizeDomain(input: string): string | null {
  const hostname = extractHostname(input)
  if (!hostname) return null
  const normalized = stripWww(hostname)
  if (!isValidHostname(normalized)) return null
  return normalized
}

export function matchesDomain(url: string, domain: string): boolean {
  const hostname = extractHostname(url)
  const ruleDomain = normalizeDomain(domain)
  if (!hostname || !ruleDomain) return false

  const host = stripWww(hostname)
  return host === ruleDomain || host.endsWith(`.${ruleDomain}`)
}

export function domainsOverlap(a: string, b: string): boolean {
  const left = normalizeDomain(a)
  const right = normalizeDomain(b)
  if (!left || !right) return false
  return left === right || left.endsWith(`.${right}`) || right.endsWith(`.${left}`)
}

export function isHttpUrl(url: string): boolean {
  try {
    const parsed = new URL(url)
    return parsed.protocol === 'http:' || parsed.protocol === 'https:'
  } catch {
    return false
  }
}
