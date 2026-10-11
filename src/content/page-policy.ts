const WEB_PROTOCOLS = new Set(['http:', 'https:'])

const EDITABLE_TAGS = new Set(['INPUT', 'TEXTAREA'])

export function shouldRunWordMask(url: string, isTopFrame: boolean): boolean {
  let protocol = ''
  try {
    protocol = new URL(url).protocol
  } catch {
    return false
  }

  if (WEB_PROTOCOLS.has(protocol)) return true

  const embeddedBlank =
    !isTopFrame && (url === 'about:blank' || url.startsWith('about:srcdoc'))
  return embeddedBlank
}

export function isUserTypingContext(context: {
  tagName: string
  inEditableField: boolean
  contentEditable: boolean
}): boolean {
  if (EDITABLE_TAGS.has(context.tagName.toUpperCase())) return true
  return context.inEditableField || context.contentEditable
}
