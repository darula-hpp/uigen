/**
 * Annotation Merger
 * 
 * Merges annotations from config into a spec, handling config-takes-precedence
 * semantics, annotation removal (null values), and deterministic ordering.
 */

import type { OpenAPIV3 } from 'openapi-types';
import type { MergeResult, Swagger2Document, Logger } from './types';
import type { ElementPathResolver } from './path-resolver';
import { deepClone } from './utils';

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
 * Annotation Merger
 * 
 * Applies annotations from config to spec with deterministic ordering.
 */
export class AnnotationMerger {
  private logger?: Logger;

  constructor(logger?: Logger) {
    this.logger = logger;
  }

  /**
   * Merge annotations from config into spec
   * 
   * @param spec - The source specification
   * @param config - The config file with annotations
   * @param resolver - The element path resolver
   * @returns The merge result with modified spec and metadata
   */
  merge(
    spec: OpenAPIV3.Document | Swagger2Document,
    config: ConfigFile,
    resolver: ElementPathResolver
  ): MergeResult {
    // Deep clone spec before modification
    const clonedSpec = deepClone(spec);
    let appliedCount = 0;
    const skippedPaths: string[] = [];

    // Sort element paths for deterministic ordering
    const sortedPaths = Object.keys(config.annotations).sort();

    for (const elementPath of sortedPaths) {
      const annotations = config.annotations[elementPath];
      const resolved = resolver.resolve(clonedSpec, elementPath);

      if (!resolved) {
        skippedPaths.push(elementPath);
        this.logger?.warn(`Element path not found: ${elementPath}`);
        continue;
      }

      // Sort annotation names for deterministic application
      const sortedAnnotations = Object.keys(annotations).sort();

      for (const annotationName of sortedAnnotations) {
        const value = annotations[annotationName];

        // IMPORTANT: Generic handling - no hardcoded annotation names
        // This works for ALL x-uigen-* annotations (current and future)
        if (value === null) {
          // Remove annotation
          delete resolved.object[annotationName];
        } else {
          // Set or override annotation
          resolved.object[annotationName] = value;
        }

        appliedCount++;
        this.logger?.debug(`Applied ${annotationName} to ${elementPath}`);
      }
    }

    return {
      modifiedSpec: clonedSpec,
      appliedCount,
      skippedPaths,
    };
  }
}
