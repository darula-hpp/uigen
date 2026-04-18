/**
 * Example demonstrating ConfigLoader usage in the serve command
 * 
 * This is not a test file, but an example showing how ConfigLoader
 * integrates with the annotation system.
 */

import { ConfigLoader } from '../loader.js';
import { AnnotationHandlerRegistry } from '../../adapter/annotations/registry.js';

/**
 * Example: Loading and applying config in the serve command
 */
export function exampleServeCommandWithConfig() {
  // 1. Create config loader
  const loader = new ConfigLoader({
    configPath: '.uigen/config.yaml',
    verbose: true
  });
  
  // 2. Load config file (returns null if not found)
  const config = loader.load();
  
  if (!config) {
    console.log('No config file found, using defaults');
    // Continue with default behavior
    return;
  }
  
  // 3. Get annotation registry
  const registry = AnnotationHandlerRegistry.getInstance();
  
  // 4. Apply config to registry
  loader.applyToRegistry(config, registry);
  
  // 5. During spec parsing, handlers can query config
  // Example: Get config for a specific field
  const userEmailConfig = loader.getAnnotationConfig('User.email', 'x-uigen-label');
  console.log('User.email label config:', userEmailConfig);
  
  // Example: Get config for an operation
  const loginConfig = loader.getAnnotationConfig('POST:/auth/login', 'x-uigen-login');
  console.log('Login operation config:', loginConfig);
  
  // Example: Check if annotation is disabled
  const refConfig = loader.getAnnotationConfig('User.role', 'x-uigen-ref');
  if (refConfig === undefined) {
    console.log('x-uigen-ref is disabled or not configured');
  }
}

/**
 * Example: Config file structure
 * 
 * .uigen/config.yaml:
 * ```yaml
 * version: "1.0"
 * 
 * # Enable/disable annotations
 * enabled:
 *   x-uigen-label: true
 *   x-uigen-ref: true
 *   x-uigen-ignore: true
 *   x-uigen-login: false  # Disable login detection
 * 
 * # Global defaults
 * defaults:
 *   x-uigen-ref:
 *     valueField: "id"
 *     labelField: "name"
 * 
 * # Per-element configuration
 * annotations:
 *   # Field-level
 *   User.email:
 *     x-uigen-label: "Email Address"
 *   
 *   User.role:
 *     x-uigen-ref:
 *       resource: "Role"
 *       labelField: "title"  # Override default
 *   
 *   # Operation-level
 *   POST:/auth/login:
 *     x-uigen-login: true
 *   
 *   # Resource-level
 *   InternalLog:
 *     x-uigen-ignore: true
 * ```
 */

/**
 * Example: Precedence rules
 * 
 * 1. Disabled annotations are never applied (even if in spec)
 * 2. Element-specific config overrides defaults
 * 3. Defaults apply when no element-specific config exists
 * 4. Explicit spec annotations override config (future enhancement)
 */
export function exampleConfigPrecedence() {
  const loader = new ConfigLoader();
  const config = {
    version: '1.0',
    enabled: {
      'x-uigen-ref': true
    },
    defaults: {
      'x-uigen-ref': {
        valueField: 'id',
        labelField: 'name'
      }
    },
    annotations: {
      'User.role': {
        'x-uigen-ref': {
          resource: 'Role',
          labelField: 'title' // Override default labelField
        }
      }
    }
  };
  
  const registry = AnnotationHandlerRegistry.getInstance();
  loader.applyToRegistry(config, registry);
  
  // Get merged config for User.role
  const roleConfig = loader.getAnnotationConfig('User.role', 'x-uigen-ref');
  console.log('Merged config:', roleConfig);
  // Output: { valueField: 'id', labelField: 'title', resource: 'Role' }
  //         ^^^ from default   ^^^ overridden      ^^^ element-specific
}
