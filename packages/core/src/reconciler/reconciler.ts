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
import type { RelationshipConfig } from '../config/types.js';
import type { OverrideConfig } from '../ir/types.js';
import { ElementPathResolver } from './path-resolver.js';
import { AnnotationMerger } from './merger.js';
import { Validator } from './validator.js';
import { deepClone } from './utils.js';
import { validateRelationships } from './relationship-validator.js';
import { AuthReconciler, type OAuthProviderConfig } from './auth-reconciler.js';
import { HttpMethodOverrideReconciler } from './http-method-override-reconciler.js';
import { EnvVarResolver } from '../config/env-var-resolver.js';

/**
 * Configuration file interface
 */
interface ConfigFile {
  version: string;
  enabled: Record<string, boolean>;
  defaults: Record<string, Record<string, unknown>>;
  annotations: Record<string, Record<string, unknown>>;
  relationships?: RelationshipConfig[];
  auth?: {
    providers?: OAuthProviderConfig[];
  };
}

/**
 * Parse x-uigen-override annotation
 * 
 * @param annotation - Raw annotation value from OpenAPI spec
 * @returns Parsed OverrideConfig or undefined if invalid
 */
export function parseOverrideAnnotation(annotation: unknown): OverrideConfig | undefined {
  // Annotation must be an object
  if (typeof annotation !== 'object' || annotation === null) {
    return undefined;
  }
  
  const obj = annotation as Record<string, unknown>;
  
  // id property is required and must be a string
  if (typeof obj.id !== 'string' || obj.id.trim() === '') {
    return undefined;
  }
  
  // enabled property is optional and defaults to true
  const enabled = typeof obj.enabled === 'boolean' ? obj.enabled : true;
  
  return {
    id: obj.id.trim(),
    enabled,
  };
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
  private authReconciler: AuthReconciler;
  private httpMethodOverrideReconciler: HttpMethodOverrideReconciler;
  private envVarResolver: EnvVarResolver;

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
    this.authReconciler = new AuthReconciler();
    this.httpMethodOverrideReconciler = new HttpMethodOverrideReconciler();
    this.envVarResolver = new EnvVarResolver({
      logger: this.logger,
      strict: true,
    });
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
      // NEW: Resolve environment variables before processing
      this.logger.info('Resolving environment variables');
      const resolveResult = this.envVarResolver.resolve(config);
      const resolvedConfig = resolveResult.config;
      
      this.logger.info('Environment variable resolution complete', {
        resolvedVars: resolveResult.resolvedVars.length,
        warnings: resolveResult.warnings.length,
      });
      
      // Log any warnings from env var resolution
      for (const warning of resolveResult.warnings) {
        this.logger.warn(warning.message, { path: warning.path });
      }

      // Deep clone source spec to avoid mutation
      const clonedSpec = deepClone(sourceSpec);

      // Merge annotations using resolved config
      const mergeResult = this.merger.merge(clonedSpec, resolvedConfig, this.resolver);

      // Reconcile HTTP method overrides after annotation merging
      this.logger.info('Reconciling HTTP method overrides');
      const httpMethodOverrideResult = this.httpMethodOverrideReconciler.reconcile(mergeResult.modifiedSpec);
      
      this.logger.info('HTTP method override reconciliation complete', {
        overrideCount: httpMethodOverrideResult.overrideCount,
        warnings: httpMethodOverrideResult.warnings.length,
      });
      
      // Use the spec with HTTP method overrides applied
      let reconciledSpec = httpMethodOverrideResult.spec;

      // Build warnings for unresolved paths
      const warnings: ReconciliationWarning[] = mergeResult.skippedPaths.map((elementPath) => {
        const suggestions = this.resolver.suggestSimilarPaths(sourceSpec, elementPath);
        return {
          elementPath,
          message: `Element path not found: ${elementPath}`,
          suggestion: suggestions.length > 0 ? `Did you mean: ${suggestions.join(', ')}?` : undefined,
        };
      });
      
      // Add HTTP method override warnings
      for (const warning of httpMethodOverrideResult.warnings) {
        this.logger.warn(`HTTP method override warning: ${warning}`);
        warnings.push({
          elementPath: 'http-method-override',
          message: warning,
        });
      }

      // Reconcile OAuth providers if auth config exists
      if ((resolvedConfig as any).auth) {
        this.logger.info('Reconciling OAuth providers', {
          providerCount: (resolvedConfig as any).auth.providers?.length || 0,
        });

        const authResult = this.authReconciler.reconcile(reconciledSpec, resolvedConfig as any);
        reconciledSpec = authResult.spec;

        // Add OAuth validation errors as warnings
        if (authResult.errors.length > 0) {
          for (const error of authResult.errors) {
            this.logger.warn(`OAuth configuration error: ${error}`);
            warnings.push({
              elementPath: 'config.auth.providers',
              message: error,
            });
          }
        }

        this.logger.info('OAuth reconciliation complete', {
          reconciledProviders: authResult.reconciledProviders,
          errors: authResult.errors.length,
        });
      }

      // Validate and collect relationships (pass-through, never injected into spec)
      const { validRelationships, warnings: relationshipWarnings } = validateRelationships(
        resolvedConfig.relationships ?? []
      );

      // Merge relationship warnings into the warnings array
      warnings.push(...relationshipWarnings);

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
        const validationResult = this.validator.validate(reconciledSpec);

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
        spec: reconciledSpec,
        appliedAnnotations: mergeResult.appliedCount,
        warnings,
        relationships: validRelationships,
      };
    } catch (error) {
      // EnvVarResolutionError will propagate and halt the pipeline
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
