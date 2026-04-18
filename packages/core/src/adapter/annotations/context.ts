import type { OpenAPIV3 } from 'openapi-types';
import type {
  UIGenApp,
  Resource,
  Operation,
  SchemaNode,
  HttpMethod,
  ParsingError
} from '../../ir/types.js';
import type { AnnotationContext, AdapterUtils, SpecElement } from './types.js';

/**
 * Implementation of AnnotationContext.
 * Provides immutable access to the spec element and adapter utilities.
 */
export class AnnotationContextImpl implements AnnotationContext {
  constructor(
    public readonly element: SpecElement,
    public readonly path: string,
    public readonly utils: AdapterUtils,
    public readonly ir: UIGenApp,
    public readonly parent?: SpecElement,
    public readonly method?: HttpMethod,
    public readonly resource?: Resource,
    public readonly operation?: Operation,
    public readonly schemaNode?: SchemaNode
  ) {}
}

/**
 * Create an AnnotationContext for an operation.
 */
export function createOperationContext(
  operation: OpenAPIV3.OperationObject,
  pathItem: OpenAPIV3.PathItemObject,
  path: string,
  method: HttpMethod,
  utils: AdapterUtils,
  ir: UIGenApp,
  resource?: Resource,
  operationNode?: Operation
): AnnotationContext {
  return new AnnotationContextImpl(
    operation,
    path,
    utils,
    ir,
    pathItem,
    method,
    resource,
    operationNode
  );
}

/**
 * Create an AnnotationContext for a schema node.
 */
export function createSchemaContext(
  schema: OpenAPIV3.SchemaObject | OpenAPIV3.ReferenceObject,
  key: string,
  utils: AdapterUtils,
  ir: UIGenApp,
  parent?: SpecElement,
  schemaNode?: SchemaNode
): AnnotationContext {
  return new AnnotationContextImpl(
    schema,
    key,
    utils,
    ir,
    parent,
    undefined,
    undefined,
    undefined,
    schemaNode
  );
}

/**
 * Create an AnnotationContext for a server object.
 */
export function createServerContext(
  server: OpenAPIV3.ServerObject,
  utils: AdapterUtils,
  ir: UIGenApp
): AnnotationContext {
  return new AnnotationContextImpl(
    server as any,
    '',
    utils,
    ir,
    undefined,
    undefined,
    undefined,
    undefined,
    undefined
  );
}
