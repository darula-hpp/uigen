/**
 * Image Upload Strategy
 * 
 * Handles validation and preview for image file uploads.
 * Supports common image formats with appropriate size limits.
 */

import type { ComponentType } from 'react';
import type { FileUploadStrategy, ValidationResult, PreviewProps } from '../types';
import { validateFile } from '../validation/FileValidator';
import { formatFileSize } from '../utils/formatFileSize';
import { ImagePreview } from '../previews/ImagePreview';

/**
 * Strategy for handling image file uploads
 * 
 * Supports: JPEG, PNG, GIF, WebP, SVG
 * Max size: 5MB
 */
export class ImageUploadStrategy implements FileUploadStrategy {
  private readonly SUPPORTED_TYPES = [
    'image/jpeg',
    'image/png',
    'image/gif',
    'image/webp',
    'image/svg+xml',
  ];

  private readonly MAX_SIZE = 5 * 1024 * 1024; // 5MB

  /**
   * Validate an image file
   * 
   * @param file - The file to validate
   * @param maxSizeBytes - Optional override for max size
   * @returns Validation result with success status and messages
   */
  validate(file: File, maxSizeBytes?: number): ValidationResult {
    const maxSize = maxSizeBytes ?? this.MAX_SIZE;
    return validateFile(file, maxSize, this.SUPPORTED_TYPES);
  }

  /**
   * Get the preview component for images
   * 
   * @returns ImagePreview component
   */
  getPreviewComponent(): ComponentType<PreviewProps> {
    return ImagePreview;
  }

  /**
   * Get supported MIME types
   * 
   * @returns Array of MIME types including wildcard
   */
  getSupportedMimeTypes(): string[] {
    return [...this.SUPPORTED_TYPES, 'image/*'];
  }

  /**
   * Get default maximum file size
   * 
   * @returns Maximum file size in bytes (5MB)
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
