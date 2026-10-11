export interface DictionaryEntry {
  id: string
  forms: readonly string[]
}

export interface AdultDictionaries {
  ru: readonly DictionaryEntry[]
  kk: readonly DictionaryEntry[]
  en: readonly DictionaryEntry[]
}

/** Same neutral placeholder for every match. Not a scramble of the hidden wording. */
export const MASK_PLACEHOLDER = '••••'

export interface TextSegment {
  type: 'text' | 'mask'
  text: string
}

const WORD_CHAR = String.raw`\p{L}\p{M}\p{N}`

const compiled = new WeakMap<AdultDictionaries, RegExp | null>()

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

function formPattern(form: string): string | null {
  const parts = form
    .trim()
    .split(/\s+/)
    .filter((part) => part.length > 0)
    .map(escapeRegExp)
  if (parts.length === 0) return null
  return parts.join(String.raw`\s+`)
}

function regexFor(dictionaries: AdultDictionaries): RegExp | null {
  const cached = compiled.get(dictionaries)
  if (cached !== undefined) return cached

  const seen = new Set<string>()
  const forms: string[] = []
  for (const entry of [...dictionaries.ru, ...dictionaries.kk, ...dictionaries.en]) {
    for (const form of entry.forms) {
      const key = form.trim().toLowerCase()
      if (!key || seen.has(key)) continue
      seen.add(key)
      forms.push(form.trim())
    }
  }

  forms.sort((left, right) => right.length - left.length)
  const alternatives = forms
    .map(formPattern)
    .filter((pattern): pattern is string => pattern !== null)

  const regex =
    alternatives.length === 0
      ? null
      : new RegExp(`(?<![${WORD_CHAR}])(?:${alternatives.join('|')})(?![${WORD_CHAR}])`, 'giu')

  compiled.set(dictionaries, regex)
  return regex
}

export function segmentText(text: string, dictionaries: AdultDictionaries): TextSegment[] {
  const regex = regexFor(dictionaries)
  if (!regex || text.length === 0) return [{ type: 'text', text }]

  regex.lastIndex = 0
  const segments: TextSegment[] = []
  let cursor = 0
  for (const match of text.matchAll(regex)) {
    const start = match.index ?? 0
    const raw = match[0]
    if (start < cursor) continue
    if (start > cursor) {
      segments.push({ type: 'text', text: text.slice(cursor, start) })
    }
    segments.push({ type: 'mask', text: MASK_PLACEHOLDER })
    cursor = start + raw.length
  }
  if (cursor < text.length) {
    segments.push({ type: 'text', text: text.slice(cursor) })
  }
  if (segments.length === 0) return [{ type: 'text', text }]
  return segments
}

export function renderExposed(
  text: string,
  options: { enabled: boolean; editable: boolean; dictionaries: AdultDictionaries },
): string {
  if (!options.enabled || options.editable) return text
  return segmentText(text, options.dictionaries)
    .map((segment) => segment.text)
    .join('')
}
