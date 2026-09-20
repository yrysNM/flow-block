export type RootStackParamList = {
  Home: undefined
  AddSite: undefined
  SiteDetail: { ruleId: string }
  Blocked: { domain: string; ruleId?: string }
  Unlock: { token: string }
  Settings: undefined
}
