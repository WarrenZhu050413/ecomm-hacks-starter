/**
 * Tests for ErrorBoundary component
 */

import { render, screen, fireEvent } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import ErrorBoundary from './ErrorBoundary'

// Component that throws an error for testing
function ThrowError({ shouldThrow }: { shouldThrow: boolean }) {
  if (shouldThrow) {
    throw new Error('Test error message')
  }
  return <div>Normal content</div>
}

// Suppress console.error during error boundary tests
beforeEach(() => {
  vi.spyOn(console, 'error').mockImplementation(() => {})
})

afterEach(() => {
  vi.restoreAllMocks()
})

describe('ErrorBoundary', () => {
  describe('Normal Operation', () => {
    it('should render children when no error', () => {
      render(
        <ErrorBoundary>
          <div>Child content</div>
        </ErrorBoundary>
      )

      expect(screen.getByText('Child content')).toBeInTheDocument()
    })

    it('should not show error UI when no error', () => {
      render(
        <ErrorBoundary>
          <div>Normal content</div>
        </ErrorBoundary>
      )

      expect(screen.queryByText('Something went wrong')).not.toBeInTheDocument()
    })
  })

  describe('Error Handling', () => {
    it('should catch render errors and show fallback UI', () => {
      render(
        <ErrorBoundary>
          <ThrowError shouldThrow={true} />
        </ErrorBoundary>
      )

      expect(screen.getByText('Something went wrong')).toBeInTheDocument()
    })

    it('should display error message from caught error', () => {
      render(
        <ErrorBoundary>
          <ThrowError shouldThrow={true} />
        </ErrorBoundary>
      )

      expect(screen.getByText('Test error message')).toBeInTheDocument()
    })

    it('should show warning icon', () => {
      render(
        <ErrorBoundary>
          <ThrowError shouldThrow={true} />
        </ErrorBoundary>
      )

      expect(screen.getByText('⚠️')).toBeInTheDocument()
    })

    it('should show Try Again button', () => {
      render(
        <ErrorBoundary>
          <ThrowError shouldThrow={true} />
        </ErrorBoundary>
      )

      expect(
        screen.getByRole('button', { name: /try again/i })
      ).toBeInTheDocument()
    })

    it('should show Reload Page button', () => {
      render(
        <ErrorBoundary>
          <ThrowError shouldThrow={true} />
        </ErrorBoundary>
      )

      expect(
        screen.getByRole('button', { name: /reload page/i })
      ).toBeInTheDocument()
    })

    it('should log error to console via componentDidCatch', () => {
      render(
        <ErrorBoundary>
          <ThrowError shouldThrow={true} />
        </ErrorBoundary>
      )

      expect(console.error).toHaveBeenCalled()
    })
  })

  describe('Recovery', () => {
    it('should reset error state and render children when Try Again is clicked', () => {
      // Use a flag that gets toggled after error boundary catches first error
      let shouldThrow = true

      function ConditionalThrowError() {
        if (shouldThrow) {
          throw new Error('Test error')
        }
        return <div>Recovered content</div>
      }

      render(
        <ErrorBoundary>
          <ConditionalThrowError />
        </ErrorBoundary>
      )

      // First render threw, should show error
      expect(screen.getByText('Something went wrong')).toBeInTheDocument()

      // Now disable throwing for next render
      shouldThrow = false

      // Click Try Again - this should trigger another render attempt
      fireEvent.click(screen.getByRole('button', { name: /try again/i }))

      // Second render should succeed since shouldThrow is now false
      expect(screen.getByText('Recovered content')).toBeInTheDocument()
      expect(screen.queryByText('Something went wrong')).not.toBeInTheDocument()
    })

    it('should call window.location.reload when Reload Page is clicked', () => {
      const reloadMock = vi.fn()
      Object.defineProperty(window, 'location', {
        value: { reload: reloadMock },
        writable: true,
      })

      render(
        <ErrorBoundary>
          <ThrowError shouldThrow={true} />
        </ErrorBoundary>
      )

      fireEvent.click(screen.getByRole('button', { name: /reload page/i }))

      expect(reloadMock).toHaveBeenCalled()
    })
  })

  describe('Custom Fallback', () => {
    it('should render custom fallback when provided', () => {
      render(
        <ErrorBoundary fallback={<div>Custom error message</div>}>
          <ThrowError shouldThrow={true} />
        </ErrorBoundary>
      )

      expect(screen.getByText('Custom error message')).toBeInTheDocument()
      expect(screen.queryByText('Something went wrong')).not.toBeInTheDocument()
    })
  })

  describe('Error Boundary CSS Classes', () => {
    it('should have error-boundary class on container', () => {
      render(
        <ErrorBoundary>
          <ThrowError shouldThrow={true} />
        </ErrorBoundary>
      )

      expect(document.querySelector('.error-boundary')).toBeInTheDocument()
    })

    it('should have error-boundary-content class', () => {
      render(
        <ErrorBoundary>
          <ThrowError shouldThrow={true} />
        </ErrorBoundary>
      )

      expect(
        document.querySelector('.error-boundary-content')
      ).toBeInTheDocument()
    })

    it('should have error-boundary-actions for buttons', () => {
      render(
        <ErrorBoundary>
          <ThrowError shouldThrow={true} />
        </ErrorBoundary>
      )

      expect(
        document.querySelector('.error-boundary-actions')
      ).toBeInTheDocument()
    })
  })

  describe('Default Error Message', () => {
    it('should show default message when error has no message', () => {
      // Component that throws error without message
      function ThrowEmptyError(): React.ReactNode {
        throw new Error()
      }

      render(
        <ErrorBoundary>
          <ThrowEmptyError />
        </ErrorBoundary>
      )

      expect(
        screen.getByText('An unexpected error occurred')
      ).toBeInTheDocument()
    })
  })
})
