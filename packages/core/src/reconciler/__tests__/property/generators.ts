/**
 * Fast-check generators for property-based testing
 * 
 * Generates valid OpenAPI/Swagger specs, config files, element paths, and annotations.
 */

import fc from 'fast-check';
import type { OpenAPIV3 } from 'openapi-types';
import type { Swagger2Document } from '../../types';

/**
 * Generate a valid HTTP method
 */
export const httpMethod = () =>
  fc.constantFrom('GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS', 'HEAD');

/**
 * Generate a valid path segment
 */
const pathSegment = () =>
  fc.oneof(
    fc.stringMatching(/^[a-z]{3,10}$/), // Simple segment
    fc.tuple(fc.stringMatching(/^[a-z]{3,10}$/), fc.stringMatching(/^[a-z]{2,8}$/)).map(
      ([name, param]) => `{${param}}`
    ) // Path parameter
  );

/**
 * Generate a valid API path
 */
export const apiPath = () =>
  fc
    .array(pathSegment(), { minLength: 1, maxLength: 4 })
    .map((segments) => '/' + segments.join('/'));

/**
 * Generate a valid schema name
 */
export const schemaName = () => fc.stringMatching(/^[A-Z][a-zA-Z]{2,15}$/);

/**
 * Generate a valid property name
 */
export const propertyName = () => fc.stringMatching(/^[a-z][a-zA-Z]{2,15}$/);

/**
 * Generate a valid annotation name
 */
export const annotationName = () =>
  fc
    .stringMatching(/^[a-z]{3,15}$/)
    .map((name) => `x-uigen-${name}`);

/**
 * Generate a valid annotation value
 */
export const annotationValue = () =>
  fc.oneof(
    fc.boolean(),
    fc.string(),
    fc.integer(),
    fc.constant(null),
    fc.record({
      nested: fc.string(),
    })
  );

/**
 * Generate a simple schema property
 */
const simpleProperty = (): fc.Arbitrary<Record<string, unknown>> =>
  fc.record({
    type: fc.constantFrom('string', 'number', 'integer', 'boolean'),
  });

/**
 * Generate a nested object property (limited depth)
 */
const nestedProperty = (depth: number): fc.Arbitrary<Record<string, unknown>> => {
  if (depth <= 0) {
    return simpleProperty();
  }

  return fc.record({
    type: fc.constant('object'),
    properties: fc.dictionary(
      propertyName(),
      fc.oneof(simpleProperty(), nestedProperty(depth - 1)),
      { minKeys: 1, maxKeys: 3 }
    ),
  });
};

/**
 * Generate a schema object
 */
const schema = (): fc.Arbitrary<Record<string, unknown>> =>
  fc.record({
    type: fc.constant('object'),
    properties: fc.dictionary(propertyName(), fc.oneof(simpleProperty(), nestedProperty(2)), {
      minKeys: 1,
      maxKeys: 5,
    }),
  });

/**
 * Generate an operation object
 */
const operation = (): fc.Arbitrary<Record<string, unknown>> =>
  fc.record({
    summary: fc.option(fc.string(), { nil: undefined }),
    responses: fc.record({
      '200': fc.record({
        description: fc.constant('Success'),
      }),
    }),
  });

/**
 * Generate a valid OpenAPI 3.x spec
 */
export const generateValidSpec = (): fc.Arbitrary<OpenAPIV3.Document> =>
  fc.record({
    openapi: fc.constant('3.0.0'),
    info: fc.record({
      title: fc.string({ minLength: 1, maxLength: 50 }),
      version: fc.stringMatching(/^\d+\.\d+\.\d+$/),
    }),
    paths: fc.dictionary(
      apiPath(),
      fc.record({
        get: fc.option(operation(), { nil: undefined }),
        post: fc.option(operation(), { nil: undefined }),
        put: fc.option(operation(), { nil: undefined }),
        delete: fc.option(operation(), { nil: undefined }),
      }),
      { minKeys: 1, maxKeys: 10 }
    ),
    components: fc.option(
      fc.record({
        schemas: fc.dictionary(schemaName(), schema(), { minKeys: 0, maxKeys: 10 }),
      }),
      { nil: undefined }
    ),
  }) as fc.Arbitrary<OpenAPIV3.Document>;

/**
 * Generate a valid Swagger 2.0 spec
 */
