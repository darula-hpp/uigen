/**
 * Environment Variable Resolver
 * 
 * Recursively processes config objects and replaces ${ENV_VAR_NAME} references
 * with actual environment variable values.
 */

import { EnvVarParser, type ParseResult } from './env-var-parser.js';
import type { ConfigFile } from './types.js';

/**
 * Logger interface for warnings and errors
 */
export interface Logger {
  info(message: string, meta?: Record<string, unknown>): void;
  warn(message: string, meta?: Record<string, unknown>): void;
  error(message: string, meta?: Record<string, unknown>): void;
}

/**
 * Options for environment variable resolution
 */
export interface ResolverOptions {
  /** Environment variables to use (defaults to process.env) */
  env?: Record<string, string | undefined>;
  
  /** Whether to throw on missing variables (default: true) */
  strict?: boolean;
  
  /** Custom logger for warnings and errors */
  logger?: Logger;
}

/**
 * Result of environment variable resolution
 */
export interface ResolveResult {
  /** The resolved config with all env var references replaced */
  config: ConfigFile;
  
  /** List of environment variables that were resolved */
  resolvedVars: string[];
  
  /** Warnings generated during resolution */
  warnings: ResolutionWarning[];
}

/**
 * Warning generated during resolution
 */
export interface ResolutionWarning {
  /** Path to the config element where the warning occurred */
  path: string;
  
  /** Warning message */
  message: string;
  
  /** The environment variable name that caused the warning */
  varName?: string;
}

/**
 * Error thrown when environment variable resolution fails
 */
export class EnvVarResolutionError extends Error {
  constructor(
    message: string,
    public readonly varName: string,
    public readonly path: string
  ) {
    super(message);
    this.name = 'EnvVarResolutionError';
  }
}

/**
 * Default console logger implementation
 */
const defaultLogger: Logger = {
  info: (message: string, meta?: Record<string, unknown>) => {
    console.log(message, meta || '');
  },
  warn: (message: string, meta?: Record<string, unknown>) => {
    console.warn(message, meta || '');
  },
  error: (message: string, meta?: Record<string, unknown>) => {
    console.error(message, meta || '');
  },
};

/**
 * Environment Variable Resolver
 * 
 * Recursively processes config objects and replaces ${ENV_VAR_NAME} references
 * with actual environment variable values.
 */
export class EnvVarResolver {
  private parser: EnvVarParser;
  private options: Required<ResolverOptions>;
  private resolvedVars: Set<string>;
  private warnings: ResolutionWarning[];
  
  constructor(options?: ResolverOptions) {
    this.parser = new EnvVarParser();
    this.options = {
      env: options?.env ?? process.env,
      strict: options?.strict ?? true,
      logger: options?.logger ?? defaultLogger,
    };
    this.resolvedVars = new Set();
    this.warnings = [];
  }
  
  /**
   * Resolve all environment variable references in a config object
   * 
   * @param config - The config object to process
   * @returns Resolution result with resolved config and metadata
   * @throws EnvVarResolutionError if a required variable is missing
   */
  resolve(config: ConfigFile): ResolveResult {
    // Reset state
    this.resolvedVars = new Set();
    this.warnings = [];
    
    // Deep clone to avoid modifying the original
    const clonedConfig = this.deepClone(config);
    
    // Recursively traverse and resolve
    const resolvedConfig = this.traverseAndResolve(clonedConfig, 'config') as ConfigFile;
    
    return {
      config: resolvedConfig,
      resolvedVars: Array.from(this.resolvedVars),
      warnings: this.warnings,
    };
  }
  
  /**
   * Recursively traverse and resolve a value
   * 
   * @param value - The value to process
   * @param path - Current path in the config structure (for error reporting)
   * @returns Resolved value
   */
  private traverseAndResolve(value: unknown, path: string): unknown {
    // Base case: null or undefined
    if (value === null || value === undefined) {
      return value;
    }
    
    // String: check for env var references and replace
    if (typeof value === 'string') {
      return this.replaceReferences(value, path);
    }
    
    // Array: recursively process each element
    if (Array.isArray(value)) {
      return value.map((item, index) => 
        this.traverseAndResolve(item, `${path}[${index}]`)
      );
    }
    
    // Object: recursively process each property
    if (typeof value === 'object') {
      const result: Record<string, unknown> = {};
      for (const [key, val] of Object.entries(value)) {
        result[key] = this.traverseAndResolve(val, `${path}.${key}`);
      }
      return result;
    }
    
    // Primitive types (number, boolean): pass through unchanged
    return value;
  }
  
  /**
   * Replace environment variable references in a string
   * 
   * @param input - The string containing references
   * @param path - Current path in the config structure (for error reporting)
   * @returns String with all references replaced
   * @throws EnvVarResolutionError if a required variable is missing
   */
  private replaceReferences(input: string, path: string): string {
    const parseResult: ParseResult = this.parser.parse(input);
    
    if (!parseResult.hasReferences) {
      return input;
    }
    
    let result = input;
    
    // Replace in reverse order to maintain correct positions
    for (const ref of parseResult.references.reverse()) {
      const envValue = this.options.env[ref.name];
      
      if (envValue === undefined) {
        if (this.options.strict) {
          throw new EnvVarResolutionError(
            `Environment variable "${ref.name}" is not defined (referenced at ${path})`,
            ref.name,
            path
          );
        } else {
          this.warnings.push({
            path,
            message: `Environment variable "${ref.name}" is not defined`,
            varName: ref.name,
          });
          continue;
        }
      }
      
      // Track resolved variable
      this.resolvedVars.add(ref.name);
      
      // Replace the reference with the actual value
      result = result.substring(0, ref.start) + envValue + result.substring(ref.end);
    }
    
    return result;
  }
  
  /**
   * Deep clone an object to avoid modifying the original
   * 
   * @param obj - The object to clone
   * @returns Deep cloned object
   */
  private deepClone<T>(obj: T): T {
    if (obj === null || obj === undefined) {
      return obj;
    }
    
    if (typeof obj !== 'object') {
      return obj;
    }
    
    if (Array.isArray(obj)) {
      return obj.map(item => this.deepClone(item)) as unknown as T;
    }
    
    const cloned: Record<string, unknown> = {};
    // Use Object.keys to preserve undefined values
    for (const key of Object.keys(obj)) {
      cloned[key] = this.deepClone((obj as Record<string, unknown>)[key]);
    }
    
    return cloned as T;
  }
}
