import { statSync } from 'fs';

/**
 * Cache entry for a transpiled override file
 */
interface CacheEntry {
  /**
   * File modification time in milliseconds
   */
  mtime: number;
  /**
   * Transpiled code for this file
   */
  code: string;
}

/**
 * In-memory cache for transpiled override files.
 * Keys are file paths, values contain mtime and transpiled code.
 */
const cache = new Map<string, CacheEntry>();

/**
 * Gets cached transpiled code for a file if it exists and is still valid.
 * 
 * The cache is considered valid if the file's modification time hasn't changed.
 * 
 * @param filePath - Absolute path to the file
 * @returns Cached code if valid, null otherwise
 * 
 * @example
 * ```typescript
 * const cached = getCached('/path/to/override.tsx');
 * if (cached) {
 *   console.log('Using cached code');
 * } else {
 *   // Need to transpile
 * }
 * ```
 */
export function getCached(filePath: string): string | null {
  const entry = cache.get(filePath);
  if (!entry) {
    return null;
  }

  try {
    const stat = statSync(filePath);
    if (stat.mtimeMs !== entry.mtime) {
      // File has been modified, invalidate cache
      cache.delete(filePath);
      return null;
    }

    return entry.code;
  } catch (error) {
    // File no longer exists or can't be accessed
    cache.delete(filePath);
    return null;
  }
}

/**
 * Stores transpiled code in the cache with the file's current modification time.
 * 
 * @param filePath - Absolute path to the file
 * @param code - Transpiled code to cache
 * 
 * @example
 * ```typescript
 * const transpiledCode = await transpile(filePath);
 * setCached(filePath, transpiledCode);
 * ```
 */
export function setCached(filePath: string, code: string): void {
  try {
    const stat = statSync(filePath);
    cache.set(filePath, {
      mtime: stat.mtimeMs,
      code,
    });
  } catch (error) {
    // If we can't stat the file, don't cache it
    // This is a non-fatal error
  }
}

/**
 * Clears the entire cache.
 * Useful for testing or when forcing a full rebuild.
 * 
 * @example
 * ```typescript
 * clearCache();
 * console.log('Cache cleared');
 * ```
 */
export function clearCache(): void {
  cache.clear();
}

/**
 * Gets the current size of the cache (number of cached files).
 * 
 * @returns Number of files in the cache
 * 
 * @example
 * ```typescript
 * console.log(`Cache contains ${getCacheSize()} files`);
 * ```
 */
export function getCacheSize(): number {
  return cache.size;
}
