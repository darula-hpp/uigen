import { AnnotationHandlerRegistry } from '../registry.js';
import { IgnoreHandler } from './ignore-handler.js';
import { LabelHandler } from './label-handler.js';

/**
 * Initialize and register all annotation handlers.
 * This function is called automatically when the module is imported.
 */
function registerHandlers(): void {
  const registry = AnnotationHandlerRegistry.getInstance();
  
  // Register IgnoreHandler
  registry.register(new IgnoreHandler());
  
  // Register LabelHandler
  registry.register(new LabelHandler());
}

// Auto-register handlers on module load
registerHandlers();

// Export handlers for testing
export { IgnoreHandler } from './ignore-handler.js';
export { LabelHandler } from './label-handler.js';
