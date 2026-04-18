/**
 * PruningEngine Service
 * 
 * Manages child visibility calculation when parents are ignored.
 * Handles the "Show Pruned Elements" toggle state and determines
 * which children should be hidden in the UI.
 * 
 * Requirements: 6.1, 6.2, 6.3, 6.4, 8.1, 8.2, 8.3, 8.4
 */

import type { SpecNode } from './ignore-state-calculator';

export interface PruningOptions {
  /** Whether to show pruned elements in the UI (default: true) */
  showPrunedElements: boolean;
}

export interface VisibilityResult {
  /** Whether the element should be visible in the UI */
  visible: boolean;
  
  /** Reason for visibility state */
  reason: 'active' | 'pruned-hidden' | 'pruned-shown';
  
  /** Parent path that caused pruning (if applicable) */
  prunedBy?: string;
}

/**
 * Service for calculating child visibility based on parent ignore state
 * and "Show Pruned Elements" preference
 */
export class PruningEngine {
  private showPrunedElements: boolean = true;
  
  /**
   * Set the "Show Pruned Elements" preference
   * 
   * @param show - Whether to show pruned elements
   */
  setShowPrunedElements(show: boolean): void {
    this.showPrunedElements = show;
  }
  
  /**
   * Get the current "Show Pruned Elements" preference
   * 
   * @returns Current preference value
   */
  getShowPrunedElements(): boolean {
    return this.showPrunedElements;
  }
  
  /**
   * Determine if an element should be visible in the UI based on
   * its pruning state and the "Show Pruned Elements" preference
   * 
   * @param elementPath - The path of the element
   * @param isPruned - Whether the element is pruned by a parent
   * @param prunedBy - The parent path that caused pruning (if applicable)
   * @returns Visibility result with reason
   */
  calculateVisibility(
    elementPath: string,
    isPruned: boolean,
    prunedBy?: string
  ): VisibilityResult {
    if (!isPruned) {
      return {
        visible: true,
        reason: 'active'
      };
    }
    
    // Element is pruned
    if (this.showPrunedElements) {
      return {
        visible: true,
        reason: 'pruned-shown',
        prunedBy
      };
    }
    
    return {
      visible: false,
      reason: 'pruned-hidden',
      prunedBy
    };
  }
  
  /**
   * Get all children that should be hidden when parent is ignored
   * 
   * This method recursively collects all descendant paths from a parent node.
   * The actual visibility depends on the "Show Pruned Elements" preference.
   * 
   * @param parentPath - The path of the parent element
   * @param specStructure - The spec structure tree
   * @param annotations - Map of element paths to their ignore annotation values
   * @returns Array of child paths that are affected by parent pruning
   */
  getAffectedChildren(
    parentPath: string,
    specStructure: SpecNode,
    annotations: Map<string, boolean>
  ): string[] {
    const affectedChildren: string[] = [];
    
    // Find the parent node in the spec structure
    const parentNode = this.findNode(parentPath, specStructure);
    if (!parentNode) {
      return affectedChildren;
    }
    
    // Recursively collect all children that don't have explicit annotations
    this.collectAffectedChildren(parentNode, annotations, affectedChildren);
    
    return affectedChildren;
  }
  
  /**
   * Calculate which children should be hidden in the UI when parent is ignored
   * 
   * This considers both the pruning state and the "Show Pruned Elements" preference.
   * 
   * @param parentPath - The path of the parent element
   * @param specStructure - The spec structure tree
   * @param annotations - Map of element paths to their ignore annotation values
   * @returns Array of child paths that should be hidden in the UI
   */
  getHiddenChildren(
    parentPath: string,
    specStructure: SpecNode,
    annotations: Map<string, boolean>
  ): string[] {
    // If showing pruned elements, no children are hidden
    if (this.showPrunedElements) {
      return [];
    }
    
    // Get all affected children
    const affectedChildren = this.getAffectedChildren(
      parentPath,
      specStructure,
      annotations
    );
    
    return affectedChildren;
  }
  
