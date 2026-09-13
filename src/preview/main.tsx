import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { installChromeMock } from './mock-chrome'
import '../styles/index.css'
import { PreviewApp } from './PreviewApp'

installChromeMock()

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <PreviewApp />
  </StrictMode>,
)
