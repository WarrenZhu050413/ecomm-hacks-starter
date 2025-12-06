/**
 * ImageBackground - Renders a background image with CSS filter effects.
 *
 * Supports:
 * - CSS filter functions (blur, brightness, saturate, etc.)
 * - Blend modes
 * - Color overlays
 */

import { useState } from 'react'
import { backgroundRegistry, type BackgroundRendererProps } from './types'
import { GradientBackground } from './GradientBackground'

export function ImageBackground({
  theme,
  fallback,
  onError,
}: BackgroundRendererProps) {
  const [imageError, setImageError] = useState(false)

  // If image failed to load, fall back to gradient
  if (imageError || !theme.backgroundImage) {
    return <GradientBackground theme={theme} fallback={fallback} />
  }

  const handleError = () => {
    setImageError(true)
    onError?.('Failed to load background image')
  }

  return (
    <div
      className="image-background-container"
      style={{
        position: 'absolute',
        inset: 0,
        zIndex: 0,
        overflow: 'hidden',
      }}
    >
      {/* Background image layer */}
      <img
        src={theme.backgroundImage}
        alt=""
        onError={handleError}
        style={{
          position: 'absolute',
          inset: 0,
          width: '100%',
          height: '100%',
          objectFit: 'cover',
          filter: theme.backgroundFilter ?? undefined,
          mixBlendMode:
            (theme.backgroundBlendMode as React.CSSProperties['mixBlendMode']) ??
            undefined,
        }}
      />

      {/* Color overlay layer */}
      {theme.backgroundOverlay && (
        <div
          className="image-background-overlay"
          style={{
            position: 'absolute',
            inset: 0,
            background: theme.backgroundOverlay,
            pointerEvents: 'none',
          }}
        />
      )}
    </div>
  )
}

// Register with priority 10 - higher than gradient, lower than shader
backgroundRegistry.register({
  name: 'image',
  matcher: (theme) => (theme.backgroundImage ? 10 : 0),
  renderer: ImageBackground,
})
