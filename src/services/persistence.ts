/**
 * Persistence service for saving and loading canvas snapshots.
 *
 * A snapshot captures both the config and canvas state, allowing users
 * to save and restore their creative environments.
 */

import type { CanvasConfig, CardData } from './api'

/** Serialized card data (excludes transient physics state) */
export interface SerializedCard {
  id: string
  data: CardData
  x: number
  y: number
  isUserCreated: boolean
}

/** Canvas state that can be persisted */
export interface CanvasState {
  cards: SerializedCard[]
  savedCards: SerializedCard[]
  userComposition: string
}

/** Complete snapshot of an environment */
export interface CanvasSnapshot {
  id: string
  name: string
  timestamp: number
  config: CanvasConfig
  state: CanvasState
}

/** Metadata for listing snapshots without loading full data */
export interface SnapshotMeta {
  id: string
  name: string
  timestamp: number
  cardCount: number
  configName: string
}

const SNAPSHOTS_KEY = 'ephemeral_snapshots'

/** Generate a unique ID for snapshots */
function generateId(): string {
  return `snap-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
}

/** Load all snapshots from localStorage */
function loadAllSnapshots(): Record<string, CanvasSnapshot> {
  try {
    const data = localStorage.getItem(SNAPSHOTS_KEY)
    return data ? JSON.parse(data) : {}
  } catch (e) {
    console.error('Failed to load snapshots:', e)
    return {}
  }
}

/** Save all snapshots to localStorage */
function saveAllSnapshots(snapshots: Record<string, CanvasSnapshot>): void {
  try {
    localStorage.setItem(SNAPSHOTS_KEY, JSON.stringify(snapshots))
  } catch (e) {
    console.error('Failed to save snapshots:', e)
    // Could be quota exceeded - handle gracefully
    if (e instanceof DOMException && e.name === 'QuotaExceededError') {
      throw new Error('Storage full. Please delete some saved environments.')
    }
    throw e
  }
}

/**
 * Save a new snapshot or update an existing one.
 *
 * @param name - Display name for the snapshot
 * @param config - The CanvasConfig to save
 * @param state - The CanvasState to save
 * @param existingId - Optional ID to update existing snapshot
 * @returns The saved snapshot
 */
export function saveSnapshot(
  name: string,
  config: CanvasConfig,
  state: CanvasState,
  existingId?: string
): CanvasSnapshot {
  const snapshots = loadAllSnapshots()

  const snapshot: CanvasSnapshot = {
    id: existingId || generateId(),
    name: name.trim() || config.name,
    timestamp: Date.now(),
    config,
    state,
  }

  snapshots[snapshot.id] = snapshot
  saveAllSnapshots(snapshots)

  return snapshot
}

/**
 * Load a snapshot by ID.
 *
 * @param id - The snapshot ID
 * @returns The snapshot or null if not found
 */
export function loadSnapshot(id: string): CanvasSnapshot | null {
  const snapshots = loadAllSnapshots()
  return snapshots[id] || null
}

/**
 * List all snapshots as metadata (without full state).
 *
 * @returns Array of snapshot metadata, sorted by most recent first
 */
export function listSnapshots(): SnapshotMeta[] {
  const snapshots = loadAllSnapshots()
  return Object.values(snapshots)
    .map((s) => ({
      id: s.id,
      name: s.name,
      timestamp: s.timestamp,
      cardCount: s.state.cards.length + s.state.savedCards.length,
      configName: s.config.name,
    }))
    .sort((a, b) => b.timestamp - a.timestamp)
}

/**
 * Delete a snapshot by ID.
 *
 * @param id - The snapshot ID to delete
 */
export function deleteSnapshot(id: string): void {
  const snapshots = loadAllSnapshots()
  delete snapshots[id]
  saveAllSnapshots(snapshots)
}

/**
 * Check if any snapshots exist.
 */
export function hasSnapshots(): boolean {
  return listSnapshots().length > 0
}

/**
 * Format a timestamp as a readable date string.
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
