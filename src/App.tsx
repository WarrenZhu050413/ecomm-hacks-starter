/**
 * App component - kept for backwards compatibility.
 * The actual app uses routing via main.tsx + routes/index.tsx
 */

import ErrorBoundary from './components/ErrorBoundary'
import { ErrorToastProvider } from './components/ErrorToast'
import GenerativeGallery from './components/GenerativeGallery'

export default function App() {
  return (
    <ErrorBoundary>
      <ErrorToastProvider>
        <GenerativeGallery />
      </ErrorToastProvider>
    </ErrorBoundary>
  )
}
