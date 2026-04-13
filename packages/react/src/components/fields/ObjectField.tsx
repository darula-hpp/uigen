import { useState } from 'react';
import { Label } from '@/components/ui/label';
import type { FieldProps } from './ComponentRegistry';
import { componentRegistry } from './ComponentRegistry';

/**
 * ObjectField component for nested objects
 * Implements Requirements 33.11, 52.1-52.3
 */
export function ObjectField({ schema, register, errors }: FieldProps) {
  const error = errors[schema.key];
  const [isCollapsed, setIsCollapsed] = useState(false);

  // If no children, render as JSON textarea
  if (!schema.children || schema.children.length === 0) {
    return (
      <textarea
        id={schema.key}
        {...register(schema.key)}
        className={`flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 ${
          error ? 'border-destructive' : ''
        }`}
        placeholder={`Enter ${schema.label} as JSON`}
      />
    );
  }

  return (
    <fieldset className={`border rounded-md p-4 space-y-4 ${error ? 'border-destructive' : 'border-input'}`}>
      <legend className="px-2 text-sm font-medium flex items-center gap-2">
        <button
          type="button"
          onClick={() => setIsCollapsed(!isCollapsed)}
          className="text-muted-foreground hover:text-foreground"
        >
          {isCollapsed ? '▶' : '▼'}
        </button>
        {schema.label}
      </legend>
      
      {!isCollapsed && (
        <div className="space-y-4">
          {schema.children.map((childSchema) => {
            const FieldComponent = componentRegistry.getFieldComponent(childSchema);
            const childError = errors[`${schema.key}.${childSchema.key}`];
            
            return (
              <div key={childSchema.key} className="space-y-2">
                <Label htmlFor={`${schema.key}.${childSchema.key}`}>
                  {childSchema.label}
                  {childSchema.required && <span className="text-destructive ml-1">*</span>}
                </Label>
                <FieldComponent
                  schema={{ ...childSchema, key: `${schema.key}.${childSchema.key}` }}
                  value={undefined}
                  onChange={() => {}}
                  error={childError?.message as string}
                  register={register}
                  errors={errors}
                />
                {childError && (
                  <p className="text-sm text-destructive">{childError.message as string}</p>
                )}
                {childSchema.description && (
                  <p className="text-sm text-muted-foreground">{childSchema.description}</p>
                )}
              </div>
            );
          })}
        </div>
      )}
    </fieldset>
  );
}
