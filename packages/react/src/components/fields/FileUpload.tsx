import { useState, useRef } from 'react';
import { Input } from '@/components/ui/input';
import type { FieldProps } from './ComponentRegistry';
import { StrategyRegistry } from '../../lib/file-upload/StrategyRegistry';

/**
 * FileUpload component with drag-and-drop support and strategy-based validation
 * 
 * Implements Requirements:
 * - 10.1-10.10: Enhanced FileUpload with validation, preview, and error handling
 * - 11.1-11.7: Multiple file upload support
 * - 13.7: Error clearing on new file selection
 * - 14.1-14.7: Accessibility requirements
 */
export function FileUpload({ schema, register, errors }: FieldProps) {
  const error = errors[schema.key];
  const [files, setFiles] = useState<File[]>([]);
  const [validationErrors, setValidationErrors] = useState<string[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const registry = StrategyRegistry.getInstance();

  const fileMetadata = schema.fileMetadata;
  const allowMultiple = fileMetadata?.multiple ?? false;
  const acceptAttr = fileMetadata?.accept ?? '*/*';

  const validateAndSetFiles = async (fileList: FileList) => {
    setIsLoading(true);
    const newFiles: File[] = [];
    const errors: string[] = [];

    for (let i = 0; i < fileList.length; i++) {
      const file = fileList[i];
      const strategy = registry.getStrategy(file.type);
      const result = strategy.validate(file, fileMetadata?.maxSizeBytes);

      if (result.success) {
        newFiles.push(file);
      } else {
        errors.push(...result.errors);
      }

      if (result.warnings.length > 0) {
        console.warn(`Warnings for ${file.name}:`, result.warnings);
      }
    }

    setFiles(allowMultiple ? [...files, ...newFiles] : newFiles);
    setValidationErrors(errors);
    setIsLoading(false);

    // Clear errors when new valid file is selected
    if (errors.length === 0 && newFiles.length > 0) {
      setValidationErrors([]);
    }
  };

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
    validateAndSetFiles(e.dataTransfer.files);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      validateAndSetFiles(e.target.files);
    }
  };

  const removeFile = (index: number) => {
    const newFiles = files.filter((_, i) => i !== index);
    setFiles(newFiles);
    setValidationErrors([]);
  };

  const { ref, ...registerProps } = register(schema.key);

  return (
    <div className="space-y-2">
      <label htmlFor={schema.key} className="text-sm font-medium">
        {schema.label}
      </label>

      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        className={`relative flex items-center justify-center w-full h-32 border-2 border-dashed rounded-md transition-colors ${
          isDragging
            ? 'border-primary bg-primary/5'
            : error || validationErrors.length > 0
            ? 'border-destructive'
            : 'border-input'
        }`}
        aria-label="Drag and drop files here"
      >
        <div className="text-center">
          <p className="text-sm text-muted-foreground">
            Drag and drop files here, or click to select
          </p>
          <Input
            id={schema.key}
            type="file"
            accept={acceptAttr}
            multiple={allowMultiple}
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

      {isLoading && (
        <div className="text-sm text-muted-foreground">Loading...</div>
      )}

      {validationErrors.length > 0 && (
        <div className="space-y-1" role="alert" aria-live="polite">
          {validationErrors.map((error, i) => (
            <p key={i} className="text-sm text-destructive">
              {error}
            </p>
          ))}
        </div>
      )}

      {files.length > 0 && (
        <div className="space-y-2">
          {files.map((file, index) => {
            const strategy = registry.getStrategy(file.type);
            const PreviewComponent = strategy.getPreviewComponent();
            return (
              <PreviewComponent
                key={`${file.name}-${index}`}
                file={file}
                onRemove={() => removeFile(index)}
              />
            );
          })}
        </div>
      )}

      {allowMultiple && files.length > 0 && (
        <p className="text-sm text-muted-foreground" aria-live="polite">
          {files.length} file{files.length !== 1 ? 's' : ''} selected
        </p>
      )}
    </div>
  );
}
