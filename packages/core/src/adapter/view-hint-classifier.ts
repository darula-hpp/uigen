import type { ViewHint, HttpMethod, Parameter, SchemaNode } from '../ir/types.js';

/**
 * ViewHintClassifier analyzes operations and assigns appropriate view types for UI rendering.
 * 
 * Classification Rules:
 * - GET /resources → list
 * - GET /resources/{id} → detail
 * - POST /resources → create (or wizard if >8 fields)
 * - PUT|PATCH /resources/{id} → update
 * - DELETE /resources/{id} → delete
 * - Operations with query params → search
 * - POST with >8 fields → wizard
 * - Non-CRUD operations → action
 */
export class ViewHintClassifier {
  /**
   * Classifies an operation based on HTTP method, path pattern, parameters, and request body.
   * 
   * @param method - HTTP method (GET, POST, PUT, PATCH, DELETE)
   * @param path - API path (e.g., /users, /users/{id})
   * @param parameters - Query/path/header parameters
   * @param requestBody - Request body schema (optional)
   * @returns ViewHint classification
   */
  classify(
    method: HttpMethod,
    path: string,
    parameters: Parameter[] = [],
    requestBody?: SchemaNode
  ): ViewHint {
    const hasPathParam = this.hasPathParameter(path);
    const hasQueryParams = this.hasQueryParameters(parameters);
    const fieldCount = this.countFields(requestBody);

    // DELETE operations
    if (method === 'DELETE') {
      return hasPathParam ? 'delete' : 'action';
    }

    // GET operations
    if (method === 'GET') {
      // GET with query params suggests search/filter functionality
      if (hasQueryParams) {
        return 'search';
      }
      // GET with path parameter is detail view
      if (hasPathParam) {
        return 'detail';
      }
      // GET without parameters is list view
      return 'list';
    }

    // POST operations
    if (method === 'POST') {
      // POST with path parameter is a custom action
      if (hasPathParam) {
        return 'action';
      }
      // POST with >8 fields is a wizard
      if (fieldCount > 8) {
        return 'wizard';
      }
      // POST without path parameter is create
      return 'create';
    }

    // PUT/PATCH operations
    if (method === 'PUT' || method === 'PATCH') {
      // PUT/PATCH with path parameter is update
      if (hasPathParam) {
        return 'update';
      }
      // PUT/PATCH without path parameter is a custom action
      return 'action';
    }

    // Default to action for any other cases
    return 'action';
  }

  /**
   * Checks if the path contains a path parameter (e.g., {id}, {userId}).
   * 
   * @param path - API path
   * @returns true if path contains a parameter
   */
  private hasPathParameter(path: string): boolean {
    return path.includes('{') && path.includes('}');
  }

  /**
   * Checks if the operation has query parameters (excluding pagination params).
   * 
   * @param parameters - Operation parameters
   * @returns true if there are non-pagination query parameters
   */
  private hasQueryParameters(parameters: Parameter[]): boolean {
    // Common pagination parameter names to exclude
    const paginationParams = new Set([
      'limit', 'offset', 'page', 'pageSize', 'perPage', 'per_page',
      'cursor', 'nextCursor', 'next', 'pageToken', 'continuationToken'
    ]);
    
    return parameters.some(p => 
      p.in === 'query' && !paginationParams.has(p.name)
    );
  }

  /**
   * Counts the number of fields in a request body schema.
   * For nested objects, counts all leaf fields recursively.
   * 
   * @param schema - Request body schema
   * @returns Total number of fields
   */
  private countFields(schema?: SchemaNode): number {
    if (!schema) {
      return 0;
    }

    // If it's an object with children, count all children recursively
    if (schema.type === 'object' && schema.children) {
      return schema.children.reduce((count, child) => {
        // For nested objects, count their children
        if (child.type === 'object' && child.children) {
          return count + this.countFields(child);
        }
        // For arrays, count as 1 field (the array itself)
        return count + 1;
      }, 0);
    }

    // For non-object types, count as 1 field
    return 1;
  }
}
