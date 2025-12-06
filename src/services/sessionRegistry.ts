/**
 * Session Registry - stores canvas sessions keyed by unique IDs.
 *
 * Sessions reference configs by slug (not embedded) and store the canvas state.
 * This enables the URL pattern /{config_slug}/{session_slug}.
 */

import type { CanvasState } from './persistence'
import { slugify } from './slugify'

/** A saved session that references a config by slug */
export interface SessionSnapshot {
  id: string // e.g., "s-1733186400000-abc123" (internal)
  slug: string // URL-safe name, e.g., "morning-thoughts" (unique per config)
  name: string // Display name
  configSlug: string // Reference to config, NOT embedded
  timestamp: number
  state: CanvasState
  // Cost tracking
  totalCostUsd: number // Accumulated cost for this session
  generationCount: number // Number of LLM generations
}

/** Metadata for listing sessions without loading full state */
export interface SessionMeta {
  id: string
  slug: string
  name: string
  configSlug: string
  timestamp: number
  cardCount: number
  // Cost tracking
  totalCostUsd: number
  generationCount: number
}

/** Registry of all sessions keyed by ID */
interface SessionRegistry {
  [sessionId: string]: SessionSnapshot
}

const SESSIONS_KEY = 'ephemeral_sessions_v2'

/** Generate a unique session ID */
export function generateSessionId(): string {
  return `s-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
}

// Re-export slugify for convenience
export { slugify }

/**
 * Generate a unique slug for a session within a config.
 * Appends a number if the slug already exists.
 */
function generateUniqueSlug(
  configSlug: string,
  baseName: string,
  sessions: SessionRegistry
): string {
  const baseSlug = slugify(baseName)
  let slug = baseSlug
  let counter = 1

  // Check for collisions within the same config
  while (
    Object.values(sessions).some(
      (s) => s.configSlug === configSlug && s.slug === slug
    )
  ) {
    slug = `${baseSlug}-${counter}`
    counter++
  }

  return slug
}

/** Load all sessions from localStorage */
function loadAllSessions(): SessionRegistry {
  try {
    const data = localStorage.getItem(SESSIONS_KEY)
    return data ? JSON.parse(data) : {}
  } catch (e) {
    console.error('Failed to load sessions:', e)
    return {}
  }
}

/** Save all sessions to localStorage */
function saveAllSessions(sessions: SessionRegistry): void {
  try {
    localStorage.setItem(SESSIONS_KEY, JSON.stringify(sessions))
  } catch (e) {
    console.error('Failed to save sessions:', e)
    if (e instanceof DOMException && e.name === 'QuotaExceededError') {
      throw new Error('Storage full. Please delete some saved sessions.')
    }
    throw e
  }
}

/**
 * Save a new session or update an existing one.
 *
 * @param configSlug - The slug of the config this session belongs to
 * @param state - The canvas state to save
 * @param name - Display name (required for new sessions)
 * @param existingId - Optional ID to update existing session
 * @returns The saved session
 */
export function saveSession(
  configSlug: string,
  state: CanvasState,
  name?: string,
  existingId?: string
): SessionSnapshot {
  const sessions = loadAllSessions()

  // If updating existing session, preserve slug, cost fields, but update timestamp
  if (existingId && sessions[existingId]) {
    const existing = sessions[existingId]!
    const session: SessionSnapshot = {
      ...existing,
      name: name || existing.name,
      timestamp: Date.now(),
      state,
      // Preserve cost tracking fields
      totalCostUsd: existing.totalCostUsd ?? 0,
      generationCount: existing.generationCount ?? 0,
    }
    sessions[session.id] = session
    saveAllSessions(sessions)
    return session
  }

  // New session: generate slug from name
  const displayName = name || `Session ${new Date().toLocaleString()}`
  const slug = generateUniqueSlug(configSlug, displayName, sessions)

  const session: SessionSnapshot = {
    id: generateSessionId(),
    slug,
    name: displayName,
    configSlug,
    timestamp: Date.now(),
    state,
    // Initialize cost tracking
    totalCostUsd: 0,
    generationCount: 0,
  }

  sessions[session.id] = session
  saveAllSessions(sessions)

  return session
}

/**
 * Get a session by ID.
 *
 * @param id - The session ID
 * @returns The session or null if not found
 */
export function getSession(id: string): SessionSnapshot | null {
  const sessions = loadAllSessions()
  return sessions[id] ?? null
}

/**
 * Get a session by slug within a config.
 *
 * @param configSlug - The config slug
 * @param sessionSlug - The session slug
 * @returns The session or null if not found
 */
export function getSessionBySlug(
  configSlug: string,
  sessionSlug: string
): SessionSnapshot | null {
  const sessions = loadAllSessions()
  return (
    Object.values(sessions).find(
      (s) => s.configSlug === configSlug && s.slug === sessionSlug
    ) ?? null
  )
}

/**
 * List all sessions for a specific config.
 *
 * @param configSlug - The config slug to filter by
 * @returns Array of session metadata sorted by most recent first
 */
export function listSessionsForConfig(configSlug: string): SessionMeta[] {
  const sessions = loadAllSessions()
  return Object.values(sessions)
    .filter((s) => s.configSlug === configSlug)
    .map((s) => ({
      id: s.id,
      slug: s.slug || slugify(s.name), // Fallback for old sessions without slug
      name: s.name,
      configSlug: s.configSlug,
      timestamp: s.timestamp,
      cardCount: s.state.cards.length + s.state.savedCards.length,
      totalCostUsd: s.totalCostUsd ?? 0,
      generationCount: s.generationCount ?? 0,
    }))
    .sort((a, b) => b.timestamp - a.timestamp)
}

/**
 * List all sessions (across all configs).
 *
 * @returns Array of session metadata sorted by most recent first
 */
export function listAllSessions(): SessionMeta[] {
  const sessions = loadAllSessions()
  return Object.values(sessions)
    .map((s) => ({
      id: s.id,
      slug: s.slug || slugify(s.name), // Fallback for old sessions without slug
      name: s.name,
      configSlug: s.configSlug,
      timestamp: s.timestamp,
      cardCount: s.state.cards.length + s.state.savedCards.length,
      totalCostUsd: s.totalCostUsd ?? 0,
      generationCount: s.generationCount ?? 0,
    }))
    .sort((a, b) => b.timestamp - a.timestamp)
}

/**
 * Delete a session by ID.
 *
 * @param id - The session ID to delete
 */
export function deleteSession(id: string): void {
  const sessions = loadAllSessions()
  delete sessions[id]
  saveAllSessions(sessions)
}

/**
 * Delete all sessions for a config.
 *
 * @param configSlug - The config slug to delete sessions for
 */
export function deleteSessionsForConfig(configSlug: string): void {
  const sessions = loadAllSessions()
  for (const id of Object.keys(sessions)) {
    if (sessions[id]?.configSlug === configSlug) {
      delete sessions[id]
    }
  }
  saveAllSessions(sessions)
}

/**
 * Check if a session exists.
 *
 * @param id - The session ID to check
 * @returns True if the session exists
 */
export function hasSession(id: string): boolean {
  const sessions = loadAllSessions()
  return id in sessions
}

/** Cost summary for a session */
export interface SessionCostSummary {
  totalCostUsd: number
  generationCount: number
}

/**
 * Add cost to a session after a generation.
 *
 * @param sessionId - The session ID to update
 * @param costUsd - The cost to add (null is no-op)
 */
export function addSessionCost(
  sessionId: string,
  costUsd: number | null
): void {
  if (costUsd === null) return

  const sessions = loadAllSessions()
  const session = sessions[sessionId]
  if (!session) return

  session.totalCostUsd = (session.totalCostUsd ?? 0) + costUsd
  session.generationCount = (session.generationCount ?? 0) + 1

  saveAllSessions(sessions)
}

/**
 * Get cost summary for a session.
 *
 * @param sessionId - The session ID
 * @returns Cost summary or null if session not found
 */
export function getSessionCost(sessionId: string): SessionCostSummary | null {
  const sessions = loadAllSessions()
  const session = sessions[sessionId]
  if (!session) return null

  return {
    totalCostUsd: session.totalCostUsd ?? 0,
    generationCount: session.generationCount ?? 0,
  }
}

/**
 * Format a timestamp as a readable date string.
 * (Reused from persistence.ts pattern)
 */
export function formatTimestamp(timestamp: number): string {
  const date = new Date(timestamp)
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))

  if (diffDays === 0) {
    return `Today at ${date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`
  } else if (diffDays === 1) {
    return `Yesterday at ${date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`
  } else if (diffDays < 7) {
    return `${diffDays} days ago`
  } else {
    return date.toLocaleDateString([], {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    })
  }
}
