import type { OpenAPIV3 } from 'openapi-types';
import type { FileMetadata, SchemaNode } from '../../ir/types.js';
import { FileTypeDetector } from '../file-type-detector.js';

/**
 * Extracts file metadata from OpenAPI schemas.
 * 
 * Implements the Visitor pattern for file metadata extraction operations.
 * Preserves all existing file metadata extraction behavior from OpenAPI3Adapter.
 * 
 * Extraction rules:
 * - Process schemas with format: 'binary' OR contentMediaType property
 * - Extract contentMediaType property
 * - Extract x-uigen-file-types vendor extension
 * - Default to ['*\/*'] if no MIME types specified
 * - Extract x-uigen-max-file-size vendor extension
 * - Default to 10MB (10 * 1024 * 1024 bytes) if not specified
 * - Detect file type category using FileTypeDetector
 * - Generate HTML accept attribute from allowed MIME types
 * - Set multiple: true for array schemas with binary items
 * 
 * Requirements: 4.1-4.12
 */
export interface FileMetadataVisitor {
  /**
   * Extract file metadata from a binary format schema or schema with contentMediaType.
   * 
   * Processes:
   * - contentMediaType property
   * - x-uigen-file-types vendor extension
   * - x-uigen-max-file-size vendor extension
   * 
   * @param schema - OpenAPI schema object
   * @returns FileMetadata if schema has format: 'binary' or contentMediaType, undefined otherwise
   */
  extractFileMetadata(schema: OpenAPIV3.SchemaObject): FileMetadata | undefined;

  /**
   * Check if a schema node contains any file fields.
   * 
   * Recursively checks:
   * - Direct file fields (type: 'file')
   * - Children in object schemas
   * - Items in array schemas
   * 
   * @param schema - Schema node to check
   * @returns True if the schema contains any file fields
   */
  hasFileFields(schema: SchemaNode): boolean;
}

/**
 * Default implementation of FileMetadataVisitor.
 * Preserves all existing file metadata extraction behavior from OpenAPI3Adapter.
 */
export class DefaultFileMetadataVisitor implements FileMetadataVisitor {
  extractFileMetadata(schema: OpenAPIV3.SchemaObject): FileMetadata | undefined {
    // Extract metadata for binary format fields OR fields with contentMediaType
    const contentMediaType = (schema as any).contentMediaType;
    const hasContentMediaType = contentMediaType && typeof contentMediaType === 'string' && contentMediaType.trim() !== '';
    
    if (schema.format !== 'binary' && !hasContentMediaType) {
      return undefined;
    }

    const allowedMimeTypes: string[] = [];
    
    // Extract from x-uigen-file-types extension
    const xUigenFileTypes = (schema as any)['x-uigen-file-types'];
    if (Array.isArray(xUigenFileTypes)) {
      allowedMimeTypes.push(...xUigenFileTypes.filter((t: any) => typeof t === 'string'));
    }
    
    // Extract from contentMediaType property
    if (typeof contentMediaType === 'string' && contentMediaType.trim() !== '') {
      if (!allowedMimeTypes.includes(contentMediaType)) {
        allowedMimeTypes.push(contentMediaType);
      }
    }
    
    // Default to accepting all files if no MIME types specified
    if (allowedMimeTypes.length === 0) {
      allowedMimeTypes.push('*/*');
    }
    
    // Detect file type category
    const fileType = FileTypeDetector.detectFileType(allowedMimeTypes);
    
    // Extract max file size from x-uigen-max-file-size extension
    const xUigenMaxFileSize = (schema as any)['x-uigen-max-file-size'];
    const maxSizeBytes = typeof xUigenMaxFileSize === 'number' && xUigenMaxFileSize > 0 && Number.isFinite(xUigenMaxFileSize)
      ? xUigenMaxFileSize
      : 10 * 1024 * 1024; // Default 10MB
    
    // Generate HTML accept attribute from allowed MIME types
    const accept = allowedMimeTypes.join(',');
    
    return {
      allowedMimeTypes,
      maxSizeBytes,
      multiple: false, // Will be set to true for array schemas
      accept,
      fileType
    };
  }

  hasFileFields(schema: SchemaNode): boolean {
    // Direct file field
    if (schema.type === 'file') {
      return true;
    }
    
    // Check children in object schemas
    if (schema.type === 'object' && schema.children) {
      return schema.children.some(child => this.hasFileFields(child));
    }
    
    // Check items in array schemas
    if (schema.type === 'array' && schema.items) {
      return this.hasFileFields(schema.items);
    }
    
    return false;
  }
}