export const generateValidSwagger2Spec = (): fc.Arbitrary<Swagger2Document> =>
  fc.record({
    swagger: fc.constant('2.0'),
    info: fc.record({
      title: fc.string({ minLength: 1, maxLength: 50 }),
      version: fc.stringMatching(/^\d+\.\d+\.\d+$/),
    }),
    paths: fc.dictionary(
      apiPath(),
      fc.record({
        get: fc.option(operation(), { nil: undefined }),
        post: fc.option(operation(), { nil: undefined }),
        put: fc.option(operation(), { nil: undefined }),
        delete: fc.option(operation(), { nil: undefined }),
      }),
      { minKeys: 1, maxKeys: 10 }
    ),
    definitions: fc.option(
      fc.dictionary(schemaName(), schema(), { minKeys: 0, maxKeys: 10 }),
      { nil: undefined }
    ),
  }) as fc.Arbitrary<Swagger2Document>;

/**
 * Generate an operation element path from a spec
 */
export const generateOperationPath = (spec: OpenAPIV3.Document | Swagger2Document): string[] => {
  const paths: string[] = [];

  if (spec.paths) {
    for (const [path, pathItem] of Object.entries(spec.paths)) {
      if (!pathItem || typeof pathItem !== 'object') continue;

      for (const method of ['get', 'post', 'put', 'patch', 'delete', 'options', 'head']) {
        if (method in pathItem) {
          paths.push(`${method.toUpperCase()}:${path}`);
        }
      }
    }
  }

  return paths;
};

/**
 * Generate a schema property element path from a spec
 */
export const generateSchemaPropertyPath = (
  spec: OpenAPIV3.Document | Swagger2Document
): string[] => {
  const paths: string[] = [];

  const schemas =
    ('components' in spec && spec.components?.schemas) ||
    ('definitions' in spec && spec.definitions) ||
    {};

  for (const [schemaName, schema] of Object.entries(schemas)) {
    if (!schema || typeof schema !== 'object') continue;

    const properties = (schema as Record<string, unknown>).properties as
      | Record<string, unknown>
      | undefined;
    if (properties && typeof properties === 'object') {
      for (const propName of Object.keys(properties)) {
        paths.push(`${schemaName}.${propName}`);
      }
    }
  }

  return paths;
};

/**
 * Generate a valid element path from a spec
 */
export const generateElementPath = (
  spec: OpenAPIV3.Document | Swagger2Document
): fc.Arbitrary<string> => {
  const operationPaths = generateOperationPath(spec);
  const schemaPaths = generateSchemaPropertyPath(spec);
  const allPaths = [...operationPaths, ...schemaPaths];

  if (allPaths.length === 0) {
    // Fallback if spec has no paths
    return fc.constant('GET:/fallback');
  }

  return fc.constantFrom(...allPaths);
};

/**
 * Generate a valid config file
 */
export const generateValidConfig = (
  spec?: OpenAPIV3.Document | Swagger2Document
): fc.Arbitrary<{
  version: string;
  enabled: Record<string, boolean>;
  defaults: Record<string, Record<string, unknown>>;
  annotations: Record<string, Record<string, unknown>>;
}> => {
  if (spec) {
    // Generate config with element paths from the spec
    return fc.record({
      version: fc.constant('1.0'),
      enabled: fc.dictionary(annotationName(), fc.boolean(), { minKeys: 0, maxKeys: 3 }),
      defaults: fc.dictionary(
        annotationName(),
        fc.dictionary(fc.string(), fc.string(), { minKeys: 0, maxKeys: 2 }),
        { minKeys: 0, maxKeys: 2 }
      ),
      annotations: fc.dictionary(
        generateElementPath(spec),
        fc.dictionary(annotationName(), annotationValue(), { minKeys: 1, maxKeys: 3 }),
        { minKeys: 1, maxKeys: 5 }
      ),
    });
  }

  // Generate config with arbitrary element paths
  return fc.record({
    version: fc.constant('1.0'),
    enabled: fc.dictionary(annotationName(), fc.boolean(), { minKeys: 0, maxKeys: 3 }),
    defaults: fc.dictionary(
      annotationName(),
      fc.dictionary(fc.string(), fc.string(), { minKeys: 0, maxKeys: 2 }),
      { minKeys: 0, maxKeys: 2 }
    ),
    annotations: fc.dictionary(
      fc.oneof(
        fc.tuple(httpMethod(), apiPath()).map(([method, path]) => `${method}:${path}`),
        fc.tuple(schemaName(), propertyName()).map(([schema, prop]) => `${schema}.${prop}`)
      ),
      fc.dictionary(annotationName(), annotationValue(), { minKeys: 1, maxKeys: 3 }),
      { minKeys: 1, maxKeys: 5 }
    ),
  });
};

/**
 * Generate an annotation
 */
export const generateAnnotation = (): fc.Arbitrary<[string, unknown]> =>
  fc.tuple(annotationName(), annotationValue());
