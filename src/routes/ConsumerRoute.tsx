/**
 * ConsumerRoute - Demo consumer interface using EphemeralCanvas
 *
 * This provides a direct demo of the product hover/shopping features
 * without requiring session setup.
 */

import { useState, useCallback } from 'react'
import EphemeralCanvas from '@/components/EphemeralCanvas'
import type { CanvasConfig } from '@/services/api'

// Demo config for consumer view
const CONSUMER_DEMO_CONFIG: CanvasConfig = {
  name: 'Ephemeral',
  slug: 'consumer-demo',
  description: 'Consumer demo with product placement',
  cardSchema: {
    name: 'lifestyle',
    fields: [
      { name: 'caption', type: 'string', display: 'primary' },
      { name: 'mood', type: 'string?', display: 'secondary' },
      { name: 'attribution', type: 'string?', display: 'meta' },
    ],
  },
  directives: [
    'Create a lifestyle scene with warm afternoon light',
    'Generate a cozy cafe moment',
    'Capture a serene outdoor scene',
  ],
  seedContent: [
    { caption: 'Golden hour in the garden', mood: 'peaceful', attribution: 'AI Generated' },
    { caption: 'Morning coffee ritual', mood: 'contemplative', attribution: 'AI Generated' },
    { caption: 'Autumn leaves falling', mood: 'nostalgic', attribution: 'AI Generated' },
  ],
  spawning: {
    intervalSeconds: 12,
    minCards: 4,
    imageWeight: 0.5,
  },
  physics: {
    driftSpeed: 0.8,
    jiggle: 0.5,
    bounce: 0.3,
    cardLifetime: 45,
  },
  canvasTheme: {
    background: 'linear-gradient(135deg, #1a1a2e 0%, #16213e 100%)',
    accent: '#fbbf24',
  },
  cardTheme: {
    container: 'bg-black/30 backdrop-blur-md rounded-xl border border-white/10',
    primary: 'text-lg text-white leading-relaxed text-center',
    secondary: 'text-base text-white/60 italic text-center mt-2',
    meta: 'text-sm text-white/45 text-center mt-1',
    dragging: 'opacity-80 scale-105 rotate-1',
  },
  writingPane: {
    title: 'Your Mood',
    placeholder: 'Describe the vibe you\'re looking for...',
    background: 'rgba(0, 0, 0, 0.4)',
    textColor: '#e8e4d9',
    titleColor: 'rgba(255, 255, 255, 0.6)',
  },
}

interface ConsumerRouteProps {
  debugMode?: boolean
}

export function ConsumerRoute({ debugMode = false }: ConsumerRouteProps) {
  const [userComposition, setUserComposition] = useState('')
  const [config, setConfig] = useState<CanvasConfig>(CONSUMER_DEMO_CONFIG)

  const handleCompositionChange = useCallback((text: string) => {
    setUserComposition(text)
  }, [])

  const handleConfigChange = useCallback((newConfig: CanvasConfig) => {
    setConfig(newConfig)
  }, [])

  return (
    <div className="relative h-screen w-screen">
      <EphemeralCanvas
        config={config}
        userComposition={userComposition}
        onCompositionChange={handleCompositionChange}
        onConfigChange={handleConfigChange}
      />
      {debugMode && (
        <div
          style={{
            position: 'fixed',
            top: 20,
            left: 20,
            background: 'rgba(0,0,0,0.8)',
            color: '#fbbf24',
            padding: '8px 12px',
            borderRadius: 6,
            fontSize: '0.75rem',
            fontFamily: 'monospace',
            zIndex: 1000,
          }}
        >
          Debug Mode
        </div>
      )}
    </div>
  )
}

export default ConsumerRoute
