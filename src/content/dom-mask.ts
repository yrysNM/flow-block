import { adultDictionaries } from './dictionaries'
import { MASK_PLACEHOLDER, renderExposed, segmentText } from './match'
import { PageMask } from './page-mask'
import { isUserTypingContext } from './page-policy'
import { getSettings, subscribeToSettings } from '../shared/storage'

const SKIP_WALK = new Set(['SCRIPT', 'STYLE', 'NOSCRIPT', 'TEMPLATE', 'IFRAME'])

const TEXT_ALTERNATIVES = [
  'alt',
  'title',
  'placeholder',
  'aria-label',
  'aria-placeholder',
  'aria-valuetext',
  'aria-description',
  'aria-roledescription',
] as const

const HTML_NS = 'http://www.w3.org/1999/xhtml'
const STYLE_ID = 'wb-word-mask-style'
const OWN_TEXT = Symbol('wb-own-text')

const MASK_CSS = `
.wb-word-mask {
  background: repeating-linear-gradient(-45deg, #a8a29e, #a8a29e 2px, #57534e 2px, #57534e 4px);
  box-shadow: inset 0 0 0 1px #292524;
  color: transparent;
  border-radius: 0.2em;
  user-select: none;
  -webkit-user-select: none;
  display: inline-block;
  vertical-align: baseline;
  line-height: 1;
  min-width: 0.9em;
  height: 0.85em;
  margin: 0 0.05em;
  pointer-events: none;
}
`

type StampedText = Text & { [OWN_TEXT]?: boolean }

interface MaskedRange {
  id: string
  nodes: Node[]
}

function isTypingTarget(element: Element): boolean {
  const host = element.closest(
    'input, textarea, [contenteditable="true"], [contenteditable=""], [contenteditable="plaintext-only"]',
  )
  return isUserTypingContext({
    tagName: element.tagName,
    inEditableField: host !== null,
    contentEditable: element instanceof HTMLElement && element.isContentEditable,
  })
}

