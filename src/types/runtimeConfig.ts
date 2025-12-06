/**
 * Runtime configuration for EphemeralCanvas
 * These settings can be modified at runtime via the config modal or /config command
 */

// Gemini model types
export type ModelType = 'flash' | 'pro' | 'flash-thinking'

export interface PhysicsConfig {
  fadeDuration: number // ms, how long cards take to fade out
  driftSpeed: number // multiplier for card drift velocity
  damping: number // 0-1, velocity damping per frame
  jiggleIntensity: number // multiplier for random movement
  bounceElasticity: number // 0-1, how much velocity is preserved on bounce
}

export interface SpawnConfig {
  initialVelocityRange: number // max initial vx/vy
  spawnRegion: {
    xMin: number // % from left
    xMax: number // % from left
    yMin: number // % from top
    yMax: number // % from top
  }
}

export interface VisualConfig {
  cardStyle: 'glass' | 'minimal' | 'paper' | 'outlined'
  typography: 'serif' | 'sans' | 'mono'
  accent: string // hex color for accents
  background: string // CSS background value
  cardOpacityMax: number // 0-1, max opacity for cards
}

export interface GenerationConfig {
  cardCountThreshold: number // Generate new cards when count falls below this
  intervalMs: number // Milliseconds between generation attempts
  model: ModelType // Which Claude model to use
}

export interface RuntimeConfig {
  physics: PhysicsConfig
  spawn: SpawnConfig
  visual: VisualConfig
  generation: GenerationConfig
}

export const DEFAULT_RUNTIME_CONFIG: RuntimeConfig = {
  physics: {
    fadeDuration: 30000,
    driftSpeed: 1.0,
    damping: 0.995,
    jiggleIntensity: 1.0,
    bounceElasticity: 0.5,
  },
  spawn: {
    initialVelocityRange: 0.1,
    spawnRegion: {
      xMin: 15,
      xMax: 85,
      yMin: 10,
      yMax: 70,
    },
  },
  visual: {
    cardStyle: 'glass',
    typography: 'serif',
    accent: '#fbbf24',
    background:
      'linear-gradient(160deg, #0a0a12 0%, #12121f 40%, #0a0a14 100%)',
    cardOpacityMax: 1.0,
  },
  generation: {
    cardCountThreshold: 6, // Generate when < 6 cards on canvas
    intervalMs: 8000, // Check every 8 seconds
    model: 'flash', // Default to Flash for speed
  },
}

// Chat command definitions
export interface ChatCommand {
  name: string
  description: string
  hasArgs: boolean
}

export const CHAT_COMMANDS: ChatCommand[] = [
  {
    name: '/config',
    description: 'Change canvas settings with AI',
    hasArgs: true,
  },
  { name: '/generate', description: 'Create a new card', hasArgs: false },
  { name: '/combine', description: 'Merge two cards together', hasArgs: false },
  { name: '/clear', description: 'Clear all cards', hasArgs: false },
  { name: '/save', description: 'Save environment snapshot', hasArgs: false },
  { name: '/load', description: 'Load saved environment', hasArgs: false },
]

export interface ChatMessage {
  id: string
  role: 'user' | 'assistant' | 'system'
  content: string
  timestamp: number
}
