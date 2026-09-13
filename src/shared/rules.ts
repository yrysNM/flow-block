import { matchesDomain } from './domain-matcher'
import type { WebsiteRule } from './types'

export function findMatchingRule(
  url: string,
  rules: WebsiteRule[],
): WebsiteRule | undefined {
  const matches = rules.filter((rule) => matchesDomain(url, rule.domain))
  if (matches.length === 0) return undefined
  return [...matches].sort((a, b) => b.domain.length - a.domain.length)[0]
}
