/**
 * MIME Type Options for File Upload Configuration
 * 
 * Provides a comprehensive list of common MIME types organized by category
 * for use in the MultiSelect component.
 */

export interface MultiSelectOption {
  value: string;
  label: string;
  group?: string;
  description?: string;
}

/**
 * Predefined MIME type options grouped by category
 */
export const MIME_TYPE_OPTIONS: MultiSelectOption[] = [
  // Images
  { 
    value: 'image/*', 
    label: 'All Images', 
    group: 'Images', 
    description: 'Any image type' 
  },
  { value: 'image/jpeg', label: 'JPEG', group: 'Images' },
  { value: 'image/png', label: 'PNG', group: 'Images' },
  { value: 'image/gif', label: 'GIF', group: 'Images' },
  { value: 'image/webp', label: 'WebP', group: 'Images' },
  { value: 'image/svg+xml', label: 'SVG', group: 'Images' },
  { value: 'image/bmp', label: 'BMP', group: 'Images' },
  { value: 'image/tiff', label: 'TIFF', group: 'Images' },
  
  // Documents
  { value: 'application/pdf', label: 'PDF', group: 'Documents' },
  { value: 'application/msword', label: 'Word (DOC)', group: 'Documents' },
  { 
    value: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 
    label: 'Word (DOCX)', 
    group: 'Documents' 
  },
  { value: 'application/vnd.ms-excel', label: 'Excel (XLS)', group: 'Documents' },
  { 
    value: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', 
    label: 'Excel (XLSX)', 
    group: 'Documents' 
  },
  { value: 'application/vnd.ms-powerpoint', label: 'PowerPoint (PPT)', group: 'Documents' },
  { 
    value: 'application/vnd.openxmlformats-officedocument.presentationml.presentation', 
    label: 'PowerPoint (PPTX)', 
    group: 'Documents' 
  },
  { value: 'text/plain', label: 'Text', group: 'Documents' },
  { value: 'text/csv', label: 'CSV', group: 'Documents' },
  { value: 'text/html', label: 'HTML', group: 'Documents' },
  { value: 'text/markdown', label: 'Markdown', group: 'Documents' },
  { value: 'application/rtf', label: 'RTF', group: 'Documents' },
  
  // Video
  { 
    value: 'video/*', 
    label: 'All Videos', 
    group: 'Video', 
    description: 'Any video type' 
  },
  { value: 'video/mp4', label: 'MP4', group: 'Video' },
  { value: 'video/webm', label: 'WebM', group: 'Video' },
  { value: 'video/quicktime', label: 'QuickTime (MOV)', group: 'Video' },
  { value: 'video/x-msvideo', label: 'AVI', group: 'Video' },
  { value: 'video/x-matroska', label: 'MKV', group: 'Video' },
  { value: 'video/mpeg', label: 'MPEG', group: 'Video' },
  
  // Audio
  { 
    value: 'audio/*', 
    label: 'All Audio', 
    group: 'Audio', 
    description: 'Any audio type' 
  },
  { value: 'audio/mpeg', label: 'MP3', group: 'Audio' },
  { value: 'audio/wav', label: 'WAV', group: 'Audio' },
  { value: 'audio/ogg', label: 'OGG', group: 'Audio' },
  { value: 'audio/webm', label: 'WebM Audio', group: 'Audio' },
  { value: 'audio/aac', label: 'AAC', group: 'Audio' },
  { value: 'audio/flac', label: 'FLAC', group: 'Audio' },
  { value: 'audio/x-m4a', label: 'M4A', group: 'Audio' },
  
  // Archives
  { value: 'application/zip', label: 'ZIP', group: 'Archives' },
  { value: 'application/x-tar', label: 'TAR', group: 'Archives' },
  { value: 'application/gzip', label: 'GZIP', group: 'Archives' },
  { value: 'application/x-7z-compressed', label: '7-Zip', group: 'Archives' },
  { value: 'application/x-rar-compressed', label: 'RAR', group: 'Archives' },
  { value: 'application/x-bzip2', label: 'BZIP2', group: 'Archives' },
  
  // Other
  { value: 'application/json', label: 'JSON', group: 'Other' },
  { value: 'application/xml', label: 'XML', group: 'Other' },
  { value: 'text/xml', label: 'XML (Text)', group: 'Other' },
  { value: 'application/yaml', label: 'YAML', group: 'Other' },
  { value: 'text/yaml', label: 'YAML (Text)', group: 'Other' },
  { value: 'application/octet-stream', label: 'Binary', group: 'Other' },
  { 
    value: '*/*', 
    label: 'All Files', 
    group: 'Other', 
    description: 'Any file type' 
  },
];
