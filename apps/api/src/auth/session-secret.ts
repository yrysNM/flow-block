/** Development-only pepper. Production refuses this exact value. */
export const DEV_SESSION_SECRET = 'focusflow-dev-only'

const MIN_PRODUCTION_SECRET_LENGTH = 32

/** Placeholders that must not boot a production API. */
export const DEFAULT_SESSION_SECRETS = new Set([
  DEV_SESSION_SECRET,
  'change-me',
  'changeme',
  'secret',
  'session-secret',
  'focusflow',
  'password',
  'replace-with-a-long-random-session-secret',
])

export class ProductionSessionSecretError extends Error {
  constructor() {
    super('Refusing to start in production with an empty or default SESSION_SECRET.')
    this.name = 'ProductionSessionSecretError'
  }
}

/**
 * Pepper for session token hashes.
 * Outside production, an unset variable uses the development pepper.
 * Production requires a non-placeholder value of at least 32 characters.
 */
export function resolveSessionSecret(env: NodeJS.ProcessEnv = process.env): string {
  const secret = (env.SESSION_SECRET ?? '').trim()
  if (env.NODE_ENV === 'production') {
    if (secret.length < MIN_PRODUCTION_SECRET_LENGTH || DEFAULT_SESSION_SECRETS.has(secret)) {
      throw new ProductionSessionSecretError()
    }
    return secret
  }
  return secret.length > 0 ? secret : DEV_SESSION_SECRET
}

export function assertProductionSessionSecret(env: NodeJS.ProcessEnv = process.env): void {
  resolveSessionSecret(env)
}
