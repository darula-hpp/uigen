import type { SchemaNode } from '@uigen/core';
import { componentRegistry } from '@/components/fields';
import { useForm } from 'react-hook-form';

interface DynamicFormProps {
  schema: SchemaNode;
  value: Record<string, unknown>;
  onChange: (value: Record<string, unknown>) => void;
  errors?: Record<string, string>;
}

/**
 * DynamicForm component - renders form fields dynamically from schema
 * Used for custom action dialogs and inline forms
 */
export function DynamicForm({ schema, value, onChange, errors = {} }: DynamicFormProps) {
  const fields = schema.children || [];
  
  // Create a minimal form instance for field components that need register
  const { register, formState: { errors: formErrors } } = useForm({
    defaultValues: value
  });

  const handleFieldChange = (fieldKey: string, fieldValue: unknown) => {
    onChange({
      ...value,
      [fieldKey]: fieldValue
    });
  };

  return (
    <div className="space-y-4">
      {fields.map((field) => {
        if (field.readOnly) return null;

        const FieldComponent = componentRegistry.getFieldComponent(field);

        return (
          <div key={field.key}>
            <FieldComponent
              schema={field}
              value={value[field.key]}
              onChange={(newValue) => handleFieldChange(field.key, newValue)}
              error={errors[field.key]}
              register={register}
              errors={formErrors}
            />
          </div>
        );
      })}
    </div>
  );
}
