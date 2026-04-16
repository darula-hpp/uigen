/**
 * Image Preview Component
 * 
 * Displays a thumbnail preview of an uploaded image file
 * with file metadata and remove functionality.
 */

import { useState, useEffect } from 'react';
import { X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { formatFileSize } from '../utils/formatFileSize';
import type { PreviewProps } from '../types';

/**
 * Preview component for image files
 * 
 * Uses FileReader API to generate image preview
 * Displays image thumbnail with file name and size
 */
export function ImagePreview({ file, onRemove }: PreviewProps) {
  const [preview, setPreview] = useState<string>('');

  useEffect(() => {
    const reader = new FileReader();
    
    reader.onloadend = () => {
      setPreview(reader.result as string);
    };
    
    reader.onerror = () => {
      console.error('Failed to read image file');
    };
    
    reader.readAsDataURL(file);

    return () => {
      if (preview) {
        URL.revokeObjectURL(preview);
      }
    };
  }, [file]);

  return (
    <div className="flex items-start gap-3 p-3 border rounded-md">
      {preview && (
        <img
          src={preview}
          alt={file.name}
          className="w-32 h-32 object-cover rounded"
        />
      )}
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium truncate">{file.name}</p>
        <p className="text-xs text-muted-foreground">
          {formatFileSize(file.size)}
        </p>
      </div>
      <Button
        type="button"
        variant="ghost"
        size="sm"
        onClick={onRemove}
        aria-label={`Remove ${file.name}`}
      >
        <X className="h-4 w-4" />
      </Button>
    </div>
  );
}
