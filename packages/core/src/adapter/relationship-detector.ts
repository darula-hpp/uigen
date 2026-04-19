import type { Operation, Relationship, Resource, SchemaNode } from '../ir/types.js';

/**
 * RelationshipDetector analyzes operations and schemas to detect relationships
 * between resources (hasMany, belongsTo).
 * 
 * Detection strategies:
 * - Path-based: /resources/{id}/related indicates hasMany relationship
 * - Schema-based: Fields with format "uri" matching resource paths indicate belongsTo
 */
export class RelationshipDetector {
  /**
   * Detect hasMany relationships from path patterns.
   * Pattern: /resources/{id}/related indicates resources hasMany related
   * 
   * @param resource - The resource to analyze
   * @param allResources - Map of all available resources by slug
   * @returns Array of detected relationships
   */
  detectFromPaths(resource: Resource, allResources: Map<string, Resource>): Relationship[] {
    const relationships: Relationship[] = [];
    
    // Escape special regex characters in the slug
    const escapedSlug = this.escapeRegex(resource.slug);
    
    // Pattern: /resourceSlug/{id}/relatedSlug
    const pattern = new RegExp(`^/${escapedSlug}/\\{[^}]+\\}/([^/]+)$`);
    
    for (const op of resource.operations) {
      const match = op.path.match(pattern);
      if (match) {
        const targetSlug = match[1];
        
        // Verify the target resource exists
        if (allResources.has(targetSlug)) {
          // Avoid duplicates
          const exists = relationships.some(
            r => r.target === targetSlug && r.type === 'hasMany'
          );
          
          if (!exists) {
            relationships.push({
              target: targetSlug,
              type: 'hasMany',
              path: op.path
            });
          }
        }
      }
    }
    
    return relationships;
  }
  
  /**
   * Detect belongsTo relationships from schema fields.
   * Fields with format "uri" that match resource paths indicate belongsTo.
   * 
   * @param schema - The schema to analyze
   * @param allResources - Map of all available resources by slug
   * @returns Array of detected relationships
   */
  detectFromSchema(schema: SchemaNode, allResources: Map<string, Resource>): Relationship[] {
    const relationships: Relationship[] = [];
    
    // Recursively search for URI fields in the schema
    this.findUriFields(schema, allResources, relationships);
    
    return relationships;
  }
  
  /**
   * Recursively find fields with format "uri" and match them to resources.
   */
  private findUriFields(
    node: SchemaNode,
    allResources: Map<string, Resource>,
    relationships: Relationship[]
  ): void {
    // Check if this field is a URI
    if (node.format === 'uri') {
      // Try to match the field name or description to a resource
      for (const [slug, resource] of allResources.entries()) {
        // Match if field name contains resource slug (e.g., "userId" matches "users")
        const fieldLower = node.key.toLowerCase();
        const slugLower = slug.toLowerCase();
        
        // Remove trailing 's' from slug for singular matching (e.g., "users" -> "user")
        const singularSlug = slugLower.endsWith('s') ? slugLower.slice(0, -1) : slugLower;
        
        // Check for patterns like "userId", "user_id", "user-id", or just "user"
        const patterns = [
          slugLower,
          singularSlug,
          `${singularSlug}id`,
          `${singularSlug}_id`,
          `${singularSlug}-id`
        ];
        
        if (patterns.some(pattern => fieldLower.includes(pattern))) {
          // Avoid duplicates
          const exists = relationships.some(
            r => r.target === slug && r.type === 'belongsTo'
          );
          
          if (!exists) {
            relationships.push({
              target: slug,
              type: 'belongsTo',
              path: `/${slug}/{id}` // Construct the detail path
            });
          }
          break; // Only match to one resource
        }
      }
    }
    
    // Recursively check children for objects
    if (node.children) {
      for (const child of node.children) {
        this.findUriFields(child, allResources, relationships);
      }
    }
    
    // Recursively check items for arrays
    if (node.items) {
      this.findUriFields(node.items, allResources, relationships);
    }
  }
  
