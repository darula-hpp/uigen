import type { RelationshipConfig } from '../config/types.js';
import type { ReconciliationWarning } from './types.js';

export interface RelationshipValidationResult {
  validRelationships: RelationshipConfig[];
  warnings: ReconciliationWarning[];
}

/**
 * Validates an array of RelationshipConfig entries.
 *
 * Rules:
 * - source, target, path must be non-empty strings
 * - path must start with '/'
 * - source !== target (no self-relationships)
 * - no duplicate (source, target, path) triplets
 */
export function validateRelationships(entries: RelationshipConfig[]): RelationshipValidationResult {
  const validRelationships: RelationshipConfig[] = [];
  const warnings: ReconciliationWarning[] = [];
  const seen = new Set<string>();

  for (let i = 0; i < entries.length; i++) {
    const entry = entries[i];
    const elementPath = `relationships[${i}]`;

    if (!entry.source || typeof entry.source !== 'string') {
      warnings.push({ elementPath, message: `relationships[${i}]: missing required field "source"` });
      continue;
    }

    if (!entry.target || typeof entry.target !== 'string') {
      warnings.push({ elementPath, message: `relationships[${i}]: missing required field "target"` });
      continue;
    }

    if (!entry.path || typeof entry.path !== 'string') {
      warnings.push({ elementPath, message: `relationships[${i}]: missing required field "path"` });
      continue;
    }

    if (!entry.path.startsWith('/')) {
      warnings.push({ elementPath, message: `relationships[${i}]: "path" must start with "/"` });
      continue;
    }

    if (entry.source === entry.target) {
      warnings.push({
        elementPath,
        message: `relationships[${i}]: source and target must not be the same resource (self-relationship rejected)`,
      });
      continue;
    }

    const tripletKey = `${entry.source}|${entry.target}|${entry.path}`;
    if (seen.has(tripletKey)) {
      warnings.push({
        elementPath,
        message: `relationships[${i}]: duplicate (source, target, path) triplet "${tripletKey}"`,
      });
      continue;
    }

    seen.add(tripletKey);
    validRelationships.push(entry);
  }

  return { validRelationships, warnings };
}
