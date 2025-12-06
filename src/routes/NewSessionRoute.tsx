/**
 * NewSessionRoute - handles /{configSlug}
 *
 * Prompts user to name their session, then creates and redirects to /{configSlug}/{sessionSlug}
 */

import { useState, useEffect, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { getConfigBySlug } from '@/services/configRegistry'
import { saveSession, listSessionsForConfig } from '@/services/sessionRegistry'
import type { CanvasState } from '@/services/persistence'

export function NewSessionRoute() {
  const { configSlug } = useParams<{ configSlug: string }>()
  const navigate = useNavigate()
  const inputRef = useRef<HTMLInputElement>(null)

  const [sessionName, setSessionName] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [configName, setConfigName] = useState('')
  const [existingSessions, setExistingSessions] = useState<
    { name: string; slug: string }[]
  >([])

  // Load config and existing sessions on mount
  useEffect(() => {
    if (!configSlug) {
      navigate('/', { replace: true })
      return
    }

    const config = getConfigBySlug(configSlug)
    if (!config) {
      navigate('/', {
        replace: true,
        state: { error: `Configuration "${configSlug}" not found` },
      })
      return
    }

    setConfigName(config.name)
    setExistingSessions(
      listSessionsForConfig(configSlug).map((s) => ({
        name: s.name,
        slug: s.slug,
      }))
    )

    // Focus input on mount
    setTimeout(() => inputRef.current?.focus(), 100)
  }, [configSlug, navigate])

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()

    if (!configSlug) return

    const name = sessionName.trim()
    if (!name) {
      setError('Please enter a session name')
      return
    }

    const config = getConfigBySlug(configSlug)
    if (!config) return

    // Create fresh session with initial template from config
    const initialState: CanvasState = {
      cards: [],
      savedCards: [],
      userComposition: config.writingPane?.initialContent ?? '',
    }

    const session = saveSession(configSlug, initialState, name)

    // Redirect to full URL with session slug
    navigate(`/${configSlug}/${session.slug}`, { replace: true })
  }

  const handleSessionClick = (slug: string) => {
    navigate(`/${configSlug}/${slug}`)
  }

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        height: '100vh',
        background: 'linear-gradient(135deg, #1a1a2e 0%, #16213e 100%)',
        color: 'white',
        fontFamily: 'system-ui, sans-serif',
        padding: '2rem',
      }}
    >
      <div style={{ textAlign: 'center', maxWidth: 400, width: '100%' }}>
        <h1
          style={{
            fontSize: '1.5rem',
            fontWeight: 500,
            marginBottom: '0.5rem',
          }}
        >
          {configName || 'New Session'}
        </h1>
        <p style={{ opacity: 0.6, marginBottom: '2rem' }}>
          Name your session to get started
        </p>

        <form onSubmit={handleSubmit}>
          <input
            ref={inputRef}
            type="text"
            value={sessionName}
            onChange={(e) => {
              setSessionName(e.target.value)
              setError(null)
            }}
            placeholder="e.g., Morning Thoughts"
            style={{
              width: '100%',
              padding: '1rem',
              fontSize: '1rem',
              background: 'rgba(255, 255, 255, 0.1)',
              border: error
                ? '1px solid #ef4444'
                : '1px solid rgba(255, 255, 255, 0.2)',
              borderRadius: '0.5rem',
              color: 'white',
              outline: 'none',
              marginBottom: '0.5rem',
            }}
          />
          {error && (
            <p
              style={{
                color: '#ef4444',
                fontSize: '0.85rem',
                marginBottom: '0.5rem',
              }}
            >
              {error}
            </p>
          )}
          <button
            type="submit"
            style={{
              width: '100%',
              padding: '1rem',
              fontSize: '1rem',
              background: 'rgba(99, 102, 241, 0.8)',
              border: 'none',
              borderRadius: '0.5rem',
              color: 'white',
              cursor: 'pointer',
              transition: 'background 0.2s',
            }}
            onMouseOver={(e) =>
              (e.currentTarget.style.background = 'rgba(99, 102, 241, 1)')
            }
            onMouseOut={(e) =>
              (e.currentTarget.style.background = 'rgba(99, 102, 241, 0.8)')
            }
          >
            Create Session
          </button>
        </form>

        {existingSessions.length > 0 && (
          <div style={{ marginTop: '2rem' }}>
            <p
              style={{
                opacity: 0.5,
                fontSize: '0.85rem',
                marginBottom: '0.75rem',
              }}
            >
              Or continue an existing session:
            </p>
            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                gap: '0.5rem',
              }}
            >
              {existingSessions.slice(0, 5).map((session) => (
                <button
                  key={session.slug}
                  onClick={() => handleSessionClick(session.slug)}
                  style={{
                    padding: '0.75rem 1rem',
                    background: 'rgba(255, 255, 255, 0.05)',
                    border: '1px solid rgba(255, 255, 255, 0.1)',
                    borderRadius: '0.5rem',
                    color: 'rgba(255, 255, 255, 0.8)',
                    cursor: 'pointer',
                    textAlign: 'left',
                    transition: 'all 0.2s',
                  }}
                  onMouseOver={(e) => {
                    e.currentTarget.style.background =
                      'rgba(255, 255, 255, 0.1)'
                    e.currentTarget.style.borderColor =
                      'rgba(255, 255, 255, 0.2)'
                  }}
                  onMouseOut={(e) => {
                    e.currentTarget.style.background =
                      'rgba(255, 255, 255, 0.05)'
                    e.currentTarget.style.borderColor =
                      'rgba(255, 255, 255, 0.1)'
                  }}
                >
                  {session.name}
                </button>
              ))}
            </div>
          </div>
        )}

        <button
          onClick={() => navigate('/')}
          style={{
            marginTop: '2rem',
            background: 'none',
            border: 'none',
            color: 'rgba(255, 255, 255, 0.5)',
            cursor: 'pointer',
            fontSize: '0.85rem',
          }}
        >
          ← Back to home
        </button>
      </div>
    </div>
  )
}

export default NewSessionRoute
