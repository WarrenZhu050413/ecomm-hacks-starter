import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { RouterProvider } from 'react-router-dom'
import { router } from './routes'
import ErrorBoundary from './components/ErrorBoundary'
import { ErrorToastProvider } from './components/ErrorToast'
import { runMigration } from './utils/migration'
import './index.css'

// Run migration on startup (idempotent)
runMigration()

const rootElement = document.getElementById('root')
if (!rootElement) throw new Error('Root element not found')

createRoot(rootElement).render(
  <StrictMode>
    <ErrorBoundary>
      <ErrorToastProvider>
        <RouterProvider router={router} />
      </ErrorToastProvider>
    </ErrorBoundary>
  </StrictMode>
)
