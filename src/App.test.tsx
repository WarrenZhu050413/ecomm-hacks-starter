import { render, screen } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'
import { MemoryRouter } from 'react-router-dom'
import App from './App'

// Mock React Router's hooks
vi.mock('react-router-dom', async (importOriginal) => {
  const actual = await importOriginal<typeof import('react-router-dom')>()
  return {
    ...actual,
    useNavigate: () => vi.fn(),
    useLocation: () => ({ state: null }),
  }
})

// Mock configRegistry
vi.mock('@/services/configRegistry', () => ({
  listConfigs: vi.fn(() => []),
}))

describe('App', () => {
  it('renders the onboarding screen', () => {
    render(
      <MemoryRouter>
        <App />
      </MemoryRouter>
    )
    expect(screen.getByText('Welcome to Ephemeral')).toBeInTheDocument()
  })

  it('shows create new space option', () => {
    render(
      <MemoryRouter>
        <App />
      </MemoryRouter>
    )
    expect(screen.getByText('Create New Space')).toBeInTheDocument()
  })
})
