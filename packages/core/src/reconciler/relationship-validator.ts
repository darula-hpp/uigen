import type { RelationshipConfig } from '../config/types.js';
import type { ReconciliationWarning } from './types.js';

export interface RelationshipValidationResult {
  validRelationships: RelationshipConfig[];
  warnings: ReconciliationWarning[];
}

/**
 * Validates the relationship type field for a single RelationshipConfig entry.
 *
 * Rules:
 * - If type field is missing, return a warning (not error) for backward compatibility
 * - If type field is present but invalid, return an error
 * - Valid types are: 'hasMany', 'belongsTo', 'manyToMany'
 *
 * @param rel - The relationship config entry to validate
 * @param index - The index of the entry in the relationships array
 * @returns A ReconciliationWarning if validation fails, null otherwise
 */
export function validateRelationshipType(
  rel: RelationshipConfig,
  index: number
): ReconciliationWarning | null {
  const validTypes = ['hasMany', 'belongsTo', 'manyToMany'];
  const elementPath = `relationships[${index}]`;

  // Missing type - warning (not error) for backward compatibility
  if (!rel.type) {
    return {
      elementPath,
      message: `Missing type field at relationships[${index}]. Type will be derived from path. Consider adding an explicit type field.`,
    };
  }

  // Invalid type - error
  if (!validTypes.includes(rel.type)) {
    return {
      elementPath,
      message: `Invalid relationship type '${rel.type}' at relationships[${index}]. Must be one of: hasMany, belongsTo, manyToMany`,
    };
  }

  return null;
}

/**
 * Validates an array of RelationshipConfig entries.
 *
 * Rules:
 * - source, target, path must be non-empty strings
 * - path must start with '/'
 * - source !== target (no self-relationships)
 * - no duplicate (source, target, path) triplets
 * - type field validation (missing = warning, invalid = error)
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

    // Validate type field
    const typeWarning = validateRelationshipType(entry, i);
    if (typeWarning) {
      warnings.push(typeWarning);
      // If type is invalid (not just missing), skip this relationship
      if (entry.type && !['hasMany', 'belongsTo', 'manyToMany'].includes(entry.type)) {
        continue;
      }
    }

    seen.add(tripletKey);
    validRelationships.push(entry);
  }

  return { validRelationships, warnings };
}
