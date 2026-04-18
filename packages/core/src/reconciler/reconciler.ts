/**
 * Core Reconciler
 * 
 * Orchestrates the reconciliation process, merging config annotations into
 * OpenAPI/Swagger specifications.
 */

import type { OpenAPIV3 } from 'openapi-types';
import type {
  ReconciledSpec,
  ReconcilerOptions,
  ReconciliationWarning,
  Swagger2Document,
  Logger,
} from './types.js';
import { ElementPathResolver } from './path-resolver.js';
import { AnnotationMerger } from './merger.js';
import { Validator } from './validator.js';
import { deepClone } from './utils.js';

/**
 * Configuration file interface
 */
interface ConfigFile {
  version: string;
  enabled: Record<string, boolean>;
  defaults: Record<string, Record<string, unknown>>;
  annotations: Record<string, Record<string, unknown>>;
}

/**
 * Default logger implementation
 */
class ConsoleLogger implements Logger {
  private logLevel: 'debug' | 'info' | 'warn' | 'error';

  constructor(logLevel: 'debug' | 'info' | 'warn' | 'error' = 'info') {
    this.logLevel = logLevel;
  }

  private shouldLog(level: 'debug' | 'info' | 'warn' | 'error'): boolean {
    const levels = ['debug', 'info', 'warn', 'error'];
    return levels.indexOf(level) >= levels.indexOf(this.logLevel);
  }

  debug(message: string, context?: Record<string, unknown>): void {
    if (this.shouldLog('debug')) {
      console.debug(`[DEBUG] ${message}`, context || '');
    }
  }

  info(message: string, context?: Record<string, unknown>): void {
    if (this.shouldLog('info')) {
      console.info(`[INFO] ${message}`, context || '');
    }
  }

  warn(message: string, context?: Record<string, unknown>): void {
    if (this.shouldLog('warn')) {
      console.warn(`[WARN] ${message}`, context || '');
    }
  }

  error(message: string, context?: Record<string, unknown>): void {
    if (this.shouldLog('error')) {
      console.error(`[ERROR] ${message}`, context || '');
    }
  }
}

/**
 * Core Reconciler
 * 
 * Orchestrates the reconciliation process.
 */
export class Reconciler {
  private options: Required<ReconcilerOptions>;
  private logger: Logger;
  private resolver: ElementPathResolver;
  private merger: AnnotationMerger;
  private validator: Validator;

  constructor(options: ReconcilerOptions = {}) {
    this.options = {
      logLevel: options.logLevel || 'info',
      validateOutput: options.validateOutput !== false,
      strictMode: options.strictMode || false,
    };

    this.logger = new ConsoleLogger(this.options.logLevel);
    this.resolver = new ElementPathResolver();
    this.merger = new AnnotationMerger(this.logger);
    this.validator = new Validator();
  }

  /**
   * Reconcile a spec with config annotations
   * 
   * @param sourceSpec - The source OpenAPI/Swagger specification
   * @param config - The config file with annotation overrides
   * @returns The reconciled spec with metadata
   * @throws Error if validation fails or strict mode is enabled and paths are unresolved
   */
  reconcile(
    sourceSpec: OpenAPIV3.Document | Swagger2Document,
    config: ConfigFile
  ): ReconciledSpec {
    this.logger.info('Starting reconciliation', {
      configVersion: config.version,
      annotationCount: Object.keys(config.annotations).length,
    });

    try {
      // Deep clone source spec to avoid mutation
      const clonedSpec = deepClone(sourceSpec);

      // Merge annotations
      const mergeResult = this.merger.merge(clonedSpec, config, this.resolver);

      // Build warnings for unresolved paths
      const warnings: ReconciliationWarning[] = mergeResult.skippedPaths.map((elementPath) => {
        const suggestions = this.resolver.suggestSimilarPaths(sourceSpec, elementPath);
        return {
          elementPath,
          message: `Element path not found: ${elementPath}`,
          suggestion: suggestions.length > 0 ? `Did you mean: ${suggestions.join(', ')}?` : undefined,
        };
      });

      // Log warnings
      for (const warning of warnings) {
        this.logger.warn(warning.message, {
          elementPath: warning.elementPath,
          suggestion: warning.suggestion,
        });
      }

      // Strict mode: fail if any paths were unresolved
      if (this.options.strictMode && mergeResult.skippedPaths.length > 0) {
        throw new Error(
          `Strict mode: ${mergeResult.skippedPaths.length} element path(s) could not be resolved`
        );
      }

      // Validate reconciled spec
      if (this.options.validateOutput) {
        const validationResult = this.validator.validate(mergeResult.modifiedSpec);

        if (!validationResult.valid) {
          const errorMessages = validationResult.errors
            .map((err) => `${err.path}: ${err.message}`)
            .join(', ');
          throw new Error(`Reconciled spec is invalid: ${errorMessages}`);
        }
      }

      this.logger.info('Reconciliation complete', {
        appliedAnnotations: mergeResult.appliedCount,
        warnings: warnings.length,
      });

      return {
        spec: mergeResult.modifiedSpec,
        appliedAnnotations: mergeResult.appliedCount,
        warnings,
      };
    } catch (error) {
      this.logger.error('Reconciliation failed', {
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }

  /**
   * Clear the path resolution cache
   * 
   * Useful when reconciling multiple specs or when the spec changes.
   */
  clearCache(): void {
    this.resolver.clearCache();
  }
}
