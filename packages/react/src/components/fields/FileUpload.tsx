import { useState, useRef } from 'react';
import { Input } from '@/components/ui/input';
import type { FieldProps } from './ComponentRegistry';

/**
 * FileUpload component with drag-and-drop support
 * Implements Requirements 33.9, 53.1-53.7
 */
export function FileUpload({ schema, register, errors }: FieldProps) {
  const error = errors[schema.key];
  const [isDragging, setIsDragging] = useState(false);
  const [fileName, setFileName] = useState<string>('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    
    const files = e.dataTransfer.files;
    if (files.length > 0 && fileInputRef.current) {
      // Create a new DataTransfer to set files on the input
      const dataTransfer = new DataTransfer();
      dataTransfer.items.add(files[0]);
      fileInputRef.current.files = dataTransfer.files;
      
      // Trigger change event
      const event = new Event('change', { bubbles: true });
      fileInputRef.current.dispatchEvent(event);
      
      setFileName(files[0].name);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      setFileName(files[0].name);
    } else {
      setFileName('');
    }
  };

  const { ref, ...registerProps } = register(schema.key);

  return (
    <div className="space-y-2">
      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        className={`relative flex items-center justify-center w-full h-32 border-2 border-dashed rounded-md transition-colors ${
          isDragging
            ? 'border-primary bg-primary/5'
            : error
            ? 'border-destructive'
            : 'border-input'
        }`}
      >
        <div className="text-center">
          <p className="text-sm text-muted-foreground">
            {fileName || 'Drag and drop a file here, or click to select'}
          </p>
          <Input
            id={schema.key}
            type="file"
            {...registerProps}
            ref={(e) => {
              ref(e);
              fileInputRef.current = e;
            }}
            onChange={(e) => {
              registerProps.onChange(e);
              handleFileChange(e);
            }}
            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
          />
        </div>
      </div>
      {fileName && (
        <p className="text-sm text-muted-foreground">
          Selected: {fileName}
        </p>
      )}
    </div>
  );
}
