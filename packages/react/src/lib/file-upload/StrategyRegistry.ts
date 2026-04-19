/**
 * Strategy Registry
 * 
 * Singleton registry that maps file type categories and MIME types to file upload strategies.
 * Supports category-based matching, exact MIME type matching, wildcard matching, and fallback to generic strategy.
 */

import type { FileUploadStrategy } from './types';
import type { FileTypeCategory } from '@uigen/core';

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
   * Register a strategy for a file type category
   * 
   * @param fileType - File type category (image, document, video, audio, generic)
   * @param strategy - Strategy instance to register
   */
  registerForCategory(fileType: FileTypeCategory, strategy: FileUploadStrategy): void {
    const key = `category:${fileType}`;
    this.strategies.set(key, strategy);
  }

  /**
   * Get strategy for a file type category
   * 
   * Lookup order:
   * 1. Exact file type category match
   * 2. Generic fallback
   * 
   * @param fileType - File type category from IR
   * @param mimeType - Optional MIME type for backward compatibility
   * @returns Matching strategy or generic fallback
   * @throws Error if no generic fallback strategy is registered
   */
  getStrategy(fileType: FileTypeCategory, mimeType?: string): FileUploadStrategy {
    // Primary lookup: file type category
    const categoryKey = `category:${fileType}`;
    if (this.strategies.has(categoryKey)) {
      return this.strategies.get(categoryKey)!;
    }

    // Fallback: generic strategy
    const fallback = this.strategies.get('category:generic');
    if (!fallback) {
      throw new Error(
        'No generic fallback strategy registered. Register a strategy for "generic" file type.'
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
