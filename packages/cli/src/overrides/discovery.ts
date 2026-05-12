import fg from 'fast-glob';
import { resolve } from 'path';
import { existsSync, accessSync, constants } from 'fs';

/**
 * Options for discovering override files
 */
export interface DiscoveryOptions {
  /**
   * Source directory to scan for override files
   */
  srcDir: string;
  /**
   * Enable verbose logging
   */
  verbose?: boolean;
}

/**
 * Represents a discovered override file
 */
export interface DiscoveredOverride {
  /**
   * Absolute path to the override file
   */
  filePath: string;
  /**
   * Path relative to the source directory
   */
  relativePath: string;
}

/**
 * Discovers override files in the source directory.
 * 
 * Scans for TypeScript/TSX files in src/ directory recursively,
 * excluding node_modules/ and .uigen/ directories.
 * 
 * @param options - Discovery options
 * @returns Array of discovered override files
 * 
 * @example
 * ```typescript
 * const overrides = await discoverOverrides({
 *   srcDir: '/path/to/project/src',
 *   verbose: true
 * });
 * ```
 */
export async function discoverOverrides(
  options: DiscoveryOptions
): Promise<DiscoveredOverride[]> {
  const { srcDir, verbose = false } = options;

  // Handle missing src/ directory gracefully
  if (!existsSync(srcDir)) {
    if (verbose) {
      console.log(`[UIGen Overrides] Source directory does not exist: ${srcDir}`);
    }
    return [];
  }

  // Check for read permissions on src/ directory
  try {
    accessSync(srcDir, constants.R_OK);
  } catch (error) {
    if (verbose) {
      console.warn(`[UIGen Overrides] Permission denied reading directory: ${srcDir}`);
    }
    return [];
  }

  try {
    // Use fast-glob to find all .ts and .tsx files in src/ directory
    // Exclude node_modules/ and .uigen/ directories
    const pattern = '**/*.{ts,tsx}';
    const ignore = ['**/node_modules/**', '**/.uigen/**'];

    const files = await fg(pattern, {
      cwd: srcDir,
      absolute: false,
      ignore,
      onlyFiles: true,
    });

    // Map to DiscoveredOverride objects
    const overrides: DiscoveredOverride[] = files.map((file) => ({
      filePath: resolve(srcDir, file),
      relativePath: file,
    }));

    if (verbose) {
      console.log(`[UIGen Overrides] Discovered ${overrides.length} file(s) in ${srcDir}`);
    }

    return overrides;
  } catch (error) {
    // Handle any other errors during file discovery
    if (verbose) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      console.warn(`[UIGen Overrides] Error during discovery: ${errorMessage}`);
    }
    return [];
  }
}
