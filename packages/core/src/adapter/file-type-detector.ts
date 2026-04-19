/**
 * File Type Detector
 * 
 * Classifies MIME types into semantic file type categories for UIGen's file upload system.
 */

export type FileTypeCategory = 'image' | 'document' | 'video' | 'audio' | 'generic';

export class FileTypeDetector {
  /**
   * Detect file type category from MIME types
   * 
   * Classification rules:
   * - All MIME types start with "image/" returns "image"
   * - All MIME types are document types returns "document"
   * - All MIME types start with "video/" returns "video"
   * - All MIME types start with "audio/" returns "audio"
   * - Mixed categories or no match returns "generic"
   * - Empty array or wildcard returns "generic"
   * 
   * @param mimeTypes - Array of MIME type strings
   * @returns File type category
   */
  static detectFileType(mimeTypes: string[]): FileTypeCategory {
    // Handle empty or wildcard-only arrays
    if (mimeTypes.length === 0 || (mimeTypes.length === 1 && mimeTypes[0] === '*/*')) {
      return 'generic';
    }
    
    // Classify each MIME type
    const categories = new Set<string>();
    
    for (const mimeType of mimeTypes) {
      if (mimeType === '*/*') {
        return 'generic'; // Wildcard means accept all
      }
      
      if (mimeType.startsWith('image/')) {
        categories.add('image');
      } else if (mimeType.startsWith('video/')) {
        categories.add('video');
      } else if (mimeType.startsWith('audio/')) {
        categories.add('audio');
      } else if (this.isDocumentMimeType(mimeType)) {
        categories.add('document');
      } else {
        categories.add('generic');
      }
    }
    
    // If multiple categories, return generic
    if (categories.size > 1) {
      return 'generic';
    }
    
    // Single category
    const category = Array.from(categories)[0];
    return category as FileTypeCategory;
  }
  
  /**
   * Check if a MIME type belongs to the document category
   * 
   * Document MIME types:
   * - application/pdf
   * - application/msword
   * - application/vnd.openxmlformats-officedocument.*
   * - application/vnd.ms-excel
   * - application/vnd.ms-powerpoint
   * - text/plain
   * - text/csv
   * 
   * @param mimeType - MIME type string
   * @returns True if document type
   */
  private static isDocumentMimeType(mimeType: string): boolean {
    const documentMimeTypes = [
      'application/pdf',
      'application/msword',
      'application/vnd.ms-excel',
      'application/vnd.ms-powerpoint',
      'text/plain',
      'text/csv'
    ];
    
    if (documentMimeTypes.includes(mimeType)) {
      return true;
    }
    
    // Check for Office Open XML formats
    if (mimeType.startsWith('application/vnd.openxmlformats-officedocument.')) {
      return true;
    }
    
    return false;
  }
}
