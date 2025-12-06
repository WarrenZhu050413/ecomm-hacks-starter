/**
 * Tests for OnboardingFlow component
 *
 * Features tested:
 * - Custom conversation flow with onboardChat
 * - Config preview and start button
 * - Save to configRegistry functionality
 * - Navigation via React Router
 */

import {
  render,
  screen,
  fireEvent,
  waitFor,
  within,
} from '@testing-library/react'
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { MemoryRouter } from 'react-router-dom'
import OnboardingFlow from './OnboardingFlow'
import * as api from '@/services/api'
import * as configRegistry from '@/services/configRegistry'

// Mock React Router's useNavigate
const mockNavigate = vi.fn()
vi.mock('react-router-dom', async (importOriginal) => {
  const actual = await importOriginal<typeof import('react-router-dom')>()
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  }
})

// Mock the API module - include ApiError class for instanceof checks
vi.mock('@/services/api', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/services/api')>()
  return {
    ...actual,
    onboardChat: vi.fn(),
  }
})

// Mock the configRegistry module
vi.mock('@/services/configRegistry', () => ({
  saveConfig: vi.fn(() => 'poetry-canvas'),
  getConfigBySlug: vi.fn(),
  listConfigs: vi.fn(() => []),
  deleteConfig: vi.fn(),
}))

beforeEach(() => {
  vi.clearAllMocks()
})

afterEach(() => {
  vi.resetAllMocks()
})

const mockConfig: api.CanvasConfig = {
  name: 'Poetry Canvas',
  hintText: 'Drag to combine',
  cardSchema: {
    fields: [
      { name: 'text', type: 'string', display: 'primary' },
      { name: 'poet', type: 'string', display: 'meta' },
    ],
  },
  cardTheme: {
    container: 'bg-black/30 backdrop-blur-md rounded-xl',
    primary: 'text-lg text-white',
    secondary: 'text-base text-white/60',
    meta: 'text-sm text-white/45',
    dragging: 'opacity-80 scale-105',
  },
  canvasTheme: {
    background: '#000',
    accent: '#fbbf24',
  },
  generationContext: 'Generate poetry',
  directives: [
    'Explore something unexpected',
    'Go deeper into themes',
    'Introduce contrast',
    'Focus on detail',
    'Draw from different traditions',
  ],
  seedContent: [{ text: 'Sample poem', poet: 'AI' }],
  physics: {
    cardLifetime: 30,
    driftSpeed: 1.0,
    jiggle: 1.0,
    bounce: 0.5,
  },
  models: {
    generation: 'flash',
    chat: 'flash',
    onboarding: 'pro',
  },
  spawning: {
    intervalSeconds: 8,
    minCards: 4,
  },
}

// Helper to render with router
function renderWithRouter(ui: React.ReactElement) {
  return render(<MemoryRouter>{ui}</MemoryRouter>)
}

