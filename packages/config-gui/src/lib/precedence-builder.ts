import type { AnnotationLevel, ElementInfo } from '../components/VisualEditor/Panels/PrecedencePanel.js';
import type { ConfigFile } from '@uigen-dev/core';

/**
 * Builds the annotation hierarchy for a given element path
 * 
 * This function constructs the precedence chain showing all levels
 * where an annotation could exist, from most specific to least specific.
 * 
 * Precedence order: property > schema > parameter > operation > path
 */
export function buildAnnotationHierarchy(
  elementPath: string,
  elementType: string,
  config: ConfigFile | null
): AnnotationLevel[] {
  const annotations = config?.annotations || {};
  const hierarchy: AnnotationLevel[] = [];

  // Parse the element path to determine hierarchy
  const pathParts = elementPath.split('.');

  // Determine the hierarchy based on element type
  if (elementType === 'property') {
    // Property level (most specific)
    hierarchy.push(createLevel('property', elementPath, annotations, elementPath));

    // Schema level (if property is part of a schema)
    const schemaPath = extractSchemaPath(elementPath);
    if (schemaPath) {
      hierarchy.push(createLevel('schema', schemaPath, annotations, schemaPath));
    }

    // Operation level (if schema is used in an operation)
    const operationPath = extractOperationPath(elementPath);
    if (operationPath) {
      hierarchy.push(createLevel('operation', operationPath, annotations, operationPath));
    }

    // Path level (if operation is part of a path)
    const pathItemPath = extractPathItemPath(elementPath);
    if (pathItemPath) {
      hierarchy.push(createLevel('path', pathItemPath, annotations, pathItemPath));
    }
  } else if (elementType === 'schema') {
    // Schema level
    hierarchy.push(createLevel('schema', elementPath, annotations, elementPath));

    // Operation level (if schema is used in an operation)
    const operationPath = extractOperationPath(elementPath);
    if (operationPath) {
      hierarchy.push(createLevel('operation', operationPath, annotations, operationPath));
    }

    // Path level
    const pathItemPath = extractPathItemPath(elementPath);
    if (pathItemPath) {
      hierarchy.push(createLevel('path', pathItemPath, annotations, pathItemPath));
    }
  } else if (elementType === 'parameter') {
    // Parameter level
    hierarchy.push(createLevel('parameter', elementPath, annotations, elementPath));

    // Operation level
    const operationPath = extractOperationPath(elementPath);
    if (operationPath) {
      hierarchy.push(createLevel('operation', operationPath, annotations, operationPath));
    }

    // Path level
    const pathItemPath = extractPathItemPath(elementPath);
    if (pathItemPath) {
      hierarchy.push(createLevel('path', pathItemPath, annotations, pathItemPath));
    }
  } else if (elementType === 'requestBody' || elementType === 'response') {
    // Request body or response level (treated as operation-level elements)
    hierarchy.push(
      createLevel(
        'operation',
        elementPath,
        annotations,
        elementPath
      )
    );

    // Path level
    const pathItemPath = extractPathItemPath(elementPath);
    if (pathItemPath) {
      hierarchy.push(createLevel('path', pathItemPath, annotations, pathItemPath));
    }
  } else if (elementType === 'operation') {
    // Operation level
    hierarchy.push(createLevel('operation', elementPath, annotations, elementPath));

    // Path level
    const pathItemPath = extractPathItemPath(elementPath);
    if (pathItemPath) {
      hierarchy.push(createLevel('path', pathItemPath, annotations, pathItemPath));
    }
  } else if (elementType === 'path') {
    // Path level only
    hierarchy.push(createLevel('path', elementPath, annotations, elementPath));
  }

  // Determine which level is active (has the annotation that takes effect)
  markActiveLevel(hierarchy);

  return hierarchy;
}

function createLevel(
  level: 'property' | 'schema' | 'parameter' | 'operation' | 'path',
  path: string,
  annotations: Record<string, Record<string, unknown>>,
  displayPath: string
): AnnotationLevel {
  const annotation = annotations[path]?.['x-uigen-ignore'] as boolean | undefined;

  return {
    level,
    path,
    annotation,
    isActive: false, // Will be set by markActiveLevel
    displayName: getLevelDisplayName(level, path)
  };
}

function getLevelDisplayName(
  level: 'property' | 'schema' | 'parameter' | 'operation' | 'path',
  path: string
): string {
  const levelNames = {
    property: 'Property',
    schema: 'Schema',
    parameter: 'Parameter',
    operation: 'Operation',
    path: 'Path'
  };

  // Extract a more specific name from the path
  const parts = path.split('.');
  const lastPart = parts[parts.length - 1];

  return `${levelNames[level]}: ${lastPart}`;
}

function markActiveLevel(hierarchy: AnnotationLevel[]): void {
  // Find the first level with an annotation (most specific)
  const activeIndex = hierarchy.findIndex(level => level.annotation !== undefined);

  if (activeIndex !== -1) {
    hierarchy[activeIndex].isActive = true;
  }
}

function extractSchemaPath(elementPath: string): string | null {
  // Extract schema path from property path
  // e.g., "components.schemas.User.properties.email" -> "components.schemas.User"
  const match = elementPath.match(/^(components\.schemas\.[^.]+)/);
  return match ? match[1] : null;
}

function extractOperationPath(elementPath: string): string | null {
  // Extract operation path from element path
  // e.g., "paths./users.get.requestBody" -> "paths./users.get"
  // e.g., "paths./users.get.parameters.query.limit" -> "paths./users.get"
  const match = elementPath.match(/^(paths\.[^.]+\.[^.]+)/);
  return match ? match[1] : null;
}

function extractPathItemPath(elementPath: string): string | null {
  // Extract path item from element path
  // e.g., "paths./users.get" -> "paths./users"
  const match = elementPath.match(/^(paths\.[^.]+)(?:\.|$)/);
  return match ? match[1] : null;
}

/**
 * Helper to create ElementInfo from a path and type
 */
export function createElementInfo(
  path: string,
  type: 'property' | 'schema' | 'parameter' | 'requestBody' | 'response' | 'operation' | 'path',
  name?: string
): ElementInfo {
  const parts = path.split('.');
  const defaultName = parts[parts.length - 1] || path;

  return {
    path,
    type,
    name: name || defaultName
  };
}
