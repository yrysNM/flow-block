import { describe, expect, it } from 'vitest'
import { getBlockDecision } from '../shared/blocking'
import { applyImport, createExportPayload, parseImportPayload } from '../shared/import-export'
import { createDefaultSettings, createWebsiteRule, sanitizeSettings } from '../shared/storage'
import { adultDictionaries } from './dictionaries'
import { MASK_PLACEHOLDER, renderExposed, segmentText } from './match'
import type { AdultDictionaries } from './match'
import { PageMask } from './page-mask'
import { isUserTypingContext, shouldRunWordMask } from './page-policy'

const fixtures: AdultDictionaries = {
  ru: [
    { id: 'ru-word', forms: ['квандол', 'квандола', 'квандолу'] },
    { id: 'ru-phrase', forms: ['квандол мирный'] },
  ],
  kk: [{ id: 'kk-word', forms: ['жұлдызша', 'жұлдызшаны', 'zhuldyzsha', 'zhuldyzshany'] }],
  en: [
    { id: 'en-word', forms: ['zorblat', 'zorblats', 'zorblatting'] },
    { id: 'en-phrase', forms: ['zorblat quorvex'] },
  ],
}

const CONTROL_SENTENCES = [
  'The weather in Almaty is cold and the meeting starts at nine.',
  'Сегодня хорошая погода, и встреча начнётся в девять.',
  'Бүгін ауа райы жақсы, жиналыс сағат тоғызда басталады.',
  'Today the meeting is in Almaty. Сегодня хорошая погода. Бүгін жиналыс бар.',
]

function expose(text: string, dictionaries: AdultDictionaries, enabled = true): string {
  return renderExposed(text, { enabled, editable: false, dictionaries })
}

function letters(value: string): string {
  return [...value.toLocaleLowerCase()]
    .filter((char) => /\p{L}/u.test(char))
    .sort()
    .join('')
}

describe('dictionary matching', () => {
  it('masks Russian, Kazakh, and English fixture forms, including inflections', () => {
    expect(expose('квандол', fixtures)).toBe(MASK_PLACEHOLDER)
    expect(expose('Квандола', fixtures)).toBe(MASK_PLACEHOLDER)
    expect(expose('квандолу', fixtures)).toBe(MASK_PLACEHOLDER)
    expect(expose('жұлдызша', fixtures)).toBe(MASK_PLACEHOLDER)
    expect(expose('ЖҰЛДЫЗШАНЫ', fixtures)).toBe(MASK_PLACEHOLDER)
    expect(expose('zhuldyzsha', fixtures)).toBe(MASK_PLACEHOLDER)
    expect(expose('Zhuldyzshany', fixtures)).toBe(MASK_PLACEHOLDER)
    expect(expose('zorblat', fixtures)).toBe(MASK_PLACEHOLDER)
    expect(expose('Zorblats', fixtures)).toBe(MASK_PLACEHOLDER)
    expect(expose('zorblatting', fixtures)).toBe(MASK_PLACEHOLDER)
  })

  it('keeps Cyrillic and Latin spellings on the same Kazakh fixture entry', () => {
    const entry = fixtures.kk.find((item) => item.id === 'kk-word')
    expect(entry?.forms).toContain('жұлдызша')
    expect(entry?.forms).toContain('zhuldyzsha')
    expect(expose('жұлдызша', fixtures)).toBe(expose('zhuldyzsha', fixtures))
  })

  it('masks one match from each language and leaves the other words', () => {
    const mixed = 'See zorblat plus квандол plus жұлдызша today.'
    expect(expose(mixed, fixtures)).toBe(
      `See ${MASK_PLACEHOLDER} plus ${MASK_PLACEHOLDER} plus ${MASK_PLACEHOLDER} today.`,
    )
  })

  it('does not mask a longer word that only contains the same characters', () => {
    expect(expose('zorblattice', fixtures)).toBe('zorblattice')
    expect(expose('unzorblat', fixtures)).toBe('unzorblat')
    expect(expose('квандольный', fixtures)).toBe('квандольный')
    expect(expose('неквандол', fixtures)).toBe('неквандол')
    expect(expose('zhuldyzshade', fixtures)).toBe('zhuldyzshade')
    expect(expose('жұлдызшалық', fixtures)).toBe('жұлдызшалық')
  })

  it('masks a multi-word phrase as one span and leaves the rest of the paragraph', () => {
    const paragraph = 'Please read zorblat quorvex today and then finish the notes about weather.'
    const segments = segmentText(paragraph, fixtures)
    const masks = segments.filter((segment) => segment.type === 'mask')
    expect(masks).toHaveLength(1)
    expect(masks[0]?.text).toBe(MASK_PLACEHOLDER)
    expect(expose(paragraph, fixtures)).toBe(
      `Please read ${MASK_PLACEHOLDER} today and then finish the notes about weather.`,
    )
    expect(expose('квандол мирный остаётся рядом с обычной фразой.', fixtures)).toBe(
      `${MASK_PLACEHOLDER} остаётся рядом с обычной фразой.`,
    )
  })

  it('leaves the non-adult control sentences fully visible', () => {
    for (const sentence of CONTROL_SENTENCES) {
      expect(expose(sentence, fixtures)).toBe(sentence)
      expect(expose(sentence, adultDictionaries)).toBe(sentence)
    }
  })

  it('uses one placeholder that does not spell the hidden wording', () => {
    const samples = ['zorblat', 'квандола', 'zhuldyzsha', 'zorblat quorvex']
    const placeholders = samples.flatMap((sample) =>
      segmentText(sample, fixtures)
        .filter((segment) => segment.type === 'mask')
        .map((segment) => segment.text),
    )
    expect(new Set(placeholders).size).toBe(1)
    expect(placeholders[0]).toBe(MASK_PLACEHOLDER)
    expect(letters(MASK_PLACEHOLDER)).toBe('')
    for (const sample of samples) {
      expect(letters(MASK_PLACEHOLDER)).not.toBe(letters(sample))
      expect(MASK_PLACEHOLDER.includes(sample.toLowerCase())).toBe(false)
    }
  })
})