describe('OnboardingFlow', () => {
  describe('Initial View', () => {
    it('should render welcome message', () => {
      renderWithRouter(<OnboardingFlow />)
      expect(screen.getByText('Welcome to Ephemeral')).toBeInTheDocument()
    })

    it('should show Create New Space option', () => {
      renderWithRouter(<OnboardingFlow />)
      expect(
        screen.getByRole('button', { name: /create|new/i })
      ).toBeInTheDocument()
    })
  })

  describe('Custom Conversation Flow', () => {
    it('should enter conversation mode when Create Custom is clicked', async () => {
      renderWithRouter(<OnboardingFlow />)

      const customButton = screen.getByRole('button', {
        name: /custom|create/i,
      })
      fireEvent.click(customButton)

      await waitFor(() => {
        // Should show input field for conversation
        expect(
          screen.getByPlaceholderText(/describe|what|tell/i)
        ).toBeInTheDocument()
      })
    })

    it('should call onboardChat when user sends message', async () => {
      const onboardChatMock = vi.mocked(api.onboardChat)
      onboardChatMock.mockResolvedValue({
        type: 'question',
        content: 'What theme would you like?',
        session_id: 'test-session-123',
      })

      renderWithRouter(<OnboardingFlow />)

      // Enter custom mode
      const customButton = screen.getByRole('button', {
        name: /custom|create/i,
      })
      fireEvent.click(customButton)

      await waitFor(() => {
        const input = screen.getByPlaceholderText(/describe|what|tell/i)
        fireEvent.change(input, {
          target: { value: 'I want poetry about nature' },
        })
        fireEvent.submit(input.closest('form')!)
      })

      await waitFor(() => {
        // First call has no session_id (undefined)
        expect(onboardChatMock).toHaveBeenCalledWith(
          'I want poetry about nature',
          undefined
        )
      })
    })

    it('should display AI responses in conversation', async () => {
      const onboardChatMock = vi.mocked(api.onboardChat)
      onboardChatMock.mockResolvedValue({
        type: 'question',
        content: 'What visual style do you prefer?',
        session_id: 'test-session-123',
      })

      renderWithRouter(<OnboardingFlow />)

      const customButton = screen.getByRole('button', {
        name: /custom|create/i,
      })
      fireEvent.click(customButton)

      await waitFor(() => {
        const input = screen.getByPlaceholderText(/describe|what|tell/i)
        fireEvent.change(input, { target: { value: 'test message' } })
        fireEvent.submit(input.closest('form')!)
      })

      await waitFor(() => {
        expect(screen.getByText(/visual style/i)).toBeInTheDocument()
      })
    })

    it('should show config preview when type is config', async () => {
      const onboardChatMock = vi.mocked(api.onboardChat)
      onboardChatMock.mockResolvedValue({
        type: 'config',
        content: mockConfig,
        session_id: 'test-session-123',
      })

      renderWithRouter(<OnboardingFlow />)

      const customButton = screen.getByRole('button', {
        name: /custom|create/i,
      })
      fireEvent.click(customButton)

      await waitFor(() => {
        const input = screen.getByPlaceholderText(/describe|what|tell/i)
        fireEvent.change(input, { target: { value: 'generate my canvas' } })
        fireEvent.submit(input.closest('form')!)
      })

      await waitFor(() => {
        // Should show the config name as preview
        expect(screen.getByText(/poetry canvas/i)).toBeInTheDocument()
      })
    })
  })

  describe('Config Preview', () => {
    it('should show Start button when config is ready', async () => {
      const onboardChatMock = vi.mocked(api.onboardChat)
      onboardChatMock.mockResolvedValue({
        type: 'config',
        content: mockConfig,
        session_id: 'test-session-123',
      })

      renderWithRouter(<OnboardingFlow />)

      const customButton = screen.getByRole('button', {
        name: /custom|create/i,
      })
      fireEvent.click(customButton)

      await waitFor(() => {
        const input = screen.getByPlaceholderText(/describe|what|tell/i)
        fireEvent.change(input, { target: { value: 'test' } })
        fireEvent.submit(input.closest('form')!)
      })

      await waitFor(() => {
        expect(
          screen.getByRole('button', { name: /start|begin|launch/i })
        ).toBeInTheDocument()
      })
    })

    it('should navigate to canvas when Start is clicked', async () => {
      const onboardChatMock = vi.mocked(api.onboardChat)
      onboardChatMock.mockResolvedValue({
        type: 'config',
        content: mockConfig,
        session_id: 'test-session-123',
      })

      const saveConfigMock = vi.mocked(configRegistry.saveConfig)
      saveConfigMock.mockReturnValue('poetry-canvas')

      renderWithRouter(<OnboardingFlow />)

      const customButton = screen.getByRole('button', {
        name: /custom|create/i,
      })
      fireEvent.click(customButton)

      await waitFor(() => {
        const input = screen.getByPlaceholderText(/describe|what|tell/i)
        fireEvent.change(input, { target: { value: 'test' } })
        fireEvent.submit(input.closest('form')!)
      })

      await waitFor(() => {
        const startButton = screen.getByRole('button', {
          name: /start|begin|launch/i,
        })
        fireEvent.click(startButton)
      })

      await waitFor(() => {
        // Should navigate to the config slug
        expect(mockNavigate).toHaveBeenCalledWith('/poetry-canvas')
      })
    })
  })

  describe('Save Functionality', () => {
    it('should show Save button when config is ready', async () => {
      const onboardChatMock = vi.mocked(api.onboardChat)
      onboardChatMock.mockResolvedValue({
        type: 'config',
        content: mockConfig,
        session_id: 'test-session-123',
      })

      renderWithRouter(<OnboardingFlow />)

      const customButton = screen.getByRole('button', {
        name: /custom|create/i,
      })
      fireEvent.click(customButton)

      await waitFor(() => {
        const input = screen.getByPlaceholderText(/describe|what|tell/i)
        fireEvent.change(input, { target: { value: 'test' } })
        fireEvent.submit(input.closest('form')!)
      })

      await waitFor(() => {
        expect(
          screen.getByRole('button', { name: /save/i })
        ).toBeInTheDocument()
      })
    })

    it('should save config via configRegistry', async () => {
      const onboardChatMock = vi.mocked(api.onboardChat)
      onboardChatMock.mockResolvedValue({
        type: 'config',
        content: mockConfig,
        session_id: 'test-session-123',
      })

      const saveConfigMock = vi.mocked(configRegistry.saveConfig)

      renderWithRouter(<OnboardingFlow />)

      const customButton = screen.getByRole('button', {
        name: /custom|create/i,
      })
      fireEvent.click(customButton)

      await waitFor(() => {
        const input = screen.getByPlaceholderText(/describe|what|tell/i)
        fireEvent.change(input, { target: { value: 'test' } })
        fireEvent.submit(input.closest('form')!)
      })

      await waitFor(() => {
        const saveButton = screen.getByRole('button', { name: /save/i })
        fireEvent.click(saveButton)
      })

      await waitFor(() => {
        expect(saveConfigMock).toHaveBeenCalledWith(mockConfig)
      })
    })
  })

  describe('Saved Configs Display', () => {
    it('should display saved configs from configRegistry', () => {
      const listConfigsMock = vi.mocked(configRegistry.listConfigs)
      listConfigsMock.mockReturnValue([
        {
          slug: 'my-canvas',
          config: { ...mockConfig, name: 'My Canvas' },
          createdAt: Date.now(),
        },
      ])

      renderWithRouter(<OnboardingFlow />)

      expect(screen.getByText(/my canvas/i)).toBeInTheDocument()
    })

    it('should navigate to config when saved config is clicked', async () => {
      const listConfigsMock = vi.mocked(configRegistry.listConfigs)
      listConfigsMock.mockReturnValue([
        {
          slug: 'my-canvas',
          config: { ...mockConfig, name: 'My Canvas' },
          createdAt: Date.now(),
        },
      ])

      renderWithRouter(<OnboardingFlow />)

      const savedButton = screen.getByText(/my canvas/i)
      fireEvent.click(savedButton)

      await waitFor(() => {
        // Should navigate to the config's slug
        expect(mockNavigate).toHaveBeenCalledWith('/my-canvas')
      })
    })
  })

  describe('Error Handling', () => {
    it('should show error banner when backend fails', async () => {
      const onboardChatMock = vi.mocked(api.onboardChat)
      onboardChatMock.mockRejectedValue(
        new api.ApiError('Network error', 0, true)
      )

      renderWithRouter(<OnboardingFlow />)

      // Enter custom mode
      const customButton = screen.getByRole('button', {
        name: /custom|create/i,
      })
      fireEvent.click(customButton)

      await waitFor(() => {
        const input = screen.getByPlaceholderText(/describe|what|tell/i)
        fireEvent.change(input, { target: { value: 'test message' } })
        fireEvent.submit(input.closest('form')!)
      })

      await waitFor(() => {
        expect(screen.getByRole('alert')).toBeInTheDocument()
        expect(
          screen.getByText(/cannot connect to server/i)
        ).toBeInTheDocument()
      })
    })

    it('should show specific error message for API errors', async () => {
      const onboardChatMock = vi.mocked(api.onboardChat)
      onboardChatMock.mockRejectedValue(new Error('LLM rate limit exceeded'))

      renderWithRouter(<OnboardingFlow />)

      const customButton = screen.getByRole('button', {
        name: /custom|create/i,
      })
      fireEvent.click(customButton)

      await waitFor(() => {
        const input = screen.getByPlaceholderText(/describe|what|tell/i)
        fireEvent.change(input, { target: { value: 'test' } })
        fireEvent.submit(input.closest('form')!)
      })

      await waitFor(() => {
        const alert = screen.getByRole('alert')
        expect(
          within(alert).getByText(/LLM rate limit exceeded/i)
        ).toBeInTheDocument()
      })
    })

    it('should dismiss error banner when dismiss button clicked', async () => {
      const onboardChatMock = vi.mocked(api.onboardChat)
      onboardChatMock.mockRejectedValue(
        new api.ApiError('Network error', 0, true)
      )

      renderWithRouter(<OnboardingFlow />)

      const customButton = screen.getByRole('button', {
        name: /custom|create/i,
      })
      fireEvent.click(customButton)

      await waitFor(() => {
        const input = screen.getByPlaceholderText(/describe|what|tell/i)
        fireEvent.change(input, { target: { value: 'test' } })
        fireEvent.submit(input.closest('form')!)
      })

      await waitFor(() => {
        const dismissButton = screen.getByLabelText(/dismiss/i)
        fireEvent.click(dismissButton)
      })

      await waitFor(() => {
        expect(screen.queryByRole('alert')).not.toBeInTheDocument()
      })
    })
  })
})
