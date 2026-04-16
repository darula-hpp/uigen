/**
 * File Icon Utility
 * 
 * Maps MIME types to appropriate Lucide React icons
 */

import { File, FileText, FileImage, FileVideo, FileType } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

/**
 * Get appropriate icon component for a MIME type
 * 
 * @param mimeType - The MIME type of the file
 * @returns Lucide icon component
 */
export function getFileIcon(mimeType: string): LucideIcon {
  // Image files
  if (mimeType.startsWith('image/')) {
    return FileImage;
  }
  
  // PDF files
  if (mimeType === 'application/pdf') {
    return FileType;
  }
  
  // Video files
  if (mimeType.startsWith('video/')) {
    return FileVideo;
  }
  
  // Document files (Word, text, etc.)
  if (
    mimeType === 'application/msword' ||
    mimeType === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' ||
    mimeType === 'text/plain' ||
    mimeType === 'application/rtf'
  ) {
    return FileText;
  }
  
  // Generic fallback
  return File;
}
