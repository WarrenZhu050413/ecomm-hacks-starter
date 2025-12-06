/**
 * App component - kept for backwards compatibility with tests.
 * The actual app uses routing via main.tsx + routes/index.tsx
 */

import ErrorBoundary from './components/ErrorBoundary'
import { ErrorToastProvider } from './components/ErrorToast'
import OnboardingFlow from './components/OnboardingFlow'

export default function App() {
  return (
    <ErrorBoundary>
      <ErrorToastProvider>
        <OnboardingFlow />
      </ErrorToastProvider>
    </ErrorBoundary>
  )
}
