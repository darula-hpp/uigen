import type { RelationshipConfig } from '../config/types.js';

/**
 * Derive the IR relationship type from a path string and source/target slugs.
 *
 * Rules:
 * - `/{sourceSlug}/{id}/{targetSlug}` -> `hasMany` from source perspective
 * - `/{targetSlug}/{id}/{sourceSlug}` -> `belongsTo` from source perspective
 * - Symmetric pair (both source->target and target->source entries exist) -> `manyToMany`
 * - Unrecognised pattern defaults to `hasMany` with a console warning
 *
 * @param path             - The API path string, e.g. /users/{id}/orders
 * @param sourceSlug       - Slug of the source resource
 * @param targetSlug       - Slug of the target resource
 * @param allConfigEntries - Full list of RelationshipConfig entries (used for symmetry check)
 * @returns Derived relationship type
 */
export function deriveRelationshipType(
  path: string,
  sourceSlug: string,
  targetSlug: string,
  allConfigEntries: RelationshipConfig[]
): 'hasMany' | 'belongsTo' | 'manyToMany' {
  // Build regex patterns for the two canonical forms
  const escapedSource = escapeRegex(sourceSlug);
  const escapedTarget = escapeRegex(targetSlug);

  const hasManyPattern = new RegExp(
    `^/${escapedSource}/\\{[^}]+\\}/${escapedTarget}(/.*)?$`
  );
  const belongsToPattern = new RegExp(
    `^/${escapedTarget}/\\{[^}]+\\}/${escapedSource}(/.*)?$`
  );

  const isHasMany = hasManyPattern.test(path);
  const isBelongsTo = belongsToPattern.test(path);

  if (isHasMany) {
    // Check for a symmetric counterpart: target->source entry with a matching path pattern
    const hasSymmetricPair = allConfigEntries.some((entry) => {
      if (entry.source !== targetSlug || entry.target !== sourceSlug) return false;
      const reverseHasManyPattern = new RegExp(
        `^/${escapeRegex(targetSlug)}/\\{[^}]+\\}/${escapeRegex(sourceSlug)}(/.*)?$`
      );
      return reverseHasManyPattern.test(entry.path);
    });

    return hasSymmetricPair ? 'manyToMany' : 'hasMany';
  }

  if (isBelongsTo) {
    return 'belongsTo';
  }

  // Unrecognised pattern: default to hasMany with a warning
  console.warn(
    `[RelationshipTypeDeriver] Unrecognised path pattern "${path}" for ` +
      `source="${sourceSlug}" target="${targetSlug}". Defaulting to "hasMany".`
  );
  return 'hasMany';
}

function escapeRegex(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
