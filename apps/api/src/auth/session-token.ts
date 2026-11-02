import { createHmac, randomBytes } from 'node:crypto'
import { resolveSessionSecret } from './session-secret'

export function createSessionToken(): { token: string; tokenHash: string } {
  const token = randomBytes(32).toString('base64url')
  return { token, tokenHash: hashSessionToken(token) }
}

/** HMAC-SHA256 so a copied database cannot be matched without SESSION_SECRET. */
export function hashSessionToken(token: string): string {
  return createHmac('sha256', resolveSessionSecret()).update(token).digest('hex')
}
