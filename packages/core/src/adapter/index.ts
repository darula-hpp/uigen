import yaml from 'js-yaml';
import type { OpenAPIV3 } from 'openapi-types';
import { OpenAPI3Adapter } from './openapi3.js';
import { Swagger2Adapter } from './swagger2.js';
import type { UIGenApp } from '../ir/types.js';

export { SchemaResolver } from './schema-resolver.js';
export { OpenAPI3Adapter } from './openapi3.js';
export { Swagger2Adapter } from './swagger2.js';
export { ViewHintClassifier } from './view-hint-classifier.js';
export { RelationshipDetector } from './relationship-detector.js';
export { PaginationDetector } from './pagination-detector.js';
export { Resource_Extractor } from './resource-extractor.js';
export type { OperationAdapter } from './resource-extractor.js';
export { IgnoreHandler, LabelHandler, RefHandler } from './annotations/handlers/index.js';
export { AnnotationHandlerRegistry } from './annotations/index.js';
export type { AnnotationHandler } from './annotations/index.js';
export { deriveRelationshipType } from './relationship-type-deriver.js';
export { LayoutParser } from './layout-parser.js';

export async function parseSpec(content: string): Promise<UIGenApp> {
  let doc: unknown;

  try {
    doc = JSON.parse(content);
  } catch {
    doc = yaml.load(content);
  }

  if (!doc || typeof doc !== 'object') {
    throw new Error('Invalid spec format');
  }

  const spec = doc as Record<string, unknown>;

  // Check for OpenAPI 3.x
  if ('openapi' in spec && typeof spec.openapi === 'string' && spec.openapi.startsWith('3.')) {
    const adapter = new OpenAPI3Adapter(spec as unknown as OpenAPIV3.Document);
    return adapter.adapt();
  }

  // Check for Swagger 2.0
  if (Swagger2Adapter.canHandle(spec)) {
    const adapter = new Swagger2Adapter(spec as any);
    return adapter.adapt();
  }

  throw new Error('Unsupported spec version. Only OpenAPI 3.x and Swagger 2.0 are supported.');
}
