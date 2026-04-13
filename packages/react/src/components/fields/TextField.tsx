import { Input } from '@/components/ui/input';
import type { FieldProps } from './ComponentRegistry';

/**
 * TextField component for string inputs
 * Implements Requirements 33.1, 33.7, 63.1-63.3
 */
export function TextField({ schema, register, errors }: FieldProps) {
  const error = errors[schema.key];
  
  // Determine input type based on format
  let inputType = 'text';
  if (schema.format === 'email') {
    inputType = 'email';
  } else if (schema.format === 'uri' || schema.format === 'url') {
    inputType = 'url';
  } else if (schema.format === 'password') {
    inputType = 'password';
  } else if (schema.format === 'tel') {
    inputType = 'tel';
  }

  // Build help text from description and validation constraints - Requirement 63.2
  const helpText = schema.description || '';
  const validationInfo: string[] = [];
  if (schema.validations) {
    schema.validations.forEach(rule => {
      if (rule.type === 'minLength') {
        validationInfo.push(`Min length: ${rule.value}`);
      } else if (rule.type === 'maxLength') {
        validationInfo.push(`Max length: ${rule.value}`);
      } else if (rule.type === 'pattern') {
        validationInfo.push(`Pattern: ${rule.value}`);
      }
    });
  }
  const fullHelpText = [helpText, ...validationInfo].filter(Boolean).join(' • ');

  // Check if field should be textarea based on uiHint
  if (schema.uiHint?.widget === 'textarea') {
    return (
      <div>
        <textarea
          id={schema.key}
          {...register(schema.key)}
          className={`flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 ${
            error ? 'border-destructive' : ''
          }`}
          placeholder={schema.uiHint?.placeholder}
        />
        {/* Help Text - Requirements 63.1, 63.3 */}
        {fullHelpText && (
          <p className="text-xs text-muted-foreground mt-1">{fullHelpText}</p>
        )}
      </div>
    );
  }

  return (
    <div>
      <Input
        id={schema.key}
        type={inputType}
        placeholder={schema.uiHint?.placeholder}
        {...register(schema.key)}
        className={error ? 'border-destructive' : ''}
      />
      {/* Help Text - Requirements 63.1, 63.3 */}
      {fullHelpText && (
        <p className="text-xs text-muted-foreground mt-1">{fullHelpText}</p>
      )}
    </div>
  );
}
