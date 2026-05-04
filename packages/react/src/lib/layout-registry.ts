import type { LayoutType, LayoutMetadata } from '@uigen-dev/core';
import type { ReactNode } from 'react';

/**
 * Layout strategy interface
 */
export interface LayoutStrategy {
  /** Strategy type identifier */
  type: LayoutType;
  
  /** Render the layout with children */
  render(children: ReactNode, metadata?: LayoutMetadata): ReactNode;
  
  /** Validate metadata for this strategy */
  validate(metadata?: LayoutMetadata): boolean;
  
  /** Get default metadata values */
  getDefaults(): LayoutMetadata;
}

/**
 * Singleton registry for layout strategies
 */
export class LayoutRegistry {
  private static instance: LayoutRegistry;
  private strategies: Map<LayoutType, LayoutStrategy> = new Map();
  private defaultType: LayoutType = 'sidebar';
  
  private constructor() {
    // Private constructor for singleton
  }
  
  /**
   * Get the singleton instance
   */
  static getInstance(): LayoutRegistry {
    if (!LayoutRegistry.instance) {
      LayoutRegistry.instance = new LayoutRegistry();
    }
    return LayoutRegistry.instance;
  }
  
  /**
   * Register a layout strategy
   */
  register(strategy: LayoutStrategy): void {
    if (this.strategies.has(strategy.type)) {
      console.warn(
        `[LayoutRegistry] Strategy "${strategy.type}" already registered. Overwriting.`
      );
    }
    this.strategies.set(strategy.type, strategy);
  }
  
  /**
   * Get a layout strategy by type
   */
  get(type: LayoutType): LayoutStrategy {
    const strategy = this.strategies.get(type);
    
    if (!strategy) {
      console.error(
        `[LayoutRegistry] Layout strategy "${type}" not found. Falling back to "${this.defaultType}".`
      );
      
      const fallback = this.strategies.get(this.defaultType);
      if (!fallback) {
        throw new Error(
          `[LayoutRegistry] Default layout strategy "${this.defaultType}" not registered`
        );
      }
      return fallback;
    }
    
    return strategy;
  }
  
  /**
   * Set the default layout type
   */
  setDefault(type: LayoutType): void {
    if (!this.strategies.has(type)) {
      throw new Error(
        `[LayoutRegistry] Cannot set default to unregistered type "${type}"`
      );
    }
    this.defaultType = type;
  }
  
  /**
   * Get all registered strategy types
   */
  getRegisteredTypes(): LayoutType[] {
    return Array.from(this.strategies.keys());
  }
  
  /**
   * Clear all strategies (for testing)
   */
  clear(): void {
    this.strategies.clear();
  }
}
