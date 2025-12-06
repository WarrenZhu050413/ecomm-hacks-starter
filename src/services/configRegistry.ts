/**
 * Config Registry - stores configs keyed by URL-safe slugs.
 *
 * Replaces the old name-keyed savedConfigs system with a slug-based approach
 * that supports URL routing.
 */

import type { CanvasConfig } from './api'
import { generateUniqueSlug } from './slugify'

/** Config stored with its slug and metadata */
export interface SavedConfigWithSlug {
  slug: string
  config: CanvasConfig
  createdAt: number
}

/** Registry of all configs keyed by slug */
export interface ConfigRegistry {
  [slug: string]: SavedConfigWithSlug
}

const CONFIGS_KEY = 'ephemeral_configs_v2'

/** Load all configs from localStorage */
function loadRegistry(): ConfigRegistry {
  try {
    const data = localStorage.getItem(CONFIGS_KEY)
    return data ? JSON.parse(data) : {}
  } catch (e) {
    console.error('Failed to load config registry:', e)
    return {}
  }
}

/** Save all configs to localStorage */
function saveRegistry(registry: ConfigRegistry): void {
  try {
    localStorage.setItem(CONFIGS_KEY, JSON.stringify(registry))
  } catch (e) {
    console.error('Failed to save config registry:', e)
    if (e instanceof DOMException && e.name === 'QuotaExceededError') {
      throw new Error('Storage full. Please delete some saved configurations.')
    }
    throw e
  }
}

/**
 * Save a config to the registry.
 *
 * @param config - The config to save
 * @param existingSlug - Optional slug to update existing config
 * @returns The slug used to save the config
 */
export function saveConfig(
  config: CanvasConfig,
  existingSlug?: string
): string {
  const registry = loadRegistry()

  let slug: string
  if (existingSlug && registry[existingSlug]) {
    // Update existing config
    slug = existingSlug
  } else {
    // Generate new unique slug
    const existingSlugs = new Set(Object.keys(registry))
    slug = generateUniqueSlug(config.name, existingSlugs)
  }

  registry[slug] = {
    slug,
    config: { ...config, slug },
    createdAt: registry[slug]?.createdAt || Date.now(),
  }

  saveRegistry(registry)
  return slug
}

/**
 * Get a config by its slug.
 *
 * @param slug - The slug to look up
 * @returns The config or null if not found
 */
export function getConfigBySlug(slug: string): CanvasConfig | null {
  const registry = loadRegistry()
  return registry[slug]?.config ?? null
}

/**
 * List all saved configs.
 *
 * @returns Array of configs sorted by most recent first
 */
export function listConfigs(): SavedConfigWithSlug[] {
  const registry = loadRegistry()
  return Object.values(registry).sort((a, b) => b.createdAt - a.createdAt)
}

/**
 * Delete a config by slug.
 *
 * @param slug - The slug of the config to delete
 */
export function deleteConfig(slug: string): void {
  const registry = loadRegistry()
  delete registry[slug]
  saveRegistry(registry)
}

/**
 * Check if a slug exists in the registry.
 *
 * @param slug - The slug to check
 * @returns True if the slug exists
 */
export function hasConfig(slug: string): boolean {
  const registry = loadRegistry()
  return slug in registry
}

/**
 * Get all existing slugs (useful for collision checking).
 *
 * @returns Set of all slugs
 */
export function getExistingSlugs(): Set<string> {
  const registry = loadRegistry()
  return new Set(Object.keys(registry))
}
