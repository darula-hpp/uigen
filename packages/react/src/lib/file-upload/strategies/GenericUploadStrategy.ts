/**
 * Generic Upload Strategy
 * 
 * Fallback strategy for file uploads that don't match specific types.
 * Accepts any file type with basic size validation.
 */

import type { ComponentType } from 'react';
import type { FileUploadStrategy, ValidationResult, PreviewProps } from '../types';
import { validateFileSize } from '../validation/FileValidator';
import { formatFileSize } from '../utils/formatFileSize';
import { GenericPreview } from '../previews/GenericPreview';

/**
 * Strategy for handling generic file uploads
 * 
 * Supports: Any file type
 * Max size: 10MB
 */
export class GenericUploadStrategy implements FileUploadStrategy {
  private readonly MAX_SIZE = 10 * 1024 * 1024; // 10MB

  /**
   * Validate a generic file
   * 
   * Only validates file size, accepts any MIME type
   * 
   * @param file - The file to validate
   * @param maxSizeBytes - Optional override for max size
   * @returns Validation result with success status and messages
   */
  validate(file: File, maxSizeBytes?: number): ValidationResult {
    const maxSize = maxSizeBytes ?? this.MAX_SIZE;
    return validateFileSize(file, maxSize);
  }

  /**
   * Get the preview component for generic files
   * 
   * @returns GenericPreview component
   */
  getPreviewComponent(): ComponentType<PreviewProps> {
    return GenericPreview;
  }

  /**
   * Get supported MIME types
   * 
   * @returns Wildcard to accept any MIME type
   */
  getSupportedMimeTypes(): string[] {
    return ['*/*'];
  }

  /**
   * Get default maximum file size
   * 
   * @returns Maximum file size in bytes (10MB)
   */
  getMaxFileSize(): number {
    return this.MAX_SIZE;
  }

  /**
   * Format file size to human-readable string
   * 
   * @param bytes - File size in bytes
   * @returns Formatted string (e.g., "5.2 MB")
   */
  formatFileSize(bytes: number): string {
    return formatFileSize(bytes);
  }
}
