/**
 * ValidationEngine Service
 * 
 * Provides validation and error detection for ignore configurations:
 * - Detects when all operations in a resource are ignored
 * - Detects when all properties in a schema are ignored
 * - Detects circular references in schema $ref chains
 * 
 * Requirements: 20.1, 20.2, 20.3, 20.5
 */

import type { ConfigFile } from '@uigen-dev/core';

export interface ValidationWarning {
  type: 'all-operations-ignored' | 'all-properties-ignored' | 'circular-reference';
  severity: 'warning' | 'error';
  message: string;
  path: string;
  elementName: string;
  actionLabel: string;
}

export interface SpecStructure {
  paths?: Record<string, PathItem>;
  components?: {
    schemas?: Record<string, SchemaObject>;
  };
}

export interface PathItem {
  [method: string]: Operation | unknown;
}

export interface Operation {
  operationId?: string;
  summary?: string;
  description?: string;
}

export interface SchemaObject {
  type?: string;
  properties?: Record<string, SchemaObject | SchemaRef>;
  allOf?: (SchemaObject | SchemaRef)[];
  oneOf?: (SchemaObject | SchemaRef)[];
  anyOf?: (SchemaObject | SchemaRef)[];
}

export interface SchemaRef {
  $ref: string;
}

/**
 * Service for validating ignore configurations and detecting issues
 */
export class ValidationEngine {
  /**
   * Validate the entire configuration and return all warnings/errors
   * 
   * @param config - The config file with annotations
   * @param spec - The OpenAPI spec structure
   * @returns Array of validation warnings
   */
  validateConfig(config: ConfigFile | null, spec: SpecStructure): ValidationWarning[] {
    const warnings: ValidationWarning[] = [];

    if (!config || !spec) {
      return warnings;
    }

    // Check for all operations ignored in each resource
    warnings.push(...this.checkAllOperationsIgnored(config, spec));

    // Check for all properties ignored in each schema
    warnings.push(...this.checkAllPropertiesIgnored(config, spec));

    // Check for circular references in schemas
    warnings.push(...this.checkCircularReferences(config, spec));

    return warnings;
  }

  /**
   * Check if all operations in a resource (path) are ignored
   * 
   * Requirements: 20.1, 20.5
   */
  private checkAllOperationsIgnored(config: ConfigFile, spec: SpecStructure): ValidationWarning[] {
    const warnings: ValidationWarning[] = [];

    if (!spec.paths) {
      return warnings;
    }

    const annotations = config.annotations || {};

    for (const [path, pathItem] of Object.entries(spec.paths)) {
      const methods = ['get', 'post', 'put', 'patch', 'delete', 'options', 'head', 'trace'];
      const operations: string[] = [];
      const ignoredOperations: string[] = [];

      // Collect all operations for this path
      for (const method of methods) {
        if (pathItem[method] && typeof pathItem[method] === 'object') {
          operations.push(method);
          const operationPath = `paths.${path}.${method}`;

          // Check if operation is ignored (explicit or inherited)
          if (this.isIgnored(operationPath, annotations)) {
            ignoredOperations.push(method);
          }
        }
      }

      // If all operations are ignored, add warning
      if (operations.length > 0 && ignoredOperations.length === operations.length) {
        warnings.push({
          type: 'all-operations-ignored',
          severity: 'warning',
          message: `All operations in ${path} are ignored. This resource will not appear in the UI.`,
          path: `paths.${path}`,
          elementName: path,
          actionLabel: 'Include at least one operation'
        });
      }
    }

    return warnings;
  }

  /**
   * Check if all properties in a schema are ignored
   * 
   * Requirements: 20.2, 20.5
   */
  private checkAllPropertiesIgnored(config: ConfigFile, spec: SpecStructure): ValidationWarning[] {
    const warnings: ValidationWarning[] = [];

    if (!spec.components?.schemas) {
      return warnings;
    }

    const annotations = config.annotations || {};

    for (const [schemaName, schema] of Object.entries(spec.components.schemas)) {
      const schemaPath = `components.schemas.${schemaName}`;

      // Skip if schema itself is ignored
      if (this.isIgnored(schemaPath, annotations)) {
        continue;
      }

      // Check if schema has properties
      if (!schema.properties || Object.keys(schema.properties).length === 0) {
        continue;
      }

      const properties = Object.keys(schema.properties);
      const ignoredProperties: string[] = [];

      // Check each property
      for (const propName of properties) {
        const propPath = `${schemaPath}.properties.${propName}`;
        if (this.isIgnored(propPath, annotations)) {
          ignoredProperties.push(propName);
        }
      }

      // If all properties are ignored, add warning
      if (properties.length > 0 && ignoredProperties.length === properties.length) {
        warnings.push({
          type: 'all-properties-ignored',
          severity: 'warning',
          message: `All properties in ${schemaName} are ignored. This schema will produce empty views.`,
          path: schemaPath,
          elementName: schemaName,
          actionLabel: 'Include at least one property'
        });
      }
    }

    return warnings;
  }

