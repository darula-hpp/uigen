import type { FieldProps } from './ComponentRegistry';

/**
 * SelectField component for enum inputs
 * Implements Requirements 33.4, 71.1-71.4
 */
export function SelectField({ schema, register, errors }: FieldProps) {
  const error = errors[schema.key];
  const enumValues = schema.enumValues || [];
  
  // Support x-enumNames for display labels (OpenAPI extension)
  const enumNames = (schema as any)['x-enumNames'] || enumValues;

  return (
    <select
      id={schema.key}
      {...register(schema.key)}
      className={`flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 ${
        error ? 'border-destructive' : ''
      }`}
    >
      <option value="">Select {schema.label}</option>
      {enumValues.map((value, index) => (
        <option key={value} value={value}>
          {enumNames[index] || value}
        </option>
      ))}
    </select>
  );
}
