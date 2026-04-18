import { useQuery } from '@tanstack/react-query';
import type { FieldProps } from './ComponentRegistry';
import { resolveLabel } from '../../lib/resolve-label';
import { TextField } from './TextField';

/**
 * RefSelectField component for x-uigen-ref annotated fields
 * Implements Requirements 6.1-6.6
 */
export function RefSelectField({ schema, register, errors }: FieldProps) {
  const error = errors[schema.key];
  const refConfig = (schema as any).refConfig;

  // Build fetch URL with filter params
  const filterParams = refConfig.filter
    ? new URLSearchParams(
        Object.entries(refConfig.filter).reduce((acc, [key, value]) => {
          acc[key] = String(value);
          return acc;
        }, {} as Record<string, string>)
      ).toString()
    : '';
  const fetchUrl = filterParams
    ? `${refConfig.resource}?${filterParams}`
    : refConfig.resource;

  // Fetch options from the referenced resource
  const { data, isLoading, isError, error: fetchError } = useQuery({
    queryKey: [refConfig.resource, refConfig.filter],
    queryFn: async () => {
      const response = await fetch(fetchUrl);
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      return response.json();
    },
    enabled: true,
  });

  // Handle loading state
  if (isLoading) {
    return (
      <select
        id={schema.key}
        disabled
        className={`flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 ${
          error ? 'border-destructive' : ''
        }`}
      >
        <option value="">Loading...</option>
      </select>
    );
  }

  // Handle error state - fall back to TextField
  if (isError) {
    console.warn(
      `[RefSelectField] Failed to fetch options from ${refConfig.resource}: ${
        fetchError instanceof Error ? fetchError.message : 'Unknown error'
      }`
    );
    return <TextField schema={schema} register={register} errors={errors} value="" onChange={() => {}} />;
  }

  // Handle empty response
  if (!data || !Array.isArray(data) || data.length === 0) {
    return (
      <select
        id={schema.key}
        {...register(schema.key)}
        className={`flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 ${
          error ? 'border-destructive' : ''
        }`}
      >
        <option value="">No options available</option>
      </select>
    );
  }

  // Map fetched records to options
  const options = data.map((record: Record<string, unknown>) => ({
    value: String(record[refConfig.valueField]),
    label: resolveLabel(refConfig.labelField, record),
  }));

  return (
    <select
      id={schema.key}
      {...register(schema.key)}
      className={`flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 ${
        error ? 'border-destructive' : ''
      }`}
    >
      <option value="">Select {schema.label}</option>
      {options.map((option) => (
        <option key={option.value} value={option.value}>
          {option.label}
        </option>
      ))}
    </select>
  );
}
