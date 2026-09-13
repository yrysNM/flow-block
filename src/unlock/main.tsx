import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import '../styles/index.css'
import { applyTheme } from '../shared/theme'
import { getSettings } from '../shared/storage'
import { UnlockPage } from './UnlockPage'

applyTheme('system')
void getSettings()
  .then((settings) => applyTheme(settings.theme))
  .catch(() => undefined)

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <UnlockPage />
  </StrictMode>,
)
