/**
 * Strategy Registry
 * 
 * Singleton registry that maps MIME types to file upload strategies.
 * Supports exact matching, wildcard matching, and fallback to generic strategy.
 */

import type { FileUploadStrategy } from './types';

export class StrategyRegistry {
  private strategies: Map<string, FileUploadStrategy>;
  private static instance: StrategyRegistry;

  private constructor() {
    this.strategies = new Map();
  }

  /**
   * Get the singleton instance of the registry
   */
  static getInstance(): StrategyRegistry {
    if (!StrategyRegistry.instance) {
      StrategyRegistry.instance = new StrategyRegistry();
    }
    return StrategyRegistry.instance;
  }

  /**
   * Register a strategy for specific MIME types
   * 
   * The strategy will be registered for all MIME types returned by
   * its getSupportedMimeTypes() method.
   * 
   * @param name - Strategy identifier (used for debugging and overrides)
   * @param strategy - Strategy instance to register
   */
  register(name: string, strategy: FileUploadStrategy): void {
    const mimeTypes = strategy.getSupportedMimeTypes();
    for (const mimeType of mimeTypes) {
      this.strategies.set(mimeType, strategy);
    }
  }

  /**
   * Get strategy for a MIME type
   * 
   * Lookup order:
   * 1. Exact match (e.g., "image/png")
   * 2. Wildcard match (e.g., "image/*")
   * 3. Generic fallback ("*\/*")
   * 
   * @param mimeType - MIME type to match
   * @returns Matching strategy or generic fallback
   * @throws Error if no generic fallback strategy is registered
   */
  getStrategy(mimeType: string): FileUploadStrategy {
    // 1. Exact match
    if (this.strategies.has(mimeType)) {
      return this.strategies.get(mimeType)!;
    }

    // 2. Wildcard match (e.g., "image/*")
    const category = mimeType.split('/')[0];
    const wildcardKey = `${category}/*`;
    if (this.strategies.has(wildcardKey)) {
      return this.strategies.get(wildcardKey)!;
    }

    // 3. Generic fallback
    const fallback = this.strategies.get('*/*');
    if (!fallback) {
      throw new Error(
        'No generic fallback strategy registered. Register a strategy with MIME type "*/*"'
      );
    }
    return fallback;
  }

  /**
   * Check if strategy exists for MIME type
   * 
   * Checks for exact match, wildcard match, or generic fallback.
   * 
   * @param mimeType - MIME type to check
   * @returns True if strategy exists (including fallback)
   */
  hasStrategy(mimeType: string): boolean {
    // Check exact match
    if (this.strategies.has(mimeType)) {
      return true;
    }

    // Check wildcard match
    const category = mimeType.split('/')[0];
    const wildcardKey = `${category}/*`;
    if (this.strategies.has(wildcardKey)) {
      return true;
    }

    // Check generic fallback
    return this.strategies.has('*/*');
  }

  /**
   * Clear all registered strategies (useful for testing)
   * @internal
   */
  clear(): void {
    this.strategies.clear();
  }
}
