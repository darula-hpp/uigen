import { Input } from '@/components/ui/input';
import type { FieldProps } from './ComponentRegistry';

/**
 * DateTimePicker component for date-time inputs
 * Implements Requirements 33.6, 48.3
 */
export function DateTimePicker({ schema, register, errors }: FieldProps) {
  const error = errors[schema.key];

  return (
    <Input
      id={schema.key}
      type="datetime-local"
      {...register(schema.key)}
      className={error ? 'border-destructive' : ''}
    />
  );
}
