import type { PublicPreferences, PublicUser } from '@focusflow/shared-types'

export interface AuthContext extends PublicUser {
  preferences: PublicPreferences
}

export interface AuthResult {
  token: string
  user: PublicUser
  preferences: PublicPreferences
}
