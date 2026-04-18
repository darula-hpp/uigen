import type { AnnotationHandler, AnnotationContext } from './types.js';
import type { ConfigLoader } from '../../config/loader.js';

/**
 * Singleton registry for annotation handlers.
 * Provides O(1) lookup and automatic handler registration.
 */
export class AnnotationHandlerRegistry {
  private static instance: AnnotationHandlerRegistry;
  private handlers: Map<string, AnnotationHandler> = new Map();
  private configLoader?: ConfigLoader;
  
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
   * Set the config loader for annotation precedence handling.
   * 
   * @param loader - The config loader instance
   */
  public setConfigLoader(loader: ConfigLoader | undefined): void {
    this.configLoader = loader;
  }
  
  /**
   * Get the current config loader.
   * 
   * @returns The config loader or undefined
   */
  public getConfigLoader(): ConfigLoader | undefined {
    return this.configLoader;
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
   * Implements annotation precedence logic:
   * 1. If annotation is disabled in config, skip it even if in spec
   * 2. If both config and spec values exist, use spec value (log debug message)
   * 3. If only config value exists, use it
   * 4. If only spec value exists, use it
   * 
   * @param handler - The handler to execute
   * @param context - The annotation context
   */
  private executeHandler(handler: AnnotationHandler, context: AnnotationContext): void {
    try {
      // Check if annotation is disabled in config
      if (this.configLoader?.isAnnotationDisabled(handler.name)) {
        // Annotation is disabled, skip processing even if present in spec
        return;
      }
      
      // Extract value from spec
      const specValue = handler.extract(context);
      
      // Get config value (defaults + element-specific config)
      const configValue = this.configLoader?.getAnnotationConfig(context.path, handler.name);
      
      // Determine which value to use based on precedence rules
      let valueToUse: unknown;
      
      if (specValue !== undefined && configValue !== undefined) {
        // Both spec and config have values - spec takes precedence
        valueToUse = specValue;
        
        // Log debug message for override (Requirement 11.4)
        if (process.env.NODE_ENV !== 'test') {
          console.debug(`[Config] Explicit spec annotation "${handler.name}" at "${context.path}" overrides config default`);
        }
      } else if (specValue !== undefined) {
        // Only spec has value
        valueToUse = specValue;
      } else if (configValue !== undefined) {
        // Only config has value
        valueToUse = configValue;
      } else {
        // Neither has value
        return;
      }
      
      // Validate
      const isValid = handler.validate(valueToUse);
      if (!isValid) {
        return; // Invalid value, handler should have logged warning
      }
      
      // Apply
      handler.apply(valueToUse, context);
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