  /**
   * Recursively collect all children affected by parent pruning
   * 
   * A child is affected if:
   * - It has no explicit annotation (inherits from parent)
   * - OR it has explicit true (also ignored)
   * 
   * A child is NOT affected if:
   * - It has explicit false (override)
   * 
   * @param node - Current node in traversal
   * @param annotations - Map of element paths to their ignore annotation values
   * @param result - Array to collect affected child paths
   */
  private collectAffectedChildren(
    node: SpecNode,
    annotations: Map<string, boolean>,
    result: string[]
  ): void {
    for (const child of node.children) {
      const childAnnotation = annotations.get(child.path);
      
      // If child has explicit false (override), it's not affected
      if (childAnnotation === false) {
        continue;
      }
      
      // Child is affected (no annotation or explicit true)
      result.push(child.path);
      
      // Recursively collect grandchildren
      this.collectAffectedChildren(child, annotations, result);
    }
  }
  
  /**
   * Find a node in the spec structure by path
   * 
   * @param path - The path to search for
   * @param root - The root node to start searching from
   * @returns The found node or undefined
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
   * Check if any children of a parent have override annotations
   * 
   * This is useful for determining whether to show the "Clear All Overrides" button.
   * 
   * @param parentPath - The path of the parent element
   * @param specStructure - The spec structure tree
   * @param annotations - Map of element paths to their ignore annotation values
   * @returns True if any children have explicit false annotations
   */
  hasChildOverrides(
    parentPath: string,
    specStructure: SpecNode,
    annotations: Map<string, boolean>
  ): boolean {
    const parentNode = this.findNode(parentPath, specStructure);
    if (!parentNode) {
      return false;
    }
    
    return this.checkChildOverrides(parentNode, annotations);
  }
  
  /**
   * Recursively check if any children have override annotations
   * 
   * @param node - Current node in traversal
   * @param annotations - Map of element paths to their ignore annotation values
   * @returns True if any children have explicit false annotations
   */
  private checkChildOverrides(
    node: SpecNode,
    annotations: Map<string, boolean>
  ): boolean {
    for (const child of node.children) {
      const childAnnotation = annotations.get(child.path);
      
      // If child has explicit false, it's an override
      if (childAnnotation === false) {
        return true;
      }
      
      // Recursively check grandchildren
      if (this.checkChildOverrides(child, annotations)) {
        return true;
      }
    }
    
    return false;
  }
  
  /**
   * Get all child paths that have override annotations
   * 
   * This is useful for the "Clear All Overrides" action.
   * 
   * @param parentPath - The path of the parent element
   * @param specStructure - The spec structure tree
   * @param annotations - Map of element paths to their ignore annotation values
   * @returns Array of child paths with explicit false annotations
   */
  getChildOverrides(
    parentPath: string,
    specStructure: SpecNode,
    annotations: Map<string, boolean>
  ): string[] {
    const overrides: string[] = [];
    
    const parentNode = this.findNode(parentPath, specStructure);
    if (!parentNode) {
      return overrides;
    }
    
    this.collectChildOverrides(parentNode, annotations, overrides);
    
    return overrides;
  }
  
  /**
   * Recursively collect all child paths with override annotations
   * 
   * @param node - Current node in traversal
   * @param annotations - Map of element paths to their ignore annotation values
   * @param result - Array to collect override paths
   */
  private collectChildOverrides(
    node: SpecNode,
    annotations: Map<string, boolean>,
    result: string[]
  ): void {
    for (const child of node.children) {
      const childAnnotation = annotations.get(child.path);
      
      // If child has explicit false, it's an override
      if (childAnnotation === false) {
        result.push(child.path);
      }
      
      // Recursively collect grandchildren overrides
      this.collectChildOverrides(child, annotations, result);
    }
  }
}
