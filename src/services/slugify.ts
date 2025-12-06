/**
 * Slug generation utilities for URL-safe config names.
 */

/**
 * Convert a string to a URL-safe slug.
 *
 * @param name - The string to slugify (e.g., "Zen Haiku Garden")
 * @returns URL-safe slug (e.g., "zen-haiku-garden")
 */
export function slugify(name: string): string {
  return (
    name
      .toLowerCase()
      .trim()
      .replace(/[^\w\s-]/g, '') // Remove special characters
      .replace(/\s+/g, '-') // Spaces to hyphens
      .replace(/-+/g, '-') // Collapse multiple hyphens
      .replace(/^-+|-+$/g, '') // Trim leading/trailing hyphens
      .substring(0, 50) || // Limit length
    'canvas'
  ) // Fallback for empty names
}

/**
 * Generate a unique slug, handling collisions by appending numbers.
 *
 * @param name - The name to slugify
 * @param existingSlugs - Set of slugs already in use
 * @returns A unique slug
 */
export function generateUniqueSlug(
  name: string,
  existingSlugs: Set<string>
): string {
  const baseSlug = slugify(name)

  if (!existingSlugs.has(baseSlug)) {
    return baseSlug
  }

  // Add numeric suffix for collisions
  let counter = 2
  while (existingSlugs.has(`${baseSlug}-${counter}`)) {
    counter++
  }
  return `${baseSlug}-${counter}`
}
