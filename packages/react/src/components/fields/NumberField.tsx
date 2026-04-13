import { Input } from '@/components/ui/input';
import type { FieldProps } from './ComponentRegistry';

/**
 * NumberField component for numeric inputs
 * Implements Requirements 33.2, 49.1-49.4
 */
export function NumberField({ schema, register, errors }: FieldProps) {
  const error = errors[schema.key];
  
  // Determine step based on type
  const step = schema.type === 'integer' ? '1' : 'any';

  return (
    <Input
      id={schema.key}
      type="number"
      step={step}
      {...register(schema.key, { valueAsNumber: true })}
      className={error ? 'border-destructive' : ''}
    />
  );
}
