/**
 * Migration utility - converts old storage format to new routing-compatible format.
 *
 * Old format:
 * - savedConfigs: { [name: string]: CanvasConfig }
 * - ephemeral_snapshots: { [id: string]: CanvasSnapshot }
 *
 * New format:
 * - ephemeral_configs_v2: { [slug: string]: SavedConfigWithSlug }
 * - ephemeral_sessions_v2: { [id: string]: SessionSnapshot }
 */

import type { CanvasConfig } from '@/services/api'
import type { CanvasSnapshot } from '@/services/persistence'
import type { SavedConfigWithSlug } from '@/services/configRegistry'
import type { SessionSnapshot } from '@/services/sessionRegistry'
import { slugify, generateUniqueSlug } from '@/services/slugify'

const MIGRATION_KEY = 'ephemeral_migration_v2_done'

// Old storage keys
const OLD_CONFIGS_KEY = 'savedConfigs'
const OLD_SNAPSHOTS_KEY = 'ephemeral_snapshots'

// New storage keys
const NEW_CONFIGS_KEY = 'ephemeral_configs_v2'
const NEW_SESSIONS_KEY = 'ephemeral_sessions_v2'

interface ConfigRegistry {
  [slug: string]: SavedConfigWithSlug
}

interface SessionRegistry {
  [id: string]: SessionSnapshot
}

/**
 * Check if migration has already been completed.
 */
export function isMigrationDone(): boolean {
  return localStorage.getItem(MIGRATION_KEY) === 'true'
}

/**
 * Find the slug for a config by matching on name.
 */
function findSlugForConfig(
  config: CanvasConfig,
  configRegistry: ConfigRegistry
): string | null {
  // First try exact name match
  for (const [slug, saved] of Object.entries(configRegistry)) {
    if (saved.config.name === config.name) {
      return slug
    }
  }
  return null
}

/**
 * Run the migration from old format to new format.
 * This is idempotent - safe to call multiple times.
 */
export function runMigration(): void {
  if (isMigrationDone()) {
    return
  }

  console.log('[Migration] Starting migration to v2 format...')

  try {
    // Step 1: Migrate saved configs
    const configRegistry = migrateConfigs()

    // Step 2: Migrate snapshots to sessions
    migrateSnapshots(configRegistry)

    // Mark migration as complete
    localStorage.setItem(MIGRATION_KEY, 'true')
    console.log('[Migration] Migration completed successfully!')
  } catch (e) {
    console.error('[Migration] Migration failed:', e)
    // Don't set the flag - allow retry on next load
  }
}

/**
 * Migrate old savedConfigs to new configRegistry format.
 */
function migrateConfigs(): ConfigRegistry {
  // Check if new registry already exists
  const existingNew = localStorage.getItem(NEW_CONFIGS_KEY)
  if (existingNew) {
    console.log(
      '[Migration] Config registry already exists, skipping config migration'
    )
    return JSON.parse(existingNew)
  }

  // Load old configs
  const oldConfigsRaw = localStorage.getItem(OLD_CONFIGS_KEY)
  if (!oldConfigsRaw) {
    console.log('[Migration] No old configs found')
    return {}
  }

  const oldConfigs: Record<string, CanvasConfig> = JSON.parse(oldConfigsRaw)
  const configRegistry: ConfigRegistry = {}

  for (const [name, config] of Object.entries(oldConfigs)) {
    const existingSlugs = new Set(Object.keys(configRegistry))
    const slug = generateUniqueSlug(name, existingSlugs)

    configRegistry[slug] = {
      slug,
      config: { ...config, slug },
      createdAt: Date.now(),
    }

    console.log(`[Migration] Migrated config "${name}" -> slug "${slug}"`)
  }

  // Save new config registry
  localStorage.setItem(NEW_CONFIGS_KEY, JSON.stringify(configRegistry))
  console.log(
    `[Migration] Migrated ${Object.keys(configRegistry).length} configs`
  )

  return configRegistry
}

/**
 * Migrate old snapshots to new session format.
 */
function migrateSnapshots(configRegistry: ConfigRegistry): void {
  // Check if new sessions already exist
  const existingNew = localStorage.getItem(NEW_SESSIONS_KEY)
  if (existingNew) {
    console.log(
      '[Migration] Session registry already exists, skipping snapshot migration'
    )
    return
  }

  // Load old snapshots
  const oldSnapshotsRaw = localStorage.getItem(OLD_SNAPSHOTS_KEY)
  if (!oldSnapshotsRaw) {
    console.log('[Migration] No old snapshots found')
    localStorage.setItem(NEW_SESSIONS_KEY, JSON.stringify({}))
    return
  }

  const oldSnapshots: Record<string, CanvasSnapshot> =
    JSON.parse(oldSnapshotsRaw)
  const sessionRegistry: SessionRegistry = {}

  for (const [id, snapshot] of Object.entries(oldSnapshots)) {
    // Find the slug for this snapshot's config
    let configSlug = findSlugForConfig(snapshot.config, configRegistry)

    if (!configSlug) {
      // Config not found - create a new one from the snapshot's embedded config
      const existingSlugs = new Set(Object.keys(configRegistry))
      configSlug = generateUniqueSlug(snapshot.config.name, existingSlugs)

      configRegistry[configSlug] = {
        slug: configSlug,
        config: { ...snapshot.config, slug: configSlug },
        createdAt: snapshot.timestamp,
      }

      // Update the config registry with this new config
      localStorage.setItem(NEW_CONFIGS_KEY, JSON.stringify(configRegistry))
      console.log(
        `[Migration] Created config from snapshot: "${snapshot.config.name}" -> "${configSlug}"`
      )
    }

    // Create session from snapshot with generated slug
    const session: SessionSnapshot = {
      id,
      slug: slugify(snapshot.name),
      name: snapshot.name,
      configSlug,
      timestamp: snapshot.timestamp,
      state: snapshot.state,
      totalCostUsd: 0,
      generationCount: 0,
    }

    sessionRegistry[id] = session
    console.log(
      `[Migration] Migrated snapshot "${snapshot.name}" -> session "${id}"`
    )
  }

  // Save new session registry
  localStorage.setItem(NEW_SESSIONS_KEY, JSON.stringify(sessionRegistry))
  console.log(
    `[Migration] Migrated ${Object.keys(sessionRegistry).length} sessions`
  )
}

/**
 * Reset migration flag (for testing purposes).
 */
export function resetMigration(): void {
  localStorage.removeItem(MIGRATION_KEY)
  console.log('[Migration] Migration flag reset')
}

/**
 * Clear all v2 data (for testing purposes).
 */
export function clearV2Data(): void {
  localStorage.removeItem(NEW_CONFIGS_KEY)
  localStorage.removeItem(NEW_SESSIONS_KEY)
  localStorage.removeItem(MIGRATION_KEY)
  console.log('[Migration] V2 data cleared')
}