describe('word hiding setting', () => {
  it('defaults off, including saved settings that omit the field', () => {
    expect(createDefaultSettings().hideAdultWording).toBe(false)
    expect(sanitizeSettings({ websites: [], globalEnabled: true }).hideAdultWording).toBe(false)
    expect(sanitizeSettings({ hideAdultWording: true }).hideAdultWording).toBe(true)
    expect(expose('zorblat', fixtures, false)).toBe('zorblat')
    expect(expose('zorblat', fixtures, true)).toBe(MASK_PLACEHOLDER)
  })

  it('round-trips the switch and treats an older backup as off', () => {
    const settings = createDefaultSettings()
    settings.hideAdultWording = true
    const payload = createExportPayload(settings)
    expect(payload.version).toBe(1)
    const restored = applyImport(
      createDefaultSettings(),
      parseImportPayload(JSON.parse(JSON.stringify(payload)) as unknown),
    )
    expect(restored.hideAdultWording).toBe(true)

    const legacy = {
      version: 1,
      exportedAt: '2026-01-01T00:00:00.000Z',
      websites: [],
      settings: {
        globalEnabled: true,
        trackingEnabled: false,
        notifications: { at80Percent: true, atLimit: true },
        theme: 'dark',
      },
    }
    const current = createDefaultSettings()
    current.hideAdultWording = true
    const imported = applyImport(current, parseImportPayload(legacy))
    expect(imported.hideAdultWording).toBe(false)
    expect(imported.trackingEnabled).toBe(false)
    expect(imported.theme).toBe('dark')
  })

  it('does not change domain blocking when the switch is on or off', () => {
    const blocked = createWebsiteRule('youtube.com', { blocking: true, timeLimit: false })
    const off = createDefaultSettings()
    off.hideAdultWording = false
    off.websites = [blocked]
    expect(getBlockDecision('https://www.youtube.com/watch', off).blocked).toBe(true)

    const hiding = createDefaultSettings()
    hiding.hideAdultWording = true
    hiding.globalEnabled = false
    hiding.websites = [blocked]
    expect(getBlockDecision('https://www.youtube.com/watch', hiding).blocked).toBe(false)
    expect(expose('zorblat', fixtures, hiding.hideAdultWording)).toBe(MASK_PLACEHOLDER)
  })
})

