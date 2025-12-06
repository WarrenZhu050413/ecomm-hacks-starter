/**
 * Tests for SessionCostBadge component.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import { SessionCostBadge } from './SessionCostBadge'

// Mock sessionRegistry
vi.mock('@/services/sessionRegistry', () => ({
  getSessionCost: vi.fn(),
}))

import { getSessionCost } from '@/services/sessionRegistry'

describe('SessionCostBadge', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should display cost when session has cost', () => {
    vi.mocked(getSessionCost).mockReturnValue({
      totalCostUsd: 0.0048,
      generationCount: 4,
    })

    render(<SessionCostBadge sessionId="test-session" />)

    expect(screen.getByText(/\$0\.0048/)).toBeInTheDocument()
    expect(screen.getByText(/4 gen/)).toBeInTheDocument()
  })

  it('should not render when session has no cost', () => {
    vi.mocked(getSessionCost).mockReturnValue({
      totalCostUsd: 0,
      generationCount: 0,
    })

    const { container } = render(<SessionCostBadge sessionId="test-session" />)

    expect(container.firstChild).toBeNull()
  })

  it('should not render when session not found', () => {
    vi.mocked(getSessionCost).mockReturnValue(null)

    const { container } = render(<SessionCostBadge sessionId="non-existent" />)

    expect(container.firstChild).toBeNull()
  })

  it('should format cost to 4 decimal places', () => {
    vi.mocked(getSessionCost).mockReturnValue({
      totalCostUsd: 0.00125,
      generationCount: 1,
    })

    render(<SessionCostBadge sessionId="test-session" />)

    expect(screen.getByText(/\$0\.0013/)).toBeInTheDocument()
  })

  it('should use singular "gen" for single generation', () => {
    vi.mocked(getSessionCost).mockReturnValue({
      totalCostUsd: 0.001,
      generationCount: 1,
    })

    render(<SessionCostBadge sessionId="test-session" />)

    expect(screen.getByText(/1 gen/)).toBeInTheDocument()
  })
})
