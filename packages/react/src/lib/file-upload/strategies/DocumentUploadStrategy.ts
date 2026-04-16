/**
 * Document Upload Strategy
 * 
 * Handles validation and preview for document file uploads.
 * Supports common document formats like PDF, Word, and text files.
 */

import type { ComponentType } from 'react';
import type { FileUploadStrategy, ValidationResult, PreviewProps } from '../types';
import { validateFile } from '../validation/FileValidator';
import { formatFileSize } from '../utils/formatFileSize';
import { DocumentPreview } from '../previews/DocumentPreview';

/**
 * Strategy for handling document file uploads
 * 
 * Supports: PDF, DOC, DOCX, TXT, RTF
 * Max size: 10MB
 */
export class DocumentUploadStrategy implements FileUploadStrategy {
  private readonly SUPPORTED_TYPES = [
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'text/plain',
    'application/rtf',
  ];

  private readonly MAX_SIZE = 10 * 1024 * 1024; // 10MB

  /**
   * Validate a document file
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
   * Get the preview component for documents
   * 
   * @returns DocumentPreview component
   */
  getPreviewComponent(): ComponentType<PreviewProps> {
    return DocumentPreview;
  }

  /**
   * Get supported MIME types
   * 
   * @returns Array of MIME types
   */
  getSupportedMimeTypes(): string[] {
    return this.SUPPORTED_TYPES;
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
