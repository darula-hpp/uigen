import { build } from 'esbuild';
import type { DiscoveredOverride } from './discovery.js';
import { getCached, setCached } from './cache.js';

/**
 * Options for transpiling override files
 */
export interface TranspileOptions {
  /**
   * Array of discovered override files to transpile
   */
  files: DiscoveredOverride[];
  /**
   * Build mode (development or production)
   */
  mode: 'development' | 'production';
  /**
   * Enable verbose logging
   */
  verbose?: boolean;
  /**
   * Enable caching (defaults to true in development mode)
   */
  useCache?: boolean;
}

/**
 * Error that occurred during transpilation
 */
export interface TranspileError {
  /**
   * File path where the error occurred
   */
  filePath: string;
  /**
   * Error message
   */
  message: string;
  /**
   * Line number (if available)
   */
  line?: number;
  /**
   * Column number (if available)
   */
  column?: number;
}

/**
 * Warning that occurred during transpilation
 */
export interface TranspileWarning {
  /**
   * File path where the warning occurred
   */
  filePath: string;
  /**
   * Warning message
   */
  message: string;
}

/**
 * Result of transpilation
 */
export interface TranspileResult {
  /**
   * Bundled JavaScript code as a string
   */
  code: string;
  /**
   * Array of errors that occurred during transpilation
   */
  errors: TranspileError[];
  /**
   * Array of warnings that occurred during transpilation
   */
  warnings: TranspileWarning[];
}

/**
 * Transpiles a single override file using esbuild.
 * 
 * @param filePath - Path to the file to transpile
 * @param mode - Build mode
 * @param verbose - Enable verbose logging
 * @returns Transpiled code or null if transpilation failed
 */
