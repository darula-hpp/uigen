/**
 * Utility functions for the reconciliation system
 */

/**
 * Deep clone an object
 * 
 * Uses structuredClone if available (Node 17+), otherwise falls back to JSON round-trip.
 * 
 * @param obj - The object to clone
 * @returns A deep clone of the object
 */
export function deepClone<T>(obj: T): T {
  // Use structuredClone if available (Node 17+)
  if (typeof structuredClone !== 'undefined') {
    return structuredClone(obj);
  }

  // Fallback: JSON round-trip (loses functions, but specs are pure data)
  return JSON.parse(JSON.stringify(obj));
}

/**
 * Calculate Levenshtein distance between two strings
 * 
 * Uses dynamic programming algorithm for efficiency.
 * 
 * @param a - First string
 * @param b - Second string
 * @returns The Levenshtein distance
 */
export function levenshteinDistance(a: string, b: string): number {
  const matrix: number[][] = [];

  // Initialize matrix
  for (let i = 0; i <= b.length; i++) {
    matrix[i] = [i];
  }

  for (let j = 0; j <= a.length; j++) {
    matrix[0][j] = j;
  }

  // Fill matrix
  for (let i = 1; i <= b.length; i++) {
    for (let j = 1; j <= a.length; j++) {
      if (b.charAt(i - 1) === a.charAt(j - 1)) {
        matrix[i][j] = matrix[i - 1][j - 1];
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1, // substitution
          matrix[i][j - 1] + 1, // insertion
          matrix[i - 1][j] + 1 // deletion
        );
      }
    }
  }

  return matrix[b.length][a.length];
}
