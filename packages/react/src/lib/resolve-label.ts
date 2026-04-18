/**
 * Resolves a labelField string against a record to produce a human-readable label.
 *
 * - If labelField contains no '{' characters: returns String(record[labelField] ?? '')
 * - If labelField contains '{fieldName}' placeholders: replaces each with String(record[fieldName] ?? '')
 *
 * Requirements: 5.1-5.6
 */
export function resolveLabel(
  labelField: string,
  record: Record<string, unknown>
): string {
  if (!labelField.includes('{')) {
    return String(record[labelField] ?? '');
  }
  return labelField.replace(/\{([^}]+)\}/g, (_, fieldName: string) =>
    String(record[fieldName] ?? '')
  );
}
