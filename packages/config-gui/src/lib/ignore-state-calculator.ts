/**
 * IgnoreStateCalculator Service
 * 
 * Calculates effective ignore states for elements considering:
 * - Precedence rules (property > schema > parameter > operation > path)
 * - Inheritance from parent elements
 * - Override detection (child explicitly overriding parent)
 * - Pruning behavior (parent ignored affects children)
 * 
 * Requirements: 1.1, 1.2, 1.3, 1.4, 1.5, 1.6, 2.1, 2.2, 3.1, 3.2, 3.3, 6.1, 6.2
 */

export type ElementType = 
  | 'property' 
  | 'schema' 
  | 'parameter' 
  | 'requestBody' 
  | 'response' 
  | 'operation' 
  | 'path';

export interface IgnoreState {
  /** Raw annotation value from config (undefined if no explicit annotation) */
  explicit: boolean | undefined;
  
  /** Computed effective state considering precedence and inheritance */
  effective: boolean;
  
  /** Source of the effective state */
  source: 'explicit' | 'inherited' | 'default';
  
  /** Parent element path causing inheritance (if applicable) */
  inheritedFrom?: string;
  
  /** Whether this is an override (child has explicit false while parent has true) */
  isOverride: boolean;
}

export interface SpecNode {
  path: string;
  type: ElementType;
  name: string;
  children: SpecNode[];
  metadata?: {
    parameterType?: 'query' | 'path' | 'header' | 'cookie';
    statusCode?: string;
    schemaRef?: string;
  };
}

/**
 * Service for calculating ignore states with precedence and inheritance logic
 */
export class IgnoreStateCalculator {
  private cache = new Map<string, IgnoreState>();
  
  /**
   * Calculate the effective ignore state for an element considering
   * precedence and inheritance rules.
   * 
   * Precedence order (highest to lowest):
   * 1. Property
   * 2. Schema object
   * 3. Parameter
   * 4. Request body / Response
   * 5. Operation
   * 6. Path
   * 
   * @param elementPath - The path of the element (e.g., "components.schemas.User.properties.email")
   * @param elementType - The type of the element
   * @param annotations - Map of element paths to their ignore annotation values
   * @returns The computed ignore state
   */
  calculateState(
    elementPath: string,
    elementType: ElementType,
    annotations: Map<string, boolean>
  ): IgnoreState {
    // Check cache first
    const cacheKey = this.getCacheKey(elementPath, annotations);
    if (this.cache.has(cacheKey)) {
      return this.cache.get(cacheKey)!;
    }
    
    // Compute the state
    const state = this.computeState(elementPath, elementType, annotations);
    
    // Cache the result
    this.cache.set(cacheKey, state);
    
    return state;
  }
  
  /**
   * Determine if an element is pruned (parent is ignored and element has no explicit override)
   * 
   * @param elementPath - The path of the element
   * @param annotations - Map of element paths to their ignore annotation values
   * @returns True if the element is pruned by a parent
   */
  isPruned(
    elementPath: string,
    annotations: Map<string, boolean>
  ): boolean {
    // Check if element has explicit annotation
    const explicit = annotations.get(elementPath);
    if (explicit !== undefined) {
      // Element has explicit annotation, not pruned
      return false;
    }
    
    // Check if any parent is ignored
    const parentPath = this.getParentPath(elementPath);
    if (!parentPath) {
      // No parent, not pruned
      return false;
    }
    
    // Check parent's effective state
    const parentAnnotation = annotations.get(parentPath);
    if (parentAnnotation === true) {
      // Parent is explicitly ignored, this element is pruned
      return true;
    }
    
    // Recursively check parent's parents
    return this.isPruned(parentPath, annotations);
  }
  
  /**
   * Get all children affected by parent ignore (pruned children)
   * 
   * @param parentPath - The path of the parent element
   * @param specStructure - The spec structure tree
   * @returns Array of paths for all pruned children
   */
  getPrunedChildren(
    parentPath: string,
    specStructure: SpecNode
  ): string[] {
    const prunedChildren: string[] = [];
    
    // Find the parent node in the spec structure
    const parentNode = this.findNode(parentPath, specStructure);
    if (!parentNode) {
      return prunedChildren;
    }
    
    // Recursively collect all children
    this.collectChildren(parentNode, prunedChildren);
    
    return prunedChildren;
  }
  
