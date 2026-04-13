import type { Relationship, Resource, SchemaNode } from '../ir/types.js';

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
   * Escape special regex characters in a string.
   */
  private escapeRegex(str: string): string {
    return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }
}
