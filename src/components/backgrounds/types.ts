/**
 * Background renderer types and registry.
 *
 * Uses a registry pattern for extensibility - new background types
 * can be registered without modifying existing code.
 */

import type { CanvasTheme } from '@/services/api'

/**
 * Props passed to all background renderers.
 */
export interface BackgroundRendererProps {
  /** The canvas theme configuration */
  theme: CanvasTheme
  /** Fallback background color/gradient */
  fallback: string
  /** Called when the background fails to render */
  onError?: (error: string) => void
}

/**
 * A background renderer component.
 */
export type BackgroundRenderer = React.ComponentType<BackgroundRendererProps>

/**
 * Determines if this renderer should handle the given theme.
 * Return a priority number (higher = more specific/preferred).
 * Return 0 or negative to indicate this renderer doesn't apply.
 */
export type BackgroundMatcher = (theme: CanvasTheme) => number

/**
 * A registered background renderer with its matcher.
 */
export interface BackgroundRegistration {
  name: string
  matcher: BackgroundMatcher
  renderer: BackgroundRenderer
}

/**
 * Background renderer registry.
 * Allows registering new background types at runtime.
 */
class BackgroundRegistry {
  private renderers: BackgroundRegistration[] = []

  /**
   * Register a new background renderer.
   */
  register(registration: BackgroundRegistration): void {
    this.renderers.push(registration)
    // Sort by name for consistent ordering when priorities match
    this.renderers.sort((a, b) => a.name.localeCompare(b.name))
  }

  /**
   * Find the best renderer for the given theme.
   * Returns the renderer with the highest priority match.
   */
  findRenderer(theme: CanvasTheme): BackgroundRegistration | null {
    let best: BackgroundRegistration | null = null
    let bestPriority = 0

    for (const reg of this.renderers) {
      const priority = reg.matcher(theme)
      if (priority > bestPriority) {
        best = reg
        bestPriority = priority
      }
    }

    return best
  }

  /**
   * Get all registered renderers (for debugging/introspection).
   */
  getAll(): readonly BackgroundRegistration[] {
    return this.renderers
  }
}

// Global singleton registry
export const backgroundRegistry = new BackgroundRegistry()
