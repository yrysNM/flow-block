import { describe, expect, it } from 'vitest'
import {
  domainsOverlap,
  extractHostname,
  matchesDomain,
  normalizeDomain,
} from './domain-matcher'

describe('normalizeDomain', () => {
  it('accepts bare domains, www, protocol, paths, and query strings', () => {
    expect(normalizeDomain('youtube.com')).toBe('youtube.com')
    expect(normalizeDomain('www.youtube.com')).toBe('youtube.com')
    expect(normalizeDomain('https://youtube.com')).toBe('youtube.com')
    expect(normalizeDomain('https://www.youtube.com/watch?v=dQw4w9WgXcQ')).toBe(
      'youtube.com',
    )
    expect(normalizeDomain('https://youtube.com:443/feed')).toBe('youtube.com')
    expect(normalizeDomain('  Reddit.COM/r/all  ')).toBe('reddit.com')
  })

  it('rejects invalid input', () => {
    expect(normalizeDomain('')).toBeNull()
    expect(normalizeDomain('not a domain')).toBeNull()
    expect(normalizeDomain('youtube')).toBeNull()
    expect(normalizeDomain('ftp://youtube.com')).toBeNull()
    expect(normalizeDomain('chrome://extensions')).toBeNull()
  })
})

describe('matchesDomain', () => {
  it('matches the apex domain and its subdomains', () => {
    expect(matchesDomain('https://youtube.com/', 'youtube.com')).toBe(true)
    expect(matchesDomain('https://www.youtube.com/watch', 'youtube.com')).toBe(true)
    expect(matchesDomain('https://m.youtube.com/', 'youtube.com')).toBe(true)
    expect(matchesDomain('https://music.youtube.com/play', 'youtube.com')).toBe(true)
    expect(matchesDomain('http://youtube.com:8080/feed?a=1', 'youtube.com')).toBe(true)
  })

  it('does not match lookalike hosts', () => {
    expect(matchesDomain('https://fakeyoutube.com/', 'youtube.com')).toBe(false)
    expect(matchesDomain('https://youtube.com.example.com/', 'youtube.com')).toBe(false)
    expect(matchesDomain('https://notyoutube.com/', 'youtube.com')).toBe(false)
    expect(matchesDomain('https://youtube.community/', 'youtube.com')).toBe(false)
  })

  it('matches a www-prefixed rule after normalization', () => {
    expect(matchesDomain('https://music.youtube.com', 'www.youtube.com')).toBe(true)
  })
})

describe('extractHostname', () => {
  it('ignores paths, ports, and query parameters', () => {
    expect(extractHostname('https://www.reddit.com:443/r/ask?x=1#y')).toBe(
      'www.reddit.com',
    )
  })
})

describe('domainsOverlap', () => {
  it('detects parent/child domain conflicts', () => {
    expect(domainsOverlap('youtube.com', 'music.youtube.com')).toBe(true)
    expect(domainsOverlap('music.youtube.com', 'youtube.com')).toBe(true)
    expect(domainsOverlap('youtube.com', 'youtube.com')).toBe(true)
    expect(domainsOverlap('youtube.com', 'fakeyoutube.com')).toBe(false)
  })
})
