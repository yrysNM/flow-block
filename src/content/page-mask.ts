import { renderExposed, segmentText, MASK_PLACEHOLDER } from './match'
import type { AdultDictionaries, TextSegment } from './match'

interface RecordedText {
  original: string
  editable: boolean
}

/** In-memory record of page text. Original wording stays here, not in the DOM. */
export class PageMask {
  private enabled = false
  private readonly records = new Map<string, RecordedText>()

  constructor(private readonly dictionaries: AdultDictionaries) {}

  setEnabled(enabled: boolean): void {
    this.enabled = enabled
  }

  upsert(id: string, original: string, editable: boolean): void {
    this.records.set(id, { original, editable })
  }

  visible(id: string): string {
    const record = this.records.get(id)
    if (!record) return ''
    return renderExposed(record.original, {
      enabled: this.enabled,
      editable: record.editable,
      dictionaries: this.dictionaries,
    })
  }

  segments(id: string): TextSegment[] {
    const record = this.records.get(id)
    if (!record) return []
    if (!this.enabled || record.editable) return [{ type: 'text', text: record.original }]
    return segmentText(record.original, this.dictionaries)
  }

  /** What copying a masked span yields. Empty when the wording is not masked. */
  maskPlaceholders(id: string): string[] {
    return this.segments(id)
      .filter((segment) => segment.type === 'mask')
      .map(() => MASK_PLACEHOLDER)
  }

  original(id: string): string | undefined {
    return this.records.get(id)?.original
  }
}
