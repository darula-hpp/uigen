import { AnnotationHandlerRegistry } from '../registry.js';
import { IgnoreHandler } from './ignore-handler.js';
import { LabelHandler } from './label-handler.js';
import { RefHandler } from './ref-handler.js';
import { LoginHandler } from './login-handler.js';
import { PasswordResetHandler } from './password-reset-handler.js';
import { SignUpHandler } from './sign-up-handler.js';
import { ActiveServerHandler } from './active-server-handler.js';
import { FileTypesHandler } from './file-types-handler.js';
import { MaxFileSizeHandler } from './max-file-size-handler.js';
import { ChartHandler } from './chart-handler.js';
import { ProfileHandler } from './profile-handler.js';
import { LayoutHandler } from './layout-handler.js';
import { LandingPageHandler } from './landing-page-handler.js';
import { AppHandler } from './app-handler.js';

/**
 * Initialize and register all annotation handlers.
 * This function is called automatically when the module is imported.
 * 
 * Registration order matters:
 * - Priority handlers (ignore, login, label, ref) are processed first
 * - Operation-level handlers (password-reset, sign-up) are processed next
 * - Field-level handlers (file-types) are processed next
 * - Server-level handlers (active-server) are processed last
 * 
 * Requirements: 1.1, 1.2, 1.3, 1.4, 1.5
 */
function registerHandlers(): void {
  const registry = AnnotationHandlerRegistry.getInstance();
  
  // Register priority handlers (processed first by registry)
  registry.register(new IgnoreHandler());
  registry.register(new LoginHandler());
  registry.register(new LabelHandler());
  registry.register(new RefHandler());
  
  // Register operation-level handlers (Requirements 1.2, 1.3, 1.4)
  registry.register(new PasswordResetHandler());
  registry.register(new SignUpHandler());
  
  // Register field-level handlers
  registry.register(new FileTypesHandler());
  registry.register(new MaxFileSizeHandler());
  registry.register(new ChartHandler());
  
  // Register resource-level handlers
  registry.register(new ProfileHandler());
  
  // Register document/operation-level handlers
  registry.register(new LayoutHandler());
  registry.register(new LandingPageHandler());
  registry.register(new AppHandler());
  
  // Register server-level handlers (Requirement 1.5)
  registry.register(new ActiveServerHandler());
}

// Auto-register handlers on module load
registerHandlers();

// Export handlers for testing
export { IgnoreHandler } from './ignore-handler.js';
export { LabelHandler } from './label-handler.js';
export { RefHandler } from './ref-handler.js';
export { LoginHandler } from './login-handler.js';
export { PasswordResetHandler } from './password-reset-handler.js';
export { SignUpHandler } from './sign-up-handler.js';
export { ActiveServerHandler } from './active-server-handler.js';
export { FileTypesHandler } from './file-types-handler.js';
export { MaxFileSizeHandler } from './max-file-size-handler.js';
export { ChartHandler } from './chart-handler.js';
export { ProfileHandler } from './profile-handler.js';
export { LayoutHandler } from './layout-handler.js';
export { LandingPageHandler } from './landing-page-handler.js';
export { AppHandler } from './app-handler.js';
