import { NativeModules, Platform } from 'react-native'
import type { VpnFilterStatus, VpnStatus } from '../types'

/**
 * Phone-level blocking needs an Android local VPN (VpnService) that drops
 * listed domains for every app. That cannot run in Expo Go.
 *
 * Wire a native module named FlowBlockVpn after `npx expo prebuild`:
 *   - start(domains: string[]): Promise<{ status }>
 *   - stop(): Promise<{ status }>
 *   - updateDomains(domains: string[]): Promise<void>
 *   - getStatus(): Promise<{ status, message?, blockedDomains? }>
 *
 * See ./NATIVE.md for the Android VpnService / DNS-filter outline.
 */

type NativeVpnModule = {
  start: (domains: string[]) => Promise<{ status?: string; message?: string }>
  stop: () => Promise<{ status?: string; message?: string }>
  updateDomains: (domains: string[]) => Promise<void>
  getStatus: () => Promise<{
    status?: string
    message?: string
    blockedDomains?: string[]
  }>
}

const native = NativeModules.FlowBlockVpn as NativeVpnModule | undefined

let mockStatus: VpnStatus = 'stopped'
let mockDomains: string[] = []

function hasNativeModule(): boolean {
  return Platform.OS === 'android' && Boolean(native?.start)
}

export function isVpnAvailable(): boolean {
  return hasNativeModule()
}

export async function getVpnStatus(): Promise<VpnFilterStatus> {
  if (!hasNativeModule()) {
    return {
      status: 'unavailable',
      message:
        'Local VPN needs a development build (not Expo Go). Run prebuild, add the native VpnService, then eas build.',
      blockedDomains: mockDomains,
    }
  }

  try {
    const result = await native!.getStatus()
    return {
      status: (result.status as VpnStatus) ?? 'stopped',
      message: result.message ?? 'VPN module ready',
      blockedDomains: result.blockedDomains ?? [],
    }
  } catch (error) {
    return {
      status: 'error',
      message: error instanceof Error ? error.message : 'Could not read VPN status',
      blockedDomains: [],
    }
  }
}

export async function startVpn(domains: string[]): Promise<VpnFilterStatus> {
  mockDomains = [...domains]

  if (!hasNativeModule()) {
    mockStatus = 'stopped'
    return getVpnStatus()
  }

  try {
    const result = await native!.start(domains)
    return {
      status: (result.status as VpnStatus) ?? 'running',
      message: result.message ?? 'VPN filter running',
      blockedDomains: domains,
    }
  } catch (error) {
    return {
      status: 'error',
      message: error instanceof Error ? error.message : 'Could not start VPN',
      blockedDomains: domains,
    }
  }
}

export async function stopVpn(): Promise<VpnFilterStatus> {
  if (!hasNativeModule()) {
    mockStatus = 'stopped'
    return getVpnStatus()
  }

  try {
    const result = await native!.stop()
    return {
      status: (result.status as VpnStatus) ?? 'stopped',
      message: result.message ?? 'VPN filter stopped',
      blockedDomains: [],
    }
  } catch (error) {
    return {
      status: 'error',
      message: error instanceof Error ? error.message : 'Could not stop VPN',
      blockedDomains: mockDomains,
    }
  }
}

export async function syncVpnDomains(domains: string[]): Promise<void> {
  mockDomains = [...domains]
  if (!hasNativeModule()) return
  await native!.updateDomains(domains)
}

/** Exposed for tests / UI diagnostics only. */
export function __getMockVpnState() {
  return { status: mockStatus, domains: mockDomains }
}
