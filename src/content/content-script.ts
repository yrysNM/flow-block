import { installAdultWordMask } from './dom-mask'
import { shouldRunWordMask } from './page-policy'

function inTopFrame(): boolean {
  try {
    return window.top === window
  } catch {
    return false
  }
}

if (shouldRunWordMask(window.location.href, inTopFrame())) {
  installAdultWordMask()
}
