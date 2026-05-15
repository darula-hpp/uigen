import { useMemo } from 'react';
import { useFormContext } from 'react-hook-form';
import { Input } from '@/components/ui/input';
import type { FieldProps } from './ComponentRegistry';
import { DateTimeConverter } from '@/lib/datetime-converter';

/**
 * DateTimeField component with format conversion and timezone support
 * 
 * Implements Requirements:
 * - 10.1-10.6: React DateTime Field Component
 * - 11.1-11.6: DateTime Input Handling
 * - 12.1-12.5: Timezone Display
 * - 27.1-27.4: Bidirectional Conversion
 * - 28.1-28.5: Unix Timestamp Support
 * - 29.1-29.3: Custom API Format Patterns
 * - 30.1-30.5: Backward Compatibility
 */
export function DateTimeField({ schema, register, errors }: FieldProps) {
  const { setValue, watch } = useFormContext();
  const error = errors[schema.key];
  const apiValue = watch(schema.key); // Value in API format
  
  // Get datetime configuration with defaults
  const config = schema.dateTimeConfig || {
    format: 'MMM DD, YYYY',
    inputType: 'date' as const
  };
  
  // Default to ISO 8601 when apiFormat not specified
  const apiFormat = config.apiFormat || 'ISO8601';
  
  // Determine if we should use HTML datetime-local conversion
  const useHtmlDateTimeLocal = config.inputType === 'datetime-local';
  
  // Convert API value to display format
  const displayValue = useMemo(() => {
    if (!apiValue) return '';
    
    if (useHtmlDateTimeLocal && apiFormat === 'ISO8601') {
      // Use specialized HTML datetime-local conversion
      return DateTimeConverter.isoToHtmlDateTimeLocal(
        apiValue,
        config.timezone
      );
    }
    
    // Use existing generic conversion for other formats
    return DateTimeConverter.fromApi(
      apiValue,
      apiFormat,
      config.format,
      config.timezone
    );
  }, [apiValue, config.format, apiFormat, config.timezone, useHtmlDateTimeLocal]);
  
  // Handle input change - convert display format to API format
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const inputValue = e.target.value;
    
    if (!inputValue) {
      setValue(schema.key, null, {
        shouldValidate: true,
        shouldDirty: true
      });
      return;
    }
    
    let convertedApiValue: string | number | null;
    
    if (useHtmlDateTimeLocal && apiFormat === 'ISO8601') {
      // Use specialized HTML datetime-local conversion
      convertedApiValue = DateTimeConverter.htmlDateTimeLocalToISO(
        inputValue,
        config.timezone
      );
    } else {
      // Use existing generic conversion
      convertedApiValue = DateTimeConverter.toApi(
        inputValue,
        config.format,
        apiFormat,
        config.timezone
      );
    }
    
    if (convertedApiValue !== null) {
      setValue(schema.key, convertedApiValue, {
        shouldValidate: true,
        shouldDirty: true
      });
    }
  };
  
  const { ref, onChange: _registerOnChange, ...registerProps } = register(schema.key);
  
  return (
    <div className="space-y-2">
      <Input
        id={schema.key}
        type={config.inputType}
        value={displayValue}
        onChange={handleChange}
        placeholder={config.format}
        aria-invalid={error ? 'true' : 'false'}
        aria-describedby={error ? `${schema.key}-error` : undefined}
        {...registerProps}
        ref={ref}
      />
      
      {config.timezone && (
        <p className="text-sm text-muted-foreground">
          Timezone: {config.timezone === 'local' ? 'Local' : config.timezone}
        </p>
      )}
      
      {error && (
        <p id={`${schema.key}-error`} className="text-sm text-destructive">
          {String(typeof error === 'string' ? error : error.message || '')}
        </p>
      )}
    </div>
  );
}
