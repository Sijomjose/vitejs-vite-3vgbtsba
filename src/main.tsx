import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import Letty from './Letty.tsx'
import MonthlyTests from './MonthlyTests.tsx'
import CommonPage from './CommonPage.tsx'

const path = window.location.pathname.replace(/\/$/, '') || '/'
const isLetty = path === '/l'
const isMonthlyTests = path === '/t'
const isCommon = path === '/common'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    {isMonthlyTests ? <MonthlyTests /> : isCommon ? <CommonPage /> : isLetty ? <Letty /> : <App />}
  </StrictMode>,
)
