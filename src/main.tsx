import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import Letty from './Letty.tsx'
import MonthlyTests, { LETICIA_SCHOOL_TESTS_CONFIG } from './MonthlyTests.tsx'
import CommonPage from './CommonPage.tsx'

const path = window.location.pathname.replace(/\/$/, '') || '/'
const isLetty = path === '/l'
const isMonthlyTests = path === '/t'
const isLeticiaSchoolTests = path === '/lt'
const isCommon = path === '/common'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    {isMonthlyTests ? <MonthlyTests /> : isLeticiaSchoolTests ? <MonthlyTests config={LETICIA_SCHOOL_TESTS_CONFIG} /> : isCommon ? <CommonPage /> : isLetty ? <Letty /> : <App />}
  </StrictMode>,
)
