import type { AnnotationHandler, AnnotationContext } from './types.js';

/**
 * Singleton registry for annotation handlers.
 * Provides O(1) lookup and automatic handler registration.
 */
export class AnnotationHandlerRegistry {
  private static instance: AnnotationHandlerRegistry;
  private handlers: Map<string, AnnotationHandler> = new Map();
  
  private constructor() {
    // Private constructor for singleton pattern
  }
  
  /**
   * Get the singleton instance
   */
  public static getInstance(): AnnotationHandlerRegistry {
    if (!AnnotationHandlerRegistry.instance) {
      AnnotationHandlerRegistry.instance = new AnnotationHandlerRegistry();
    }
    return AnnotationHandlerRegistry.instance;
  }
  
  /**
   * Register an annotation handler.
   * If a handler with the same name already exists, logs a warning and overwrites.
   * 
   * @param handler - The handler to register
   */
  public register(handler: AnnotationHandler): void {
    if (this.handlers.has(handler.name)) {
      console.warn(`Handler for annotation "${handler.name}" already registered. Overwriting.`);
    }
    this.handlers.set(handler.name, handler);
  }
  
  /**
   * Get a handler by annotation name.
   * Returns undefined if no handler is registered for the annotation.
   * 
   * @param name - The annotation name (e.g., "x-uigen-ignore")
   * @returns The handler or undefined
   */
  public get(name: string): AnnotationHandler | undefined {
    return this.handlers.get(name);
  }
  
  /**
   * Get all registered handlers.
   * Returns handlers in registration order.
   * 
   * @returns Array of all registered handlers
   */
  public getAll(): AnnotationHandler[] {
    return Array.from(this.handlers.values());
  }
  
  /**
   * Process all annotations on a spec element.
   * Executes handlers in a specific order: ignore → login → label → others
   * 
   * @param context - The annotation context
   */
  public processAnnotations(context: AnnotationContext): void {
    // Define processing order (ignore must run first)
    const priorityOrder = ['x-uigen-ignore', 'x-uigen-login', 'x-uigen-label', 'x-uigen-ref'];
    const handlers = this.getAll();
    
    // Process priority handlers first
    for (const name of priorityOrder) {
      const handler = this.get(name);
      if (handler) {
        this.executeHandler(handler, context);
      }
    }
    
    // Process remaining handlers
    for (const handler of handlers) {
      if (!priorityOrder.includes(handler.name)) {
        this.executeHandler(handler, context);
      }
    }
  }
  
  /**
   * Execute a single handler with error handling.
   * Never throws - logs errors and continues.
   * 
   * @param handler - The handler to execute
   * @param context - The annotation context
   */
  private executeHandler(handler: AnnotationHandler, context: AnnotationContext): void {
    try {
      // Extract
      const value = handler.extract(context);
      if (value === undefined) {
        return; // Annotation not present
      }
      
      // Validate
      const isValid = handler.validate(value);
      if (!isValid) {
        return; // Invalid value, handler should have logged warning
      }
      
      // Apply
      handler.apply(value, context);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      console.error(`Error executing handler "${handler.name}":`, errorMessage);
      context.utils.logError({
        path: context.path,
        method: context.method?.toUpperCase() || '',
        error: `Handler "${handler.name}" failed: ${errorMessage}`
      });
    }
  }
  
  /**
   * Clear all registered handlers.
   * Useful for testing.
   */
  public clear(): void {
    this.handlers.clear();
  }
}
