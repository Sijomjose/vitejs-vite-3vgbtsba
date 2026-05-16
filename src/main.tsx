import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import Letty from './Letty.tsx'
import MonthlyTests from './MonthlyTests.tsx'

const path = window.location.pathname.replace(/\/$/, '') || '/'
const isLetty = path === '/l'
const isMonthlyTests = path === '/t'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    {isMonthlyTests ? <MonthlyTests /> : isLetty ? <Letty /> : <App />}
  </StrictMode>,
)
