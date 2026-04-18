import type { SchemaReference } from '../components/VisualEditor/Panels/ReferencesPanel.js';
import type { ConfigFile } from '@uigen-dev/core';

/**
 * Tracks references to a schema object across the OpenAPI spec
 * 
 * Finds all operations and properties that reference a given schema
 * through $ref, request bodies, or responses.
 */

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
  requestBody?: RequestBody;
  responses?: Record<string, Response>;
  parameters?: Parameter[];
}

export interface RequestBody {
  content?: Record<string, MediaType>;
}

export interface Response {
  content?: Record<string, MediaType>;
}

export interface MediaType {
  schema?: SchemaObject | SchemaRef;
}

export interface SchemaObject {
  type?: string;
  properties?: Record<string, SchemaObject | SchemaRef>;
  items?: SchemaObject | SchemaRef;
  allOf?: (SchemaObject | SchemaRef)[];
  oneOf?: (SchemaObject | SchemaRef)[];
  anyOf?: (SchemaObject | SchemaRef)[];
}

export interface SchemaRef {
  $ref: string;
}

export interface Parameter {
  schema?: SchemaObject | SchemaRef;
}

/**
 * Finds all references to a schema in the spec
 */
export function findSchemaReferences(
  schemaPath: string,
  spec: SpecStructure,
  config: ConfigFile | null
): SchemaReference[] {
  const references: SchemaReference[] = [];
  const schemaName = extractSchemaName(schemaPath);
  const annotations = config?.annotations || {};

  if (!schemaName || !spec.paths) {
    return references;
  }

  // Search through all paths and operations
  for (const [path, pathItem] of Object.entries(spec.paths)) {
    const methods = ['get', 'post', 'put', 'patch', 'delete', 'options', 'head', 'trace'];

    for (const method of methods) {
      const operation = pathItem[method] as Operation | undefined;
      if (!operation) continue;

      // Check request body
      if (operation.requestBody) {
        const hasRef = checkRequestBodyForSchema(operation.requestBody, schemaName);
        if (hasRef) {
          const refPath = `paths.${path}.${method}.requestBody`;
          references.push({
            type: 'requestBody',
            path: refPath,
            displayName: `${method.toUpperCase()} ${path}`,
            method: method.toUpperCase(),
            isIgnored: isPathIgnored(refPath, annotations)
          });
        }
      }

      // Check responses
      if (operation.responses) {
        for (const [statusCode, response] of Object.entries(operation.responses)) {
          const hasRef = checkResponseForSchema(response, schemaName);
          if (hasRef) {
            const refPath = `paths.${path}.${method}.responses.${statusCode}`;
            references.push({
              type: 'response',
              path: refPath,
              displayName: `${method.toUpperCase()} ${path}`,
              method: method.toUpperCase(),
              statusCode,
              isIgnored: isPathIgnored(refPath, annotations)
            });
          }
        }
      }
    }
  }

  // Search through schema properties for $ref
  if (spec.components?.schemas) {
    for (const [name, schema] of Object.entries(spec.components.schemas)) {
      const propertyRefs = findPropertyReferences(schema, schemaName, `components.schemas.${name}`);
      for (const propRef of propertyRefs) {
        references.push({
          type: 'property',
          path: propRef.path,
          displayName: propRef.displayName,
          isIgnored: isPathIgnored(propRef.path, annotations)
        });
      }
    }
  }

  return references;
}

function extractSchemaName(schemaPath: string): string | null {
  // Extract schema name from path like "components.schemas.User"
  const match = schemaPath.match(/components\.schemas\.([^.]+)/);
  return match ? match[1] : null;
}

function checkRequestBodyForSchema(requestBody: RequestBody, schemaName: string): boolean {
  if (!requestBody.content) return false;

  for (const mediaType of Object.values(requestBody.content)) {
    if (mediaType.schema && hasSchemaReference(mediaType.schema, schemaName)) {
      return true;
    }
  }

  return false;
}

function checkResponseForSchema(response: Response, schemaName: string): boolean {
  if (!response.content) return false;

  for (const mediaType of Object.values(response.content)) {
    if (mediaType.schema && hasSchemaReference(mediaType.schema, schemaName)) {
      return true;
    }
  }

  return false;
}

function hasSchemaReference(schema: SchemaObject | SchemaRef, schemaName: string): boolean {
  // Check direct $ref
  if ('$ref' in schema) {
    const refName = schema.$ref.split('/').pop();
    if (refName === schemaName) {
      return true;
    }
  }

  // Check in SchemaObject
  if ('properties' in schema && schema.properties && !('$ref' in schema)) {
    for (const prop of Object.values(schema.properties)) {
      if (hasSchemaReference(prop, schemaName)) {
        return true;
      }
    }
  }

  // Check in array items
  if ('items' in schema && schema.items) {
    if (hasSchemaReference(schema.items, schemaName)) {
      return true;
    }
  }

  // Check in composition keywords
  const compositionKeys: (keyof SchemaObject)[] = ['allOf', 'oneOf', 'anyOf'];
  for (const key of compositionKeys) {
    if (!('$ref' in schema) && key in schema) {
      const schemas = (schema as SchemaObject)[key] as (SchemaObject | SchemaRef)[] | undefined;
      if (schemas) {
        for (const s of schemas) {
          if (hasSchemaReference(s, schemaName)) {
            return true;
          }
        }
      }
    }
  }

  return false;
}

interface PropertyReference {
  path: string;
  displayName: string;
}

function findPropertyReferences(
  schema: SchemaObject,
  targetSchemaName: string,
  basePath: string
): PropertyReference[] {
  const references: PropertyReference[] = [];

  if (!('properties' in schema) || !schema.properties || '$ref' in schema) return references;

  for (const [propName, propSchema] of Object.entries(schema.properties)) {
    const propPath = `${basePath}.properties.${propName}`;

    if (hasSchemaReference(propSchema, targetSchemaName)) {
      references.push({
        path: propPath,
        displayName: `${basePath.split('.').pop()}.${propName}`
      });
    }

    // Recursively check nested properties
    if ('properties' in propSchema && propSchema.properties && !('$ref' in propSchema)) {
      const nestedRefs = findPropertyReferences(propSchema, targetSchemaName, propPath);
      references.push(...nestedRefs);
    }
  }

  return references;
}

function isPathIgnored(path: string, annotations: Record<string, Record<string, unknown>>): boolean {
  // Check if the path or any parent path has x-uigen-ignore: true
  const pathParts = path.split('.');

  for (let i = pathParts.length; i > 0; i--) {
    const checkPath = pathParts.slice(0, i).join('.');
    const annotation = annotations[checkPath];

    if (annotation && annotation['x-uigen-ignore'] === true) {
      return true;
    }
  }

  return false;
}
