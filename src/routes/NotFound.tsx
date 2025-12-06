/**
 * NotFound - 404 page for invalid URLs.
 */

import { useNavigate } from 'react-router-dom'

export function NotFound() {
  const navigate = useNavigate()

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        height: '100vh',
        background: 'linear-gradient(135deg, #1a1a2e 0%, #16213e 100%)',
        color: 'white',
        fontFamily: 'system-ui, sans-serif',
      }}
    >
      <div style={{ textAlign: 'center', maxWidth: 400 }}>
        <h1 style={{ fontSize: '4rem', margin: 0, opacity: 0.3 }}>404</h1>
        <h2 style={{ fontSize: '1.5rem', marginBottom: '1rem' }}>
          Page Not Found
        </h2>
        <p style={{ opacity: 0.8, marginBottom: '1.5rem' }}>
          The page you're looking for doesn't exist or has been moved.
        </p>
        <button
          onClick={() => navigate('/')}
          style={{
            padding: '0.75rem 1.5rem',
            background: 'rgba(99, 102, 241, 0.8)',
            border: 'none',
            borderRadius: '0.5rem',
            color: 'white',
            cursor: 'pointer',
            fontSize: '1rem',
          }}
        >
          Go Home
        </button>
      </div>
    </div>
  )
}

export default NotFound
