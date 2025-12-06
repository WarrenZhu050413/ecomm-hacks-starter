/**
 * OnboardingFlow - Welcome screen with custom conversation
 *
 * Features:
 * - Custom conversation flow with AI to create canvas
 * - Save/load custom configurations via configRegistry
 * - URL-based navigation to canvas
 */

import { useState, useEffect, useRef } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import {
  onboardChat,
  ApiError,
  type CanvasConfig,
  type OnboardMessage,
} from '@/services/api'
import {
  saveConfig,
  listConfigs,
  deleteConfig,
  type SavedConfigWithSlug,
} from '@/services/configRegistry'
import './Onboarding.css'

type ViewState = 'initial' | 'conversation' | 'preview'

export default function OnboardingFlow() {
  const navigate = useNavigate()
  const location = useLocation()

  const [view, setView] = useState<ViewState>('initial')
  const [messages, setMessages] = useState<OnboardMessage[]>([])
  const [sessionId, setSessionId] = useState<string | null>(null)
  const [inputValue, setInputValue] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [generatedConfig, setGeneratedConfig] = useState<CanvasConfig | null>(
    null
  )
  const [savedConfigs, setSavedConfigs] = useState<SavedConfigWithSlug[]>([])
  const [backendError, setBackendError] = useState<string | null>(null)
  const [deleteConfirmSlug, setDeleteConfirmSlug] = useState<string | null>(
    null
  )
  const inputRef = useRef<HTMLInputElement>(null)

  // Show error from redirect state (e.g., config not found)
  useEffect(() => {
    if (location.state?.error) {
      setBackendError(location.state.error)
      // Clear the error from location state
      window.history.replaceState({}, document.title)
    }
  }, [location.state])

  // Load saved configs from configRegistry on mount
  useEffect(() => {
    setSavedConfigs(listConfigs())
  }, [])

  const handleSavedConfigSelect = (saved: SavedConfigWithSlug) => {
    // Navigate to the config's slug - NewSessionRoute will create a session
    navigate(`/${saved.slug}`)
  }

  const handleDeleteConfig = (slug: string) => {
    deleteConfig(slug)
    setSavedConfigs(listConfigs())
    setDeleteConfirmSlug(null)
  }

  const handleStartCustom = () => {
    setView('conversation')
    setSessionId(null) // Reset session for new conversation
    setMessages([
      {
        role: 'assistant',
        content:
          'What kind of creative space would you like to explore? Describe the ideas, themes, or content you want to work with.',
      },
    ])
    setTimeout(() => inputRef.current?.focus(), 100)
  }

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!inputValue.trim() || isLoading) return

    const userMessage = inputValue.trim()
    setInputValue('')
    setIsLoading(true)

    // Add user message to display
    const newMessages: OnboardMessage[] = [
      ...messages,
      { role: 'user', content: userMessage },
    ]
    setMessages(newMessages)

    try {
      setBackendError(null) // Clear any previous error
      // Session history is managed server-side - just pass session_id
      const response = await onboardChat(userMessage, sessionId ?? undefined)

      // Store session_id for subsequent requests
      setSessionId(response.session_id)

      if (response.type === 'question') {
        // Continue conversation
        setMessages([
          ...newMessages,
          { role: 'assistant', content: response.content as string },
        ])
      } else if (response.type === 'config') {
        // Config generated!
        const config = response.content as CanvasConfig
        setGeneratedConfig(config)
        setView('preview')
      }
    } catch (error) {
      console.error('Onboard chat failed:', error)

      // Use ApiError for better error messages
      const errorMessage =
        error instanceof ApiError
          ? error.userMessage
          : error instanceof Error
            ? error.message
            : 'Unknown error'

      setBackendError(errorMessage)

      // Show more detailed error in assistant message
      const displayMessage =
        error instanceof ApiError && error.isNetworkError
          ? "I couldn't reach the server. Please check that the backend is running."
          : error instanceof ApiError
            ? `Error: ${error.userMessage}`
            : `Something went wrong: ${errorMessage}`

      setMessages([
        ...newMessages,
        {
          role: 'assistant',
          content: displayMessage,
        },
      ])
    }

    setIsLoading(false)
  }

  const handleSaveConfig = () => {
    if (!generatedConfig) return

    try {
      const slug = saveConfig(generatedConfig)
      setSavedConfigs(listConfigs())
      // Update the generated config with its slug
      setGeneratedConfig({ ...generatedConfig, slug })
    } catch (e) {
      console.error('Failed to save config:', e)
      setBackendError(e instanceof Error ? e.message : 'Failed to save')
    }
  }

  const handleStartCanvas = () => {
    if (!generatedConfig) return

    // If config has a slug (saved), navigate to it
    if (generatedConfig.slug) {
      navigate(`/${generatedConfig.slug}`)
    } else {
      // Save first, then navigate
      const slug = saveConfig(generatedConfig)
      navigate(`/${slug}`)
    }
  }

  // Render saved configs section
  const renderSavedConfigs = () => {
    if (savedConfigs.length === 0) return null

    return (
      <div className="saved-configs">
        <div className="saved-configs-header">Your Saved Spaces</div>
        <div className="saved-configs-list">
          {savedConfigs.map((saved) => (
            <div key={saved.slug} className="saved-config-item-container">
              {deleteConfirmSlug === saved.slug ? (
                <div className="delete-confirm">
                  <span>Delete "{saved.config.name}"?</span>
                  <button
                    className="delete-confirm-btn yes"
                    onClick={() => handleDeleteConfig(saved.slug)}
                  >
                    Yes
                  </button>
                  <button
                    className="delete-confirm-btn no"
                    onClick={() => setDeleteConfirmSlug(null)}
                  >
                    No
                  </button>
                </div>
              ) : (
                <>
                  <button
                    className="saved-config-item"
                    onClick={() => handleSavedConfigSelect(saved)}
                  >
                    {saved.config.name}
                  </button>
                  <button
                    className="delete-config-btn"
                    onClick={(e) => {
                      e.stopPropagation()
                      setDeleteConfirmSlug(saved.slug)
                    }}
                    title="Delete"
                  >
                    ×
                  </button>
                </>
              )}
            </div>
          ))}
        </div>
      </div>
    )
  }

  // Initial view - show saved configs or start conversation
  if (view === 'initial') {
    return (
      <div className="onboarding-container">
        <div className="onboarding-content">
          <h1 className="onboarding-title">Welcome to Ephemeral</h1>
          <p className="onboarding-question-text">
            Create your own creative space
          </p>

          {backendError && (
            <div className="error-banner" role="alert">
              <span className="error-icon">⚠️</span>
              <span className="error-text">{backendError}</span>
              <button
                className="error-dismiss"
                onClick={() => setBackendError(null)}
                aria-label="Dismiss error"
              >
                ×
              </button>
            </div>
          )}

          <div className="onboarding-options">
            <button
              className="onboarding-option custom-option"
              onClick={handleStartCustom}
              disabled={isLoading}
            >
              <span className="option-label">Create New Space</span>
              <span className="option-description">
                Describe your vision and I&apos;ll help create your space.
              </span>
            </button>
          </div>

          {renderSavedConfigs()}
        </div>
      </div>
    )
  }

  // Conversation view
  if (view === 'conversation') {
    return (
      <div className="onboarding-container">
        <div className="onboarding-content conversation-content">
          <h1 className="onboarding-title">Create Your Space</h1>

          {backendError && (
            <div className="error-banner" role="alert">
              <span className="error-icon">⚠️</span>
              <span className="error-text">{backendError}</span>
              <button
                className="error-dismiss"
                onClick={() => setBackendError(null)}
                aria-label="Dismiss error"
              >
                ×
              </button>
            </div>
          )}

          <div className="conversation-messages">
            {messages.map((msg, i) => (
              <div
                key={i}
                className={`message ${msg.role === 'user' ? 'user-message' : 'assistant-message'}`}
              >
                {msg.content}
              </div>
            ))}
            {isLoading && (
              <div className="message assistant-message loading">
                Thinking...
              </div>
            )}
          </div>

          <form
            className="conversation-input-form"
            onSubmit={handleSendMessage}
          >
            <input
              ref={inputRef}
              type="text"
              className="conversation-input"
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              placeholder="Describe what you want to explore..."
            />
            <button
              type="submit"
              className="conversation-submit"
              disabled={isLoading || !inputValue.trim()}
            >
              Send
            </button>
          </form>

          <button className="back-button" onClick={() => setView('initial')}>
            ← Back
          </button>
        </div>
      </div>
    )
  }

  // Preview view
  if (view === 'preview' && generatedConfig) {
    return (
      <div className="onboarding-container">
        <div className="onboarding-content preview-content">
          <h1 className="onboarding-title">Your Space is Ready</h1>

          <div className="config-preview">
            <h2 className="preview-name">{generatedConfig.name}</h2>
            {generatedConfig.hintText && (
              <p className="preview-description">{generatedConfig.hintText}</p>
            )}

            <div className="preview-details">
              <div className="preview-field">
                <span className="preview-label">Fields:</span>
                <span className="preview-value">
                  {generatedConfig.cardSchema.fields
                    .map((f) => f.name)
                    .join(', ')}
                </span>
              </div>
              <div className="preview-field">
                <span className="preview-label">Physics:</span>
                <span className="preview-value">
                  {generatedConfig.physics.cardLifetime}s lifetime,{' '}
                  {generatedConfig.physics.driftSpeed}x drift
                </span>
              </div>
            </div>

            <div className="preview-seed">
              <div className="preview-label">Sample Content:</div>
              {generatedConfig.seedContent.slice(0, 2).map((card, i) => (
                <div key={i} className="preview-card">
                  {Object.entries(card).map(
                    ([key, value]) =>
                      value && (
                        <span key={key} className="preview-card-field">
                          {value}{' '}
                        </span>
                      )
                  )}
                </div>
              ))}
            </div>
          </div>

          <div className="preview-actions">
            <button
              className="preview-action-button primary"
              onClick={handleStartCanvas}
            >
              Start Exploring
            </button>
            <button
              className="preview-action-button secondary"
              onClick={handleSaveConfig}
            >
              Save This Space
            </button>
          </div>

          <button
            className="back-button"
            onClick={() => setView('conversation')}
          >
            ← Back to customize
          </button>
        </div>
      </div>
    )
  }

  return null
}
