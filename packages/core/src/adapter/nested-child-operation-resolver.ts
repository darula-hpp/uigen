import type { Operation, Relationship, Resource } from '../ir/types.js';

/**
 * Discovers nested child operations and parent-query inference for list views.
 */
export class NestedChildOperationResolver {
  static findNestedListOperation(
    detailOperation: Operation | undefined,
    resources: Resource[],
    currentResource?: Resource
  ): Operation | undefined {
    if (!detailOperation) {
      return undefined;
    }

    const explicitId = detailOperation.detailStreamConfig?.operationId;
    if (explicitId) {
      const explicit = NestedChildOperationResolver.findOperationById(
        explicitId,
        resources,
        currentResource
      );
      if (explicit && explicit.method === 'GET') {
        return explicit;
      }
    }

    const searchPool =
      resources.length > 0
        ? resources
        : currentResource
          ? [currentResource]
          : [];

    const detailPath = detailOperation.path.replace(/\/$/, '');
    const nestedPrefix = `${detailPath}/`;

    for (const resource of searchPool) {
      for (const operation of resource.operations) {
        if (!NestedChildOperationResolver.isNestedListCandidate(operation, detailPath, nestedPrefix)) {
          continue;
        }

        return operation;
      }
    }

    return undefined;
  }

  private static isNestedListCandidate(
    operation: Operation,
    detailPath: string,
    nestedPrefix: string
  ): boolean {
    if (operation.method !== 'GET' || !operation.path.startsWith(nestedPrefix)) {
      return false;
    }

    if (operation.path.replace(/\/$/, '') === detailPath) {
      return false;
    }

    switch (operation.viewHint) {
      case 'list':
      case 'search':
        return true;
      default:
        return operation.responses?.['200']?.schema?.type === 'array';
    }
  }

  static findResourceForOperation(
    operation: Operation | undefined,
    resources: Resource[],
    currentResource?: Resource
  ): Resource | undefined {
    if (!operation) {
      return undefined;
    }

    const searchPool =
      resources.length > 0
        ? resources
        : currentResource
          ? [currentResource]
          : [];

    return searchPool.find((resource) =>
      resource.operations.some((candidate) => candidate.id === operation.id)
    );
  }

  /** Last path segment of a nested list op (e.g. readings). */
  static nestedListTargetSlug(nestedListOperation?: Operation): string | null {
    if (!nestedListOperation) {
      return null;
    }

    return NestedChildOperationResolver.pathTail(nestedListOperation.path);
  }

  /**
   * Hide hasMany nav when the relationship path is a nested list under this detail op
   * (already shown inline via DetailChildStreamPanel).
   */
  static shouldHideEmbeddedHasMany(
    relationship: Relationship,
    detailOperation?: Operation,
    nestedListOperation?: Operation
  ): boolean {
    if (relationship.type !== 'hasMany' || !detailOperation?.path || !relationship.path) {
      return false;
    }

    if (nestedListOperation) {
      const nestedTarget = NestedChildOperationResolver.nestedListTargetSlug(nestedListOperation);
      if (nestedTarget && relationship.target === nestedTarget) {
        return true;
      }
    }

    const detailPath = detailOperation.path.replace(/\/$/, '');
    return relationship.path.startsWith(`${detailPath}/`);
  }

  static findOperationById(
    operationId: string,
    resources: Resource[],
    currentResource?: Resource
  ): Operation | undefined {
    const searchPool =
      resources.length > 0
        ? resources
        : currentResource
          ? [currentResource]
          : [];

    for (const resource of searchPool) {
      const match = resource.operations.find(
        (operation) => operation.id === operationId || operation.operationId === operationId
      );
      if (match) {
        return match;
      }
    }

    return undefined;
  }

  static shouldHideHasManyRelationship(
    relationshipTarget: string,
    nestedListOperation?: Operation
  ): boolean {
    const nestedTarget = NestedChildOperationResolver.nestedListTargetSlug(nestedListOperation);
    if (!nestedTarget) {
      return false;
    }

    return relationshipTarget === nestedTarget;
  }

  static buildQueryDefaults(operation?: Operation): Record<string, string> {
    const params: Record<string, string> = {};

    if (!operation?.parameters) {
      return params;
    }

    for (const param of operation.parameters) {
      if (param.in !== 'query' || param.schema.default === undefined) {
        continue;
      }

      params[param.name] = String(param.schema.default);
    }

    return params;
  }

  /**
   * When a flat list op is used with ?parentId=, infer the query param that filters
   * by the parent id from a nested list op on the same resource or elsewhere in the app.
   */
  static inferParentQueryParamName(
    listOperation: Operation | undefined,
    resource: Resource,
    allResources: Resource[] = []
  ): string | null {
    if (!listOperation || listOperation.path.includes('{')) {
      return null;
    }

    const sameResourceParam = NestedChildOperationResolver.inferFromResourceOperations(
      listOperation,
      resource.operations
    );
    if (sameResourceParam) {
      return sameResourceParam;
    }

    const listTail = NestedChildOperationResolver.pathTail(listOperation.path);
    if (!listTail) {
      return null;
    }

    for (const candidateResource of allResources) {
      const param = NestedChildOperationResolver.inferFromResourceOperations(
        listOperation,
        candidateResource.operations,
        listTail
      );
      if (param) {
        return param;
      }
    }

    return null;
  }

  private static inferFromResourceOperations(
    listOperation: Operation,
    operations: Operation[],
    requiredPathTail?: string
  ): string | null {
    const nestedPathOp = operations.find((operation) => {
      if (operation.viewHint !== 'list' && operation.viewHint !== 'search') {
        return false;
      }

      if (!operation.path.includes('{')) {
        return false;
      }

      if (requiredPathTail) {
        return NestedChildOperationResolver.pathTail(operation.path) === requiredPathTail;
      }

      return true;
    });

    if (!nestedPathOp) {
      return null;
    }

    const match = nestedPathOp.path.match(/\{([^}]+)\}/g);
    const pathParamName = match?.[0]?.slice(1, -1);
    if (!pathParamName) {
      return null;
    }

    const hasQueryParam = listOperation.parameters?.some(
      (param) => param.in === 'query' && param.name === pathParamName
    );

    return hasQueryParam ? pathParamName : null;
  }

  private static pathTail(path: string): string | null {
    const segments = path.split('/').filter(Boolean);
    return segments.length > 0 ? segments[segments.length - 1] : null;
  }
}
