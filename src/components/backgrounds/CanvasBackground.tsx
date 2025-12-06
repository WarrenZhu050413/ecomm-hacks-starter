/**
 * CanvasBackground - Main background component with auto-selection.
 *
 * Uses the background registry to automatically select the best renderer
 * based on the theme configuration. Simply pass the theme and it picks
 * the right implementation (shader, image, gradient, etc.).
 *
 * To add new background types:
 * 1. Create a new renderer component implementing BackgroundRendererProps
 * 2. Register it with backgroundRegistry.register() with a matcher function
 * 3. Import it in the index.ts to ensure registration
 */

import type { CanvasTheme } from '@/services/api'
import { backgroundRegistry } from './types'
import { GradientBackground } from './GradientBackground'

interface CanvasBackgroundProps {
  /** The canvas theme configuration */
  theme: CanvasTheme
  /** Fallback background (default: dark gradient) */
  fallback?: string
  /** Called when any background renderer fails */
  onError?: (error: string) => void
}

const DEFAULT_FALLBACK =
  'linear-gradient(160deg, #0a0a12 0%, #12121f 40%, #0a0a14 100%)'

export function CanvasBackground({
  theme,
  fallback = DEFAULT_FALLBACK,
  onError,
}: CanvasBackgroundProps) {
  // Find the best renderer for this theme
  const registration = backgroundRegistry.findRenderer(theme)

  // Use the matched renderer, or fall back to gradient
  const Renderer = registration?.renderer ?? GradientBackground

  return <Renderer theme={theme} fallback={fallback} onError={onError} />
}