  /**
   * Check if a child annotation overrides parent ignore
   * 
   * An override occurs when:
   * - Parent has x-uigen-ignore: true (explicit or inherited)
   * - Child has explicit x-uigen-ignore: false
   * 
   * @param childPath - The path of the child element
   * @param childAnnotation - The child's explicit annotation value
   * @param parentPath - The path of the parent element
   * @param parentAnnotation - The parent's annotation value
   * @returns True if the child overrides the parent
   */
  isOverride(
    childPath: string,
    childAnnotation: boolean | undefined,
    parentPath: string,
    parentAnnotation: boolean | undefined
  ): boolean {
    // Override only occurs when:
    // 1. Child has explicit false
    // 2. Parent has true (explicit or inherited)
    return childAnnotation === false && parentAnnotation === true;
  }
  
  /**
   * Invalidate the cache (call when annotations change)
   */
  invalidateCache(): void {
    this.cache.clear();
  }
  
  /**
   * Get cache statistics for performance monitoring
   * 
   * @returns Object with cache size and hit/miss statistics
   */
  getCacheStats(): { size: number; keys: string[] } {
    return {
      size: this.cache.size,
      keys: Array.from(this.cache.keys())
    };
  }
  
  /**
   * Compute the ignore state without caching
   */
  private computeState(
    elementPath: string,
    elementType: ElementType,
    annotations: Map<string, boolean>
  ): IgnoreState {
    // Check for explicit annotation on this element
    const explicit = annotations.get(elementPath);
    
    if (explicit !== undefined) {
      // Element has explicit annotation
      // Check if it's an override
      const parentPath = this.getParentPath(elementPath);
      let isOverride = false;
      let inheritedFrom: string | undefined;
      
      if (parentPath) {
        const parentAnnotation = annotations.get(parentPath);
        isOverride = this.isOverride(elementPath, explicit, parentPath, parentAnnotation);
        
        // If it's an override, we need to find which parent is being overridden
        if (isOverride) {
          inheritedFrom = parentPath;
        } else if (parentAnnotation === undefined) {
          // Parent has no explicit annotation, check if parent is inherited
          const parentState = this.computeState(parentPath, this.getElementType(parentPath), annotations);
          if (parentState.effective === true && explicit === false) {
            // Parent is effectively ignored, and child has explicit false - this is an override
            isOverride = true;
            inheritedFrom = parentState.inheritedFrom || parentPath;
          }
        }
      }
      
      return {
        explicit,
        effective: explicit,
        source: 'explicit',
        isOverride,
        inheritedFrom: isOverride ? inheritedFrom : undefined
      };
    }
    
    // No explicit annotation, check for inheritance
    const parentPath = this.getParentPath(elementPath);
    if (parentPath) {
      const parentAnnotation = annotations.get(parentPath);
      if (parentAnnotation === true) {
        // Parent is explicitly ignored, inherit that state
        return {
          explicit: undefined,
          effective: true,
          source: 'inherited',
          inheritedFrom: parentPath,
          isOverride: false
        };
      }
      
      // Check if parent is inherited from its parent
      const parentState = this.computeState(parentPath, this.getElementType(parentPath), annotations);
      if (parentState.effective === true) {
        // Parent is effectively ignored (inherited), propagate
        return {
          explicit: undefined,
          effective: true,
          source: 'inherited',
          inheritedFrom: parentState.inheritedFrom || parentPath,
          isOverride: false
        };
      }
    }
    
    // No explicit annotation and no parent ignore, default to included
    return {
      explicit: undefined,
      effective: false,
      source: 'default',
      isOverride: false
    };
  }
  
