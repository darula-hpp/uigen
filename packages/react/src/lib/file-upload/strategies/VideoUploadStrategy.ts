/**
 * Video Upload Strategy
 * 
 * Handles validation and preview for video file uploads.
 * Supports common video formats with larger size limits.
 */

import type { ComponentType } from 'react';
import type { FileUploadStrategy, ValidationResult, PreviewProps } from '../types';
import { validateFile } from '../validation/FileValidator';
import { formatFileSize } from '../utils/formatFileSize';
import { VideoPreview } from '../previews/VideoPreview';

/**
 * Strategy for handling video file uploads
 * 
 * Supports: MP4, WebM, OGG, QuickTime
 * Max size: 100MB
 */
export class VideoUploadStrategy implements FileUploadStrategy {
  private readonly SUPPORTED_TYPES = [
    'video/mp4',
    'video/webm',
    'video/ogg',
    'video/quicktime',
  ];

  private readonly MAX_SIZE = 100 * 1024 * 1024; // 100MB

  /**
   * Validate a video file
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
   * Get the preview component for videos
   * 
   * @returns VideoPreview component
   */
  getPreviewComponent(): ComponentType<PreviewProps> {
    return VideoPreview;
  }

  /**
   * Get supported MIME types
   * 
   * @returns Array of MIME types including wildcard
   */
  getSupportedMimeTypes(): string[] {
    return [...this.SUPPORTED_TYPES, 'video/*'];
  }

  /**
   * Get default maximum file size
   * 
   * @returns Maximum file size in bytes (100MB)
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