  /**
   * Detect many-to-many relationships from path patterns.
   * Pattern: /consumer/{id}/library indicates a many-to-many relationship
   * where library is a reusable resource.
   * 
   * Detection criteria:
   * 1. Path matches /resourceA/{id}/resourceB
   * 2. resourceB has standalone collection endpoint (GET /resourceB)
   * 3. resourceB has standalone creation endpoint (POST /resourceB)
   * 4. Has GET operation (list associations)
   * 5. Has POST or DELETE operations (create/remove associations)
   * 6. Mark isReadOnly=true if only GET exists
   * 
   * @param resource - The consumer resource to analyze
   * @param allResources - Map of all available resources by slug
   * @returns Array of detected many-to-many relationships
   */
  detectManyToMany(
    resource: Resource,
    allResources: Map<string, Resource>
  ): Relationship[] {
    const relationships: Relationship[] = [];
    
    // Escape special regex characters in the slug
    const escapedSlug = this.escapeRegex(resource.slug);
    
    // Pattern: /resourceSlug/{id}/targetSlug
    const pattern = new RegExp(`^/${escapedSlug}/\\{[^}]+\\}/([^/]+)$`);
    
    // Group operations by path to analyze association endpoints
    const pathOperations = new Map<string, Operation[]>();
    for (const op of resource.operations) {
      const existing = pathOperations.get(op.path) || [];
      existing.push(op);
      pathOperations.set(op.path, existing);
    }
    
    // Analyze each path for many-to-many patterns
    for (const [path, operations] of pathOperations.entries()) {
      const match = path.match(pattern);
      if (!match) continue;
      
      const targetSlug = match[1];
      
      // Verify the target resource exists (with slug normalization)
      let targetResource: Resource | undefined = allResources.get(targetSlug);
      let actualTargetSlug = targetSlug;
      
      // If not found directly, try to find by normalized slug
      if (!targetResource) {
        for (const [slug, res] of allResources.entries()) {
          if (this.slugsMatch(targetSlug, slug)) {
            targetResource = res;
            actualTargetSlug = slug;
            break;
          }
        }
      }
      
      if (!targetResource) continue;
      
      // Verify target resource has standalone collection endpoint (GET /targetSlug)
      const hasCollectionEndpoint = targetResource.operations.some(
        op => op.path === `/${actualTargetSlug}` && op.method === 'GET'
      );
      if (!hasCollectionEndpoint) continue;
      
      // Verify target resource has standalone creation endpoint (POST /targetSlug)
      const hasCreationEndpoint = targetResource.operations.some(
        op => op.path === `/${actualTargetSlug}` && op.method === 'POST'
      );
      if (!hasCreationEndpoint) continue;
      
      // Check for GET operation on association endpoint (list associations)
      const hasGetOperation = operations.some(op => op.method === 'GET');
      if (!hasGetOperation) continue;
      
      // Check for POST or DELETE operations on association endpoint
      const hasPostOperation = operations.some(op => op.method === 'POST');
      const hasDeleteOperation = operations.some(op => op.method === 'DELETE');
      const isReadOnly = !hasPostOperation && !hasDeleteOperation;
      
      // Avoid duplicates
      const exists = relationships.some(
        r => r.target === actualTargetSlug && r.type === 'manyToMany'
      );
      
      if (!exists) {
        relationships.push({
          target: actualTargetSlug,
          type: 'manyToMany',
          path: path,
          isReadOnly: isReadOnly
        });
      }
    }
    
    return relationships;
  }
  
  /**
   * Mark resources as libraries based on detected many-to-many relationships.
   * A resource is marked as a library if:
   * 1. It is the target of one or more manyToMany relationships
   * 2. It has standalone CRUD endpoints (GET and POST at minimum)
   * 
   * This method should be called after all relationships are detected.
   * 
   * @param allResources - Map of all resources by slug
   * @param relationships - Array of all detected relationships across all resources
   */
  markLibraryResources(
    allResources: Map<string, Resource>,
    relationships: Relationship[]
  ): void {
    // Find all unique target resources from manyToMany relationships
    const libraryTargets = new Set<string>();
    
    for (const relationship of relationships) {
      if (relationship.type === 'manyToMany') {
        libraryTargets.add(relationship.target);
      }
    }
    
    // Mark each target resource as a library if it has standalone CRUD endpoints
    for (const targetSlug of libraryTargets) {
      const targetResource = allResources.get(targetSlug);
      if (!targetResource) continue;
      
      // Verify target has standalone collection endpoint (GET /targetSlug)
      const hasCollectionEndpoint = targetResource.operations.some(
        op => op.path === `/${targetSlug}` && op.method === 'GET'
      );
      
      // Verify target has standalone creation endpoint (POST /targetSlug)
      const hasCreationEndpoint = targetResource.operations.some(
        op => op.path === `/${targetSlug}` && op.method === 'POST'
      );
      
      // Only mark as library if both endpoints exist
      if (hasCollectionEndpoint && hasCreationEndpoint) {
        targetResource.isLibrary = true;
      }
    }
  }
  
  /**
   * Normalize a slug for comparison by converting to lowercase and handling plural forms.
   * Removes trailing 's' to convert plural forms to singular.
   * 
   * Examples:
   * - "users" -> "user"
   * - "templates" -> "template"
   * - "categories" -> "categorie" (handles irregular plurals)
   * - "tags" -> "tag"
   * 
   * @param slug - The slug to normalize
   * @returns Normalized slug in singular form
   */
  normalizeSlug(slug: string): string {
    const lower = slug.toLowerCase();
    // Remove trailing 's' for plural forms
    return lower.endsWith('s') ? lower.slice(0, -1) : lower;
  }
  
  /**
   * Compare two slugs for equality after normalization.
   * Handles singular/plural variations (e.g., "user" matches "users").
   * 
   * Examples:
   * - slugsMatch("users", "user") -> true
   * - slugsMatch("templates", "template") -> true
   * - slugsMatch("tags", "tag") -> true
   * - slugsMatch("user", "product") -> false
   * 
   * @param slug1 - First slug to compare
   * @param slug2 - Second slug to compare
   * @returns True if slugs match after normalization
   */
  slugsMatch(slug1: string, slug2: string): boolean {
    return this.normalizeSlug(slug1) === this.normalizeSlug(slug2);
  }
  
  /**
   * Escape special regex characters in a string.
   */
  private escapeRegex(str: string): string {
    return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }
}