  /**
   * Get the parent path from an element path
   * 
   * Examples:
   * - "components.schemas.User.properties.email" -> "components.schemas.User"
   * - "paths./users.get.parameters.query.limit" -> "paths./users.get"
   * - "paths./users.get" -> "paths./users"
   * 
   * @param elementPath - The element path
   * @returns The parent path or undefined if no parent
   */
  private getParentPath(elementPath: string): string | undefined {
    const parts = elementPath.split('.');
    
    // Handle different path structures
    if (parts.length <= 1) {
      return undefined;
    }
    
    // For properties: remove "properties.fieldName"
    if (parts.includes('properties')) {
      const propertiesIndex = parts.lastIndexOf('properties');
      if (propertiesIndex > 0 && propertiesIndex < parts.length - 1) {
        // Return path up to the schema (before "properties")
        return parts.slice(0, propertiesIndex).join('.');
      }
    }
    
    // For parameters: remove "parameters.type.name"
    if (parts.includes('parameters')) {
      const parametersIndex = parts.lastIndexOf('parameters');
      if (parametersIndex > 0 && parametersIndex < parts.length - 2) {
        // Return path up to the operation (before "parameters")
        return parts.slice(0, parametersIndex).join('.');
      }
    }
    
    // For request body: "paths./users.get.requestBody" -> "paths./users.get"
    if (parts[parts.length - 1] === 'requestBody') {
      return parts.slice(0, -1).join('.');
    }
    
    // For responses: "paths./users.get.responses.200" -> "paths./users.get"
    if (parts.includes('responses')) {
      const responsesIndex = parts.lastIndexOf('responses');
      if (responsesIndex > 0) {
        return parts.slice(0, responsesIndex).join('.');
      }
    }
    
    // For operations: "paths./users.get" -> "paths./users"
    if (parts[0] === 'paths' && parts.length === 3) {
      return parts.slice(0, 2).join('.');
    }
    
    // Default: remove last segment
    return parts.slice(0, -1).join('.');
  }
  
  /**
   * Infer element type from path
   */
  private getElementType(elementPath: string): ElementType {
    if (elementPath.includes('.properties.')) {
      return 'property';
    }
    if (elementPath.includes('.parameters.')) {
      return 'parameter';
    }
    if (elementPath.endsWith('.requestBody')) {
      return 'requestBody';
    }
    if (elementPath.includes('.responses.')) {
      return 'response';
    }
    if (elementPath.startsWith('paths.') && elementPath.split('.').length === 3) {
      return 'operation';
    }
    if (elementPath.startsWith('paths.') && elementPath.split('.').length === 2) {
      return 'path';
    }
    if (elementPath.startsWith('components.schemas.')) {
      return 'schema';
    }
    return 'schema'; // Default
  }
  
  /**
   * Find a node in the spec structure by path
   */
  private findNode(path: string, root: SpecNode): SpecNode | undefined {
    if (root.path === path) {
      return root;
    }
    
    for (const child of root.children) {
      const found = this.findNode(path, child);
      if (found) {
        return found;
      }
    }
    
    return undefined;
  }
  
  /**
   * Recursively collect all child paths
   */
  private collectChildren(node: SpecNode, result: string[]): void {
    for (const child of node.children) {
      result.push(child.path);
      this.collectChildren(child, result);
    }
  }
  
  /**
   * Generate cache key from element path and annotations
   */
  private getCacheKey(elementPath: string, annotations: Map<string, boolean>): string {
    // Create a hash of the annotations that affect this element
    const relevantAnnotations: string[] = [];
    
    // Include annotation for this element
    const thisAnnotation = annotations.get(elementPath);
    if (thisAnnotation !== undefined) {
      relevantAnnotations.push(`${elementPath}:${thisAnnotation}`);
    }
    
    // Include annotations for all parent paths
    let currentPath = elementPath;
    while (true) {
      const parentPath = this.getParentPath(currentPath);
      if (!parentPath) break;
      
      const parentAnnotation = annotations.get(parentPath);
      if (parentAnnotation !== undefined) {
        relevantAnnotations.push(`${parentPath}:${parentAnnotation}`);
      }
      
      currentPath = parentPath;
    }
    
    // Sort for consistent cache keys
    relevantAnnotations.sort();
    
    return `${elementPath}|${relevantAnnotations.join(',')}`;
  }
}