  /**
   * Check for circular references in schema $ref chains
   * 
   * Requirements: 20.3, 20.5
   */
  private checkCircularReferences(config: ConfigFile, spec: SpecStructure): ValidationWarning[] {
    const warnings: ValidationWarning[] = [];

    if (!spec.components?.schemas) {
      return warnings;
    }

    // Check each schema for circular references
    for (const [schemaName, schema] of Object.entries(spec.components.schemas)) {
      const schemaPath = `components.schemas.${schemaName}`;
      const visited = new Set<string>();
      const path: string[] = [];

      const circularPath = this.detectCircular(schema, schemaName, visited, path, spec);

      if (circularPath) {
        warnings.push({
          type: 'circular-reference',
          severity: 'error',
          message: `Circular reference detected: ${circularPath.join(' -> ')}. Cannot determine ignore state.`,
          path: schemaPath,
          elementName: schemaName,
          actionLabel: 'Review schema references'
        });
      }
    }

    return warnings;
  }

  /**
   * Detect circular references in a schema recursively
   * 
   * @param schema - The schema to check
   * @param currentName - The current schema name
   * @param visited - Set of visited schema names in current path
   * @param path - Current path of schema names
   * @param spec - The full spec structure
   * @returns The circular path if found, null otherwise
   */
  private detectCircular(
    schema: SchemaObject | SchemaRef,
    currentName: string,
    visited: Set<string>,
    path: string[],
    spec: SpecStructure
  ): string[] | null {
    // Add current schema to path
    path.push(currentName);

    // Check if we've seen this schema before in the current path
    if (visited.has(currentName)) {
      // Found a cycle
      return path;
    }

    // Mark as visited
    visited.add(currentName);

    // Check $ref
    if ('$ref' in schema) {
      const refName = this.extractSchemaName(schema.$ref);
      if (refName) {
        const refSchema = spec.components?.schemas?.[refName];
        if (refSchema) {
          const result = this.detectCircular(refSchema, refName, new Set(visited), [...path], spec);
          if (result) {
            return result;
          }
        }
      }
    }

    // Check properties
    if ('properties' in schema && schema.properties) {
      for (const propSchema of Object.values(schema.properties)) {
        if ('$ref' in propSchema) {
          const refName = this.extractSchemaName(propSchema.$ref);
          if (refName) {
            const refSchema = spec.components?.schemas?.[refName];
            if (refSchema) {
              const result = this.detectCircular(refSchema, refName, new Set(visited), [...path], spec);
              if (result) {
                return result;
              }
            }
          }
        }
      }
    }

    // Check composition keywords
    const compositionKeys: (keyof SchemaObject)[] = ['allOf', 'oneOf', 'anyOf'];
    for (const key of compositionKeys) {
      if (key in schema) {
        const schemas = schema[key] as (SchemaObject | SchemaRef)[];
        if (schemas) {
          for (const s of schemas) {
            if ('$ref' in s) {
              const refName = this.extractSchemaName(s.$ref);
              if (refName) {
                const refSchema = spec.components?.schemas?.[refName];
                if (refSchema) {
                  const result = this.detectCircular(refSchema, refName, new Set(visited), [...path], spec);
                  if (result) {
                    return result;
                  }
                }
              }
            }
          }
        }
      }
    }

    return null;
  }

  /**
   * Extract schema name from $ref string
   * 
   * @param ref - The $ref string (e.g., "#/components/schemas/User")
   * @returns The schema name or null
   */
  private extractSchemaName(ref: string): string | null {
    const match = ref.match(/#\/components\/schemas\/([^/]+)/);
    return match ? match[1] : null;
  }

  /**
   * Check if a path is ignored (explicit or inherited)
   * 
   * @param path - The element path
   * @param annotations - The annotations map
   * @returns True if the path is ignored
   */
  private isIgnored(path: string, annotations: Record<string, Record<string, unknown>>): boolean {
    // Check explicit annotation on this path
    const annotation = annotations[path];
    if (annotation && annotation['x-uigen-ignore'] === true) {
      return true;
    }

    // Check parent paths for inheritance
    const pathParts = path.split('.');
    for (let i = pathParts.length - 1; i > 0; i--) {
      const parentPath = pathParts.slice(0, i).join('.');
      const parentAnnotation = annotations[parentPath];

      if (parentAnnotation && parentAnnotation['x-uigen-ignore'] === true) {
        // Parent is ignored, check if current path has explicit override
        if (annotation && annotation['x-uigen-ignore'] === false) {
          // Explicit override, not ignored
          return false;
        }
        // Inherited ignore
        return true;
      }
    }

    return false;
  }
}
