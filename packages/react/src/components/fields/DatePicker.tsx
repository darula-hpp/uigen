import { Input } from '@/components/ui/input';
import type { FieldProps } from './ComponentRegistry';

/**
 * DatePicker component for date inputs
 * Implements Requirements 33.5, 48.1-48.5
 */
export function DatePicker({ schema, register, errors }: FieldProps) {
  const error = errors[schema.key];

  return (
    <Input
      id={schema.key}
      type="date"
      {...register(schema.key)}
      className={error ? 'border-destructive' : ''}
    />
  );
}
