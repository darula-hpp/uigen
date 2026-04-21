/**
 * Client-side type derivation logic for recommending relationship types based on paths.
 * 
 * This is a simplified version of the adapter's type derivation logic,
 * used to recommend types in the config-gui relationship form.
 */

export type RelationshipType = 'hasMany' | 'belongsTo' | 'manyToMany';

/**
 * Derive relationship type from API path pattern.
 * 
 * Algorithm:
 * 1. Check if path matches hasMany pattern: /{sourceSlug}/{id}/{targetSlug}
 * 2. Check if path matches belongsTo pattern: /{targetSlug}/{id}/{sourceSlug}
 * 3. Default to hasMany if no pattern matches
 * 
 * Note: manyToMany detection requires checking for symmetric pairs,
 * which is done at the config level, not per-path. The form doesn't
 * auto-select manyToMany; users must choose it explicitly.
 * 
 * @param path - The API path string (e.g., "/users/{id}/orders")
 * @param sourceSlug - The source resource slug (e.g., "users")
 * @param targetSlug - The target resource slug (e.g., "orders")
 * @returns The derived relationship type
 * 
 * @example
 * ```typescript
 * deriveTypeFromPath('/users/{id}/orders', 'users', 'orders')
 * // Returns: 'hasMany'
 * 
 * deriveTypeFromPath('/users/{id}/orders', 'orders', 'users')
 * // Returns: 'belongsTo'
 * 
 * deriveTypeFromPath('/custom/path', 'users', 'orders')
 * // Returns: 'hasMany' (default)
 * ```
 */
export function deriveTypeFromPath(
  path: string,
  sourceSlug: string,
  targetSlug: string
): RelationshipType {
  // Handle edge cases
  if (!path || !sourceSlug || !targetSlug) {
    return 'hasMany';
  }

  // Normalize path: remove trailing slash, ensure leading slash
  const normalizedPath = path.trim().replace(/\/$/, '');
  if (!normalizedPath.startsWith('/')) {
    return 'hasMany';
  }

  // Escape special regex characters in slugs
  const escapeRegex = (str: string) => str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const escapedSource = escapeRegex(sourceSlug);
  const escapedTarget = escapeRegex(targetSlug);

  // Pattern: /{sourceSlug}/{id}/{targetSlug}
  // Example: /users/{id}/orders (users hasMany orders)
  const hasManyPattern = new RegExp(`^/${escapedSource}/\\{[^}]+\\}/${escapedTarget}$`);
  if (hasManyPattern.test(normalizedPath)) {
    return 'hasMany';
  }

  // Pattern: /{targetSlug}/{id}/{sourceSlug}
  // Example: /users/{id}/orders (orders belongsTo users)
  const belongsToPattern = new RegExp(`^/${escapedTarget}/\\{[^}]+\\}/${escapedSource}$`);
  if (belongsToPattern.test(normalizedPath)) {
    return 'belongsTo';
  }

  // Default to hasMany if no pattern matches
  return 'hasMany';
}