describe('page mask behavior without a browser document', () => {
  it('does not mask text marked as an editable field', () => {
    expect(
      isUserTypingContext({ tagName: 'input', inEditableField: false, contentEditable: false }),
    ).toBe(true)
    expect(
      isUserTypingContext({ tagName: 'div', inEditableField: false, contentEditable: true }),
    ).toBe(true)
    expect(
      isUserTypingContext({ tagName: 'p', inEditableField: true, contentEditable: false }),
    ).toBe(true)
    expect(
      isUserTypingContext({ tagName: 'p', inEditableField: false, contentEditable: false }),
    ).toBe(false)

    const page = new PageMask(fixtures)
    page.setEnabled(true)
    page.upsert('field', 'zorblat квандол', true)
    expect(page.visible('field')).toBe('zorblat квандол')
    expect(page.maskPlaceholders('field')).toEqual([])
  })

  it('masks text added after the first pass and restores it when the setting turns off', () => {
    const page = new PageMask(fixtures)
    page.setEnabled(true)
    page.upsert('static', 'Already zorblat visible', false)
    expect(page.visible('static')).toBe(`Already ${MASK_PLACEHOLDER} visible`)

    page.upsert('dynamic', 'Later квандол arrived', false)
    expect(page.visible('dynamic')).toBe(`Later ${MASK_PLACEHOLDER} arrived`)
    expect(page.maskPlaceholders('dynamic')).toEqual([MASK_PLACEHOLDER])
    expect(page.original('dynamic')).toBe('Later квандол arrived')
    expect(page.visible('dynamic').includes('квандол')).toBe(false)

    page.setEnabled(false)
    expect(page.visible('static')).toBe('Already zorblat visible')
    expect(page.visible('dynamic')).toBe('Later квандол arrived')
    expect(page.maskPlaceholders('static')).toEqual([])
  })

  it('does not run on extension pages or other browser-internal urls', () => {
    const pages = [
      'chrome-extension://abc/src/popup/index.html',
      'chrome-extension://abc/src/options/index.html',
      'chrome-extension://abc/src/blocked/index.html',
      'chrome-extension://abc/src/unlock/index.html',
      'chrome://extensions',
      'edge://settings',
      'about:blank',
      'file:///tmp/page.html',
    ]
    for (const url of pages) {
      expect(shouldRunWordMask(url, true)).toBe(false)
    }
    expect(shouldRunWordMask('https://example.com/story', true)).toBe(true)
    expect(shouldRunWordMask('http://example.com/frame', false)).toBe(true)
    expect(shouldRunWordMask('about:blank', false)).toBe(true)
    expect(shouldRunWordMask('about:srcdoc', false)).toBe(true)
  })
})

describe('production dictionaries', () => {
  it('stores inflections and both Kazakh scripts without masking ordinary sentences', () => {
    expect(adultDictionaries.ru.some((entry) => entry.forms.length > 1)).toBe(true)
    expect(adultDictionaries.en.some((entry) => entry.forms.length > 1)).toBe(true)
    expect(adultDictionaries.kk.length).toBeGreaterThan(0)
    for (const entry of adultDictionaries.kk) {
      expect(entry.forms.some((form) => /\p{Script=Cyrillic}/u.test(form))).toBe(true)
      expect(entry.forms.some((form) => /\p{Script=Latin}/u.test(form))).toBe(true)
    }

    let failures = 0
    for (const language of ['ru', 'kk', 'en'] as const) {
      for (const entry of adultDictionaries[language]) {
        for (const form of entry.forms) {
          if (expose(form, adultDictionaries) !== MASK_PLACEHOLDER) failures += 1
          const glued = `${form.replace(/\s+/g, '')}xyz`
          if (expose(glued, adultDictionaries) !== glued) failures += 1
        }
      }
    }
    expect(failures).toBe(0)
  })
})
