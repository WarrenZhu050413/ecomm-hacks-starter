/**
 * Background renderers module.
 *
 * Provides an extensible background system with automatic renderer selection.
 * Import individual renderers to register them, or use CanvasBackground
 * which automatically picks the best renderer for your theme.
 *
 * Adding a new background type:
 * 1. Create YourBackground.tsx implementing BackgroundRendererProps
 * 2. Call backgroundRegistry.register() with a matcher function
 * 3. Import it here to ensure it's registered
 *
 * Priority (higher = preferred):
 * - shader: 20 (when theme.shader is set)
 * - image: 10 (when theme.backgroundImage is set)
 * - gradient: 1 (fallback, always matches)
 */

// Import all renderers to register them
import './GradientBackground'
import './ImageBackground'
import './ShaderBackground'

// Export the main component and types
export { CanvasBackground } from './CanvasBackground'
export {
  backgroundRegistry,
  type BackgroundRendererProps,
  type BackgroundRegistration,
} from './types'

// Export individual renderers for direct use if needed
export { GradientBackground } from './GradientBackground'
export { ImageBackground } from './ImageBackground'
export { ShaderBackground } from './ShaderBackground'
