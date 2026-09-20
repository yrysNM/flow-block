export type UnlockRequestStatus = 'pending' | 'accepted' | 'denied'

export interface WebsiteRule {
  id: string
  domain: string
  enabled: boolean
  createdAt: string
  /** ISO timestamp — while in the future, domain is allowed through VPN filter */
  unlockedUntil?: string
}

export interface UnlockRequest {
  id: string
  token: string
  ruleId: string
  domain: string
  createdAt: string
  expiresAt: string
  status: UnlockRequestStatus
  decidedAt?: string
}

export interface AppSettings {
  websites: WebsiteRule[]
  unlockRequests: UnlockRequest[]
  protectionEnabled: boolean
  vpnRunning: boolean
  /**
   * Public HTTPS base for trusted-person unlock links.
   * Friends open this on *any* phone. Wire a real backend later.
   */
  unlockBaseUrl: string
}

export type VpnStatus = 'unavailable' | 'stopped' | 'starting' | 'running' | 'error'

export interface VpnFilterStatus {
  status: VpnStatus
  message: string
  blockedDomains: string[]
}
