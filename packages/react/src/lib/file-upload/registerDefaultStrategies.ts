/**
 * Default Strategy Registration
 * 
 * Registers all default file upload strategies with the StrategyRegistry.
 * This function should be called during application initialization.
 */

import { StrategyRegistry } from './StrategyRegistry';
import { ImageUploadStrategy } from './strategies/ImageUploadStrategy';
import { DocumentUploadStrategy } from './strategies/DocumentUploadStrategy';
import { VideoUploadStrategy } from './strategies/VideoUploadStrategy';
import { GenericUploadStrategy } from './strategies/GenericUploadStrategy';

/**
 * Register all default file upload strategies
 * 
 * Registers the following strategies:
 * - ImageUploadStrategy: Handles image files (JPEG, PNG, GIF, WebP, SVG)
 * - DocumentUploadStrategy: Handles documents (PDF, DOC, DOCX, TXT, RTF)
 * - VideoUploadStrategy: Handles videos (MP4, WebM, OGG, QuickTime)
 * - GenericUploadStrategy: Fallback for any file type
 * 
 * This function should be called once during application initialization,
 * before any file upload components are rendered.
 * 
 * @example
 * ```typescript
 * import { registerDefaultStrategies } from '@uigen/react';
 * 
 * // Call during app initialization
 * registerDefaultStrategies();
 * ```
 */
export function registerDefaultStrategies(): void {
  const registry = StrategyRegistry.getInstance();

  // Register strategies for file type categories
  registry.registerForCategory('image', new ImageUploadStrategy());
  registry.registerForCategory('document', new DocumentUploadStrategy());
  registry.registerForCategory('video', new VideoUploadStrategy());
  registry.registerForCategory('audio', new GenericUploadStrategy()); // Use generic for audio
  registry.registerForCategory('generic', new GenericUploadStrategy());
}
