/**
 * File Upload Strategy System
 * 
 * Public API for the file upload strategy system.
 * 
 * This module provides a flexible, type-aware file upload system based on the
 * strategy pattern. Different file types (images, documents, videos) receive
 * appropriate validation rules and preview components.
 * 
 * @example
 * ```typescript
 * import { registerDefaultStrategies, StrategyRegistry } from '@uigen/react';
 * 
 * // Initialize default strategies
 * registerDefaultStrategies();
 * 
 * // Get strategy for a file
 * const registry = StrategyRegistry.getInstance();
 * const strategy = registry.getStrategy('image/png');
 * 
 * // Validate a file
 * const result = strategy.validate(file);
 * if (!result.success) {
 *   console.error(result.errors);
 * }
 * ```
 * 
 * @example
 * ```typescript
 * // Register a custom strategy
 * import { StrategyRegistry, FileUploadStrategy } from '@uigen/react';
 * 
 * class CustomStrategy implements FileUploadStrategy {
 *   // ... implementation
 * }
 * 
 * const registry = StrategyRegistry.getInstance();
 * registry.register('custom', new CustomStrategy());
 * ```
 */

// Core types
export type {
  FileUploadStrategy,
  ValidationResult,
  PreviewProps,
} from './types';

// Strategy registry
export { StrategyRegistry } from './StrategyRegistry';

// Strategy implementations
export {
  ImageUploadStrategy,
  DocumentUploadStrategy,
  VideoUploadStrategy,
  GenericUploadStrategy,
} from './strategies';

// Preview components
export {
  ImagePreview,
  DocumentPreview,
  VideoPreview,
  GenericPreview,
} from './previews';

// Validation utilities
export {
  validateFileSize,
  validateMimeType,
  validateExtensionConsistency,
  validateFile,
} from './validation';

// Utility functions
export {
  formatFileSize,
  getFileIcon,
} from './utils';

// Strategy registration
export { registerDefaultStrategies } from './registerDefaultStrategies';