async function transpileSingleFile(
  filePath: string,
  mode: 'development' | 'production',
  verbose: boolean
): Promise<{ code: string | null; errors: TranspileError[]; warnings: TranspileWarning[] }> {
  const errors: TranspileError[] = [];
  const warnings: TranspileWarning[] = [];

  try {
    // Plugin to replace React imports with window.React
    const replaceReactImportsPlugin = {
      name: 'replace-react-imports',
      setup(build: any) {
        build.onLoad({ filter: /\.(tsx?|jsx?)$/ }, async (args: any) => {
          const fs = await import('fs');
          let contents = await fs.promises.readFile(args.path, 'utf8');
          
          // Replace React imports with window.React assignments
          contents = contents
            .replace(/import\s+React\s*,\s*\{\s*([^}]+)\s*\}\s+from\s+['"]react['"]/g, 
              'const React = window.React; const {$1} = window.React')
            .replace(/import\s+React\s+from\s+['"]react['"]/g, 
              'const React = window.React')
            .replace(/import\s+\*\s+as\s+React\s+from\s+['"]react['"]/g, 
              'const React = window.React')
            .replace(/import\s+\{\s*([^}]+)\s*\}\s+from\s+['"]react['"]/g, 
              'const {$1} = window.React')
            .replace(/import\s+['"]react\/jsx-runtime['"]/g, 
              '// react/jsx-runtime handled by window.React')
            .replace(/import\s+type\s+\{[^}]+\}\s+from\s+['"]@uigen-dev\/react['"]/g,
              '// types removed');
          
          return { contents, loader: args.path.endsWith('.tsx') ? 'tsx' : 'ts' };
        });
      },
    };

    const buildOptions: any = {
      entryPoints: [filePath],
      bundle: true,
      format: 'esm',
      target: 'es2020',
      minify: mode === 'production',
      sourcemap: mode === 'development' ? 'inline' : false,
      write: false,
      platform: 'browser',
      jsx: 'transform',
      jsxFactory: 'window.React.createElement',
      jsxFragment: 'window.React.Fragment',
      logLevel: 'silent',
      plugins: [replaceReactImportsPlugin],
      external: [],
    };

    const result = await build(buildOptions);

    // Collect errors
    if (result.errors.length > 0) {
      for (const error of result.errors) {
        errors.push({
          filePath: error.location?.file || filePath,
          message: error.text,
          line: error.location?.line,
          column: error.location?.column,
        });

        if (verbose) {
          console.error(
            `[UIGen Overrides] Error in ${error.location?.file || filePath}:`,
            error.text
          );
        }
      }
      return { code: null, errors, warnings };
    }

    // Collect warnings
    if (result.warnings.length > 0) {
      for (const warning of result.warnings) {
        warnings.push({
          filePath: warning.location?.file || filePath,
          message: warning.text,
        });

        if (verbose) {
          console.warn(
            `[UIGen Overrides] Warning in ${warning.location?.file || filePath}:`,
            warning.text
          );
        }
      }
    }

    // Extract code
    let code = '';
    if (result.outputFiles && result.outputFiles.length > 0) {
      code = result.outputFiles.map((file) => file.text).join('\n');
    }

    return { code: code || null, errors, warnings };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    
    if (verbose) {
      console.error(`[UIGen Overrides] Failed to transpile ${filePath}:`, errorMessage);
    }

    errors.push({
      filePath,
      message: errorMessage,
    });

    return { code: null, errors, warnings };
  }
}

/**
 * Transpiles override files using esbuild.
 * 
 * Bundles all override files into a single JavaScript string using esbuild.
 * Configured for browser compatibility (ES2020, IIFE format).
 * 
 * In development mode with caching enabled, uses in-memory cache keyed by
 * file path + mtime to avoid re-transpiling unchanged files.
 * 
 * Returns partial bundle if some files fail (non-fatal errors).
 * 
 * @param options - Transpilation options
 * @returns Transpilation result with bundled code and any errors/warnings
 * 
 * @example
 * ```typescript
 * const result = await transpileOverrides({
 *   files: discoveredFiles,
 *   mode: 'development',
 *   verbose: true,
 *   useCache: true
 * });
 * 
 * if (result.errors.length === 0) {
 *   console.log('Transpilation successful:', result.code);
 * } else {
 *   console.log('Partial transpilation with errors:', result.errors);
 * }
 * ```
 */
export async function transpileOverrides(
  options: TranspileOptions
): Promise<TranspileResult> {
  const { files, mode, verbose = false, useCache = mode === 'development' } = options;

  // If no files to transpile, return empty result
  if (files.length === 0) {
    if (verbose) {
      console.log('[UIGen Overrides] No files to transpile');
    }
    return {
      code: '',
      errors: [],
      warnings: [],
    };
  }

  const errors: TranspileError[] = [];
  const warnings: TranspileWarning[] = [];
  const transpiledCodes: string[] = [];

  if (verbose) {
    console.log(`[UIGen Overrides] Transpiling ${files.length} file(s) in ${mode} mode...`);
  }

  // Transpile each file individually to support caching and partial bundles
  for (const file of files) {
    let code: string | null = null;

    // Check cache in development mode
    if (useCache) {
      code = getCached(file.filePath);
      if (code && verbose) {
        console.log(`[UIGen Overrides] Using cached code for ${file.relativePath}`);
      }
    }

    // Transpile if not cached
    if (code === null) {
      const result = await transpileSingleFile(file.filePath, mode, verbose);
      
      // Collect errors and warnings
      errors.push(...result.errors);
      warnings.push(...result.warnings);

      if (result.code) {
        code = result.code;
        
        // Cache successful transpilation in development mode
        if (useCache) {
          setCached(file.filePath, code);
        }

        if (verbose) {
          console.log(`[UIGen Overrides] Transpiled ${file.relativePath}`);
        }
      } else {
        // Transpilation failed for this file
        if (verbose) {
          console.error(`[UIGen Overrides] Skipping ${file.relativePath} due to errors`);
        }
        continue; // Skip this file, continue with others (partial bundle)
      }
    }

    // Add to bundle
    if (code) {
      transpiledCodes.push(code);
    }
  }

  // Combine all transpiled codes into a single bundle that returns an array
  // Each transpiled code is ESM format, we need to convert to a format that works
  // in both Node (for validation) and browser (for runtime)
  let bundledCode = '';
  
  if (transpiledCodes.length > 0) {
    // Wrap each ESM module to extract its default export
    const wrappedCodes = transpiledCodes.map((code) => {
      // Convert ESM to a function that returns the default export
      // Replace "export default" with "return"
      const modifiedCode = code
        .replace(/export\s+default\s+/g, 'return ')
        .replace(/export\s*{\s*(\w+)\s+as\s+default\s*}/g, 'return $1');
      
      return `(function() {
  ${modifiedCode}
})()`;
    });
    
    // Create final bundle that returns array of all overrides
    bundledCode = `(function() {
  return [
    ${wrappedCodes.join(',\n    ')}
  ];
})()`;
  }

  if (verbose && bundledCode) {
    const sizeKB = (Buffer.byteLength(bundledCode, 'utf-8') / 1024).toFixed(2);
    const successCount = transpiledCodes.length;
    const failCount = files.length - successCount;
    console.log(
      `[UIGen Overrides] Transpilation complete: ${successCount}/${files.length} files, ${sizeKB} KB` +
      (failCount > 0 ? ` (${failCount} failed)` : '')
    );
  }

  return {
    code: bundledCode,
    errors,
    warnings,
  };
}
