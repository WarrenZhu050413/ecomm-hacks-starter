/**
 * GradientBackground - Simple CSS gradient/solid color background.
 *
 * This is the default/fallback renderer when no other background type applies.
 * Handles CSS gradients, solid colors, and any valid CSS background value.
 */

import { backgroundRegistry, type BackgroundRendererProps } from './types'

export function GradientBackground({
  theme,
  fallback,
}: BackgroundRendererProps) {
  const background = theme.background || fallback

  return (
    <div
      className="gradient-background"
      style={{
        position: 'absolute',
        inset: 0,
        background,
        zIndex: 0,
      }}
    />
  )
}

// Register with lowest priority (1) - this is the fallback
backgroundRegistry.register({
  name: 'gradient',
  matcher: () => 1, // Always matches, but lowest priority
  renderer: GradientBackground,
})
