import type { FieldProps } from './ComponentRegistry';

/**
 * CheckboxField component for boolean inputs
 * Implements Requirements 33.3, 50.1-50.3
 */
export function CheckboxField({ schema, register, errors }: FieldProps) {
  const error = errors[schema.key];
  
  return (
    <div className="flex items-center space-x-2">
      <input
        id={schema.key}
        type="checkbox"
        {...register(schema.key)}
        className={`h-4 w-4 rounded border-gray-300 text-primary focus:ring-2 focus:ring-ring focus:ring-offset-2 ${
          error ? 'border-destructive' : ''
        }`}
      />
    </div>
  );
}
