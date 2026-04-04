import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import Letty from './Letty.tsx'

const path = window.location.pathname.replace(/\/$/, '') || '/'
const isLetty = path === '/l'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    {isLetty ? <Letty /> : <App />}
  </StrictMode>,
)