export function installAdultWordMask(): void {
  if (typeof document === 'undefined' || !document.documentElement) return

  const page = new PageMask(adultDictionaries)
  const ranges: MaskedRange[] = []
  const attributeIds = new Map<Element, Map<string, string>>()
  const observed = new WeakSet<Node>()
  let enabled = false
  let seq = 0
  let applying = false

  const nextId = (prefix: string) => `${prefix}${seq++}`

  function ensureStyle(): void {
    if (document.getElementById(STYLE_ID)) return
    const style = document.createElement('style')
    style.id = STYLE_ID
    style.textContent = MASK_CSS
    ;(document.head ?? document.documentElement).append(style)
  }

  function watch(root: Node): void {
    if (observed.has(root)) return
    observed.add(root)
    observer.observe(root, {
      subtree: true,
      childList: true,
      characterData: true,
      attributes: true,
      attributeFilter: [...TEXT_ALTERNATIVES],
    })
  }

  function rememberAttribute(element: Element, name: string, id: string): void {
    const map = attributeIds.get(element) ?? new Map<string, string>()
    map.set(name, id)
    attributeIds.set(element, map)
  }

  function maskAttributes(element: Element): void {
    if (SKIP_WALK.has(element.tagName) || element.classList.contains('wb-word-mask')) return

    for (const name of TEXT_ALTERNATIVES) {
      if (!element.hasAttribute(name)) continue
      const current = element.getAttribute(name) ?? ''
      const known = attributeIds.get(element)?.get(name)
      let source = current
      if (known) {
        const stored = page.original(known)
        if (stored !== undefined) {
          const masked = renderExposed(stored, {
            enabled: true,
            editable: false,
            dictionaries: adultDictionaries,
          })
          if (current === stored || current === masked) source = stored
        }
      }
      if (!segmentText(source, adultDictionaries).some((segment) => segment.type === 'mask')) {
        continue
      }

      const id = known ?? nextId('a')
      page.upsert(id, source, false)
      if (!known) rememberAttribute(element, name, id)
      if (!enabled) continue
      const visible = page.visible(id)
      if (visible !== current) {
        applying = true
        element.setAttribute(name, visible)
        applying = false
      }
    }
  }

  function maskText(node: Text): void {
    if ((node as StampedText)[OWN_TEXT]) return
    const parent = node.parentElement
    if (!parent) return
    if (parent.closest('.wb-word-mask, script, style, noscript, template, iframe')) return
    if (isTypingTarget(parent)) return

    const original = node.nodeValue ?? ''
    if (!original) return
    const segments = segmentText(original, adultDictionaries)
    if (!segments.some((segment) => segment.type === 'mask')) return
    if (!node.isConnected) return

    const id = nextId('t')
    page.upsert(id, original, false)

    applying = true
    try {
      if (parent.namespaceURI !== HTML_NS) {
        node.nodeValue = page.visible(id)
        ;(node as StampedText)[OWN_TEXT] = true
        ranges.push({ id, nodes: [node] })
        return
      }

      const nodes: Node[] = []
      const fragment = document.createDocumentFragment()
      for (const segment of segments) {
        if (segment.type === 'text') {
          if (!segment.text) continue
          const text = document.createTextNode(segment.text) as StampedText
          text[OWN_TEXT] = true
          fragment.append(text)
          nodes.push(text)
          continue
        }
        const mask = document.createElement('span')
        mask.className = 'wb-word-mask'
        mask.setAttribute('aria-hidden', 'true')
        mask.textContent = MASK_PLACEHOLDER
        const hidden = mask.firstChild
        if (hidden instanceof Text) (hidden as StampedText)[OWN_TEXT] = true
        fragment.append(mask)
        nodes.push(mask)
      }
      parent.replaceChild(fragment, node)
      ranges.push({ id, nodes })
    } finally {
      applying = false
    }
  }

  function scanChildren(node: Node): void {
    for (const child of [...node.childNodes]) scanNode(child)
  }

  function scanNode(node: Node): void {
    if (node instanceof Text) {
      maskText(node)
      return
    }
    if (node instanceof Element) {
      if (node.classList.contains('wb-word-mask') || SKIP_WALK.has(node.tagName)) return
      maskAttributes(node)
      if (node.shadowRoot) {
        watch(node.shadowRoot)
        scanChildren(node.shadowRoot)
      }
      if (isTypingTarget(node)) return
    }
    scanChildren(node)
  }

  function scanDocument(): void {
    ensureStyle()
    if (document.documentElement) watch(document.documentElement)
    scanChildren(document.documentElement)
  }

  function restore(): void {
    applying = true
    try {
      for (const range of ranges) {
        const original = page.original(range.id)
        if (original === undefined) continue
        const anchor = range.nodes.find((item) => item.isConnected)
        const parent = anchor?.parentNode
        if (!anchor || !parent) continue
        if (
          anchor instanceof Text &&
          range.nodes.length === 1 &&
          anchor.parentElement?.namespaceURI !== HTML_NS
        ) {
          anchor.nodeValue = original
          ;(anchor as StampedText)[OWN_TEXT] = false
          continue
        }
        const text = document.createTextNode(original)
        parent.insertBefore(text, anchor)
        for (const item of range.nodes) item.parentNode?.removeChild(item)
      }
      ranges.length = 0

      for (const [element, attrs] of attributeIds) {
        if (!element.isConnected) continue
        for (const [name, id] of attrs) {
          const original = page.original(id)
          if (original !== undefined) element.setAttribute(name, original)
        }
      }
      attributeIds.clear()
    } finally {
      applying = false
    }
  }

  function setEnabled(next: boolean): void {
    if (next === enabled) return
    enabled = next
    page.setEnabled(next)
    if (next) scanDocument()
    else restore()
  }

  const observer = new MutationObserver((mutations) => {
    if (!enabled || applying) return
    for (const mutation of mutations) {
      if (mutation.type === 'childList') {
        mutation.addedNodes.forEach((node) => scanNode(node))
      } else if (mutation.type === 'characterData' && mutation.target instanceof Text) {
        maskText(mutation.target)
      } else if (mutation.type === 'attributes' && mutation.target instanceof Element) {
        maskAttributes(mutation.target)
      }
    }
  })

  if (document.documentElement) watch(document.documentElement)

  void getSettings()
    .then((settings) => {
      if (settings.hideAdultWording) setEnabled(true)
      subscribeToSettings((next) => {
        setEnabled(next.hideAdultWording)
      })
    })
    .catch(() => {
      // Leave the page unchanged when settings cannot be read.
    })
}
