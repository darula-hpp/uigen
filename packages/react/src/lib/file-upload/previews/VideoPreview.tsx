/**
 * Video Preview Component
 * 
 * Displays a preview of an uploaded video file
 * with video icon, file metadata, and remove functionality.
 */

import { X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { formatFileSize } from '../utils/formatFileSize';
import { getFileIcon } from '../utils/fileIcons';
import type { PreviewProps } from '../types';

/**
 * Preview component for video files
 * 
 * Displays video icon
 * Shows file name and size
 */
export function VideoPreview({ file, onRemove }: PreviewProps) {
  const Icon = getFileIcon(file.type);

  return (
    <div className="flex items-start gap-3 p-3 border rounded-md">
      <div className="flex-shrink-0">
        <Icon className="h-8 w-8 text-muted-foreground" aria-hidden="true" />
      </div>
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
