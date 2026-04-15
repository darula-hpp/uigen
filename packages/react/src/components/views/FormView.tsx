import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useApiMutation, useApiCall } from '@/hooks/useApiCall';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import type { Resource, SchemaNode, ValidationRule, Operation } from '@uigen-dev/core';
import { reconcile, OverrideHooksHost } from '@/overrides';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { useMemo, useEffect } from 'react';
import { componentRegistry } from '@/components/fields';

/**
 * Maps the React Router :id param to the actual path parameter name in the operation.
 */
function resolvePathParams(operation: Operation, id: string | undefined): Record<string, string> {
  if (!id) return {};
  const matches = operation.path.match(/\{([^}]+)\}/g);
  if (!matches || matches.length === 0) return { id };
  const paramName = matches[matches.length - 1].slice(1, -1);
  return { [paramName]: id };
}

interface FormViewProps {
  resource: Resource;
  mode: 'create' | 'edit';
  initialData?: Record<string, unknown>;
  onSuccess?: () => void;
}

/**
 * Generate Zod schema from IR SchemaNode
 * Implements Requirements 9.1, 9.2, 9.3
 */
function generateZodSchema(schemaNode: SchemaNode): z.ZodTypeAny {
  const fields = schemaNode.children || [];
  const shape: Record<string, z.ZodTypeAny> = {};

  for (const field of fields) {
    let fieldSchema: z.ZodTypeAny;

    // Base type mapping
    switch (field.type) {
      case 'string':
        // For required string fields, trim and reject empty strings
        fieldSchema = field.required 
          ? z.string().trim().min(1, `${field.label} is required`)
          : z.string().trim();
        break;
      case 'number':
      case 'integer':
        fieldSchema = z.number();
        break;
      case 'boolean':
        fieldSchema = z.boolean();
        break;
      case 'array':
        if (field.items) {
          const itemSchema = generateZodSchema(field.items);
          fieldSchema = z.array(itemSchema);
        } else {
          fieldSchema = z.array(z.any());
        }
        break;
      case 'object':
        if (field.children) {
          const nestedSchema = generateZodSchema(field);
          fieldSchema = nestedSchema;
        } else {
          fieldSchema = z.object({});
        }
        break;
      case 'enum':
        if (field.enumValues && field.enumValues.length > 0) {
          fieldSchema = z.enum(field.enumValues as [string, ...string[]]);
        } else {
          fieldSchema = z.string();
        }
        break;
      case 'date':
        fieldSchema = z.string().datetime();
        break;
      case 'file':
        fieldSchema = z.any(); // File handling requires special treatment
        break;
      default:
        fieldSchema = z.any();
    }

    // Apply format validations
    if (field.type === 'string' && field.format) {
      switch (field.format) {
        case 'email':
          fieldSchema = (fieldSchema as z.ZodString).email('Invalid email address');
          break;
        case 'uri':
        case 'url':
          fieldSchema = (fieldSchema as z.ZodString).url('Invalid URL');
          break;
        case 'date':
          fieldSchema = (fieldSchema as z.ZodString).regex(
            /^\d{4}-\d{2}-\d{2}$/,
            'Invalid date format (YYYY-MM-DD)'
          );
          break;
        case 'date-time':
          fieldSchema = (fieldSchema as z.ZodString).datetime('Invalid date-time format');
          break;
      }
    }

    // Apply validation rules from schema
    if (field.validations) {
      for (const validation of field.validations) {
        fieldSchema = applyValidationRule(fieldSchema, validation, field);
      }
    }

    // Handle required vs optional
    if (!field.required) {
      fieldSchema = fieldSchema.optional();
    }

    shape[field.key] = fieldSchema;
  }

  return z.object(shape);
}

/**
 * Apply individual validation rule to Zod schema
 * Implements Requirements 34.1-34.9
 */
function applyValidationRule(
  schema: z.ZodTypeAny,
  rule: ValidationRule,
  field: SchemaNode
): z.ZodTypeAny {
  const message = rule.message || `Validation failed for ${field.label}`;

  switch (rule.type) {
    case 'minLength':
      if (schema instanceof z.ZodString) {
        return schema.min(Number(rule.value), message);
      }
      break;
    case 'maxLength':
      if (schema instanceof z.ZodString) {
        return schema.max(Number(rule.value), message);
      }
      break;
    case 'pattern':
      if (schema instanceof z.ZodString) {
        return schema.regex(new RegExp(String(rule.value)), message);
      }
      break;
    case 'minimum':
      if (schema instanceof z.ZodNumber) {
        return schema.min(Number(rule.value), message);
      }
      break;
    case 'maximum':
      if (schema instanceof z.ZodNumber) {
        return schema.max(Number(rule.value), message);
      }
      break;
    case 'minItems':
      if (schema instanceof z.ZodArray) {
        return schema.min(Number(rule.value), message);
      }
      break;
    case 'maxItems':
      if (schema instanceof z.ZodArray) {
        return schema.max(Number(rule.value), message);
      }
      break;
    case 'email':
      if (schema instanceof z.ZodString) {
        return schema.email(message);
      }
      break;
    case 'url':
      if (schema instanceof z.ZodString) {
        return schema.url(message);
      }
      break;
  }

  return schema;
}

/**
 * Render appropriate input component based on field type using ComponentRegistry
 * Implements Requirements 9.2, 9.9, 33.1-33.11
 */
function renderFieldInput(
  field: SchemaNode,
  register: any,
  errors: any
): React.ReactElement {
  const FieldComponent = componentRegistry.getFieldComponent(field);
  
  return (
    <FieldComponent
      schema={field}
      value={undefined}
      onChange={() => {}}
      error={errors[field.key]?.message as string}
      register={register}
      errors={errors}
    />
  );
}

export function FormView({ resource, mode, initialData, onSuccess }: FormViewProps) {
  const navigate = useNavigate();
  const params = useParams<{ id: string }>();
  const [searchParams] = useSearchParams();
  
  // Construct view-specific uigenId
  const uigenId = `${resource.uigenId}.${mode}`;
  
  // Reconcile to determine override mode
  const { mode: overrideMode, renderFn } = reconcile(uigenId);
  
  // Get operation ID from query parameter (for resources with multiple create operations)
  const operationId = searchParams.get('operation');
  
  // Map mode to viewHint (edit mode uses 'update' viewHint)
  const viewHint = mode === 'edit' ? 'update' : mode;
  
  // Find operation: prioritize operationId if provided, otherwise find by viewHint
  const operation = operationId 
    ? resource.operations.find(op => op.id === operationId)
    : resource.operations.find(op => op.viewHint === viewHint);

  // For edit mode, fetch current resource data (Requirement 10.1, 10.2)
  const detailOperation = mode === 'edit' ? resource.operations.find(op => op.viewHint === 'detail') : undefined;
  const shouldFetchData = Boolean(mode === 'edit' && detailOperation && params.id);
  
  const { data: fetchedData, isLoading: isFetchingData, error: fetchError } = useApiCall({
    operation: detailOperation,
    pathParams: detailOperation && params.id ? resolvePathParams(detailOperation, params.id) : {},
    enabled: shouldFetchData,
  });

  // Use fetched data for edit mode, or initialData/empty object for create mode
  const formData = mode === 'edit' ? (fetchedData || initialData || {}) : (initialData || {});

  // Generate Zod schema from IR SchemaNode — only for fields that will be shown
  const zodSchema = useMemo(() => {
    if (!operation) return z.object({});
    const schema = operation.requestBody || resource.schema;
    // Build a filtered schema node so Zod only validates visible fields
    const filteredChildren = (schema.children || []).filter(field => !field.readOnly);
    return generateZodSchema({ ...schema, children: filteredChildren });
  }, [operation, resource.schema, mode]);

  // Set up React Hook Form with Zod resolver
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    reset,
  } = useForm({
    resolver: zodResolver(zodSchema),
    defaultValues: formData,
  });

  // Reset form when fetched data changes (for edit mode)
  // Map response keys (snake_case) to form field keys using the schema
  useEffect(() => {
    if (mode !== 'edit' || !fetchedData || !operation) return;
    const formFields = (operation.requestBody?.children || []).filter(f => !f.readOnly).map(f => f.key);
    const mapped: Record<string, unknown> = {};
    for (const formKey of formFields) {
      if (formKey in fetchedData) { mapped[formKey] = (fetchedData as any)[formKey]; continue; }
      const snakeKey = formKey.replace(/([A-Z])/g, '_$1').toLowerCase().replace(/^_/, '');
      if (snakeKey in fetchedData) { mapped[formKey] = (fetchedData as any)[snakeKey]; continue; }
      const camelKey = formKey.charAt(0).toLowerCase() + formKey.slice(1);
      if (camelKey in fetchedData) { mapped[formKey] = (fetchedData as any)[camelKey]; }
    }
    reset(Object.keys(mapped).length > 0 ? mapped : fetchedData);
  }, [fetchedData, mode, reset, operation]);

  const mutation = useApiMutation(operation!);

  if (!operation) {
    return <div className="p-4 text-muted-foreground">No {mode} operation available</div>;
  }

  // Show loading state while fetching data for edit mode (Requirement 10.2)
  if (mode === 'edit' && isFetchingData) {
    return (
      <div className="space-y-6">
        <h2 className="text-2xl font-bold">Edit {resource.name}</h2>
        <div className="space-y-4 max-w-2xl">
          {[1, 2, 3].map((i) => (
            <div key={i} className="space-y-2">
              <div className="h-4 w-24 bg-muted animate-pulse rounded" />
              <div className="h-10 w-full bg-muted animate-pulse rounded" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  // Show error state if fetching fails for edit mode (Requirement 10.7)
  if (mode === 'edit' && fetchError) {
    return (
      <div className="space-y-6">
        <h2 className="text-2xl font-bold">Edit {resource.name}</h2>
        <div className="p-4 border border-destructive rounded-md">
          <p className="text-destructive">Error loading data: {fetchError.message}</p>
        </div>
      </div>
    );
  }

  const schema = operation.requestBody || resource.schema;

  const fields = (schema.children || []).filter(field => !field.readOnly);

  const onSubmit = async (data: Record<string, unknown>) => {
    try {
      // For edit mode, include the id in path params (Requirement 10.5)
      const mutationParams = mode === 'edit' && params.id && operation
        ? { pathParams: resolvePathParams(operation, params.id), body: data }
        : { body: data };
      
      await mutation.mutateAsync(mutationParams);
      
      if (onSuccess) {
        onSuccess();
      } else if (mode === 'edit' && params.id) {
        navigate(`/${resource.slug}/${params.id}`);
      } else {
        navigate(`/${resource.slug}`);
      }
    } catch (error) {
      // Error is handled by mutation.isError below (Requirement 10.7)
      console.error('Form submission error:', error);
    }
  };

  // Render mode: call renderFn with form data and methods
  if (overrideMode === 'render' && renderFn) {
    try {
      return <>{renderFn({ 
        resource, 
        operation,
        data: formData, 
        isLoading: isFetchingData, 
        error: fetchError,
        mode,
        formMethods: {
          register,
          handleSubmit,
          errors,
          isSubmitting: isSubmitting || mutation.isPending
        }
      })}</>;
    } catch (err) {
      console.error(`[UIGen Override] Error in render function for "${uigenId}":`, err);
      // Fall through to built-in view
    }
  }

  // Built-in form content
  const content = (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold">
        {mode === 'create' ? 'Create' : 'Edit'} {resource.name}
      </h2>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 max-w-2xl">
        {fields.map(field => (
          <div key={field.key} className="space-y-2">
            <Label htmlFor={field.key}>
              {field.label}
              {field.required && <span className="text-destructive ml-1">*</span>}
            </Label>
            {renderFieldInput(field, register, errors)}
            {errors[field.key] && (
              <p className="text-sm text-destructive">{errors[field.key]?.message as string}</p>
            )}
            {field.description && (
              <p className="text-sm text-muted-foreground">{field.description}</p>
            )}
          </div>
        ))}

        <div className="flex gap-2">
          <Button type="submit" disabled={isSubmitting || mutation.isPending}>
            {isSubmitting || mutation.isPending 
              ? (mode === 'edit' ? 'Updating...' : 'Creating...') 
              : (mode === 'edit' ? 'Update' : 'Create')}
          </Button>
          <Button type="button" variant="outline" onClick={() => navigate(`/${resource.slug}`)}>
            Cancel
          </Button>
        </div>

        {mutation.isError && (
          <p className="text-sm text-destructive">
            Error {mode === 'edit' ? 'updating' : 'creating'} {resource.name.toLowerCase()}: {mutation.error.message}
          </p>
        )}
      </form>
    </div>
  );

  // Hooks mode: wrap in OverrideHooksHost
  if (overrideMode === 'hooks') {
    return (
      <OverrideHooksHost uigenId={uigenId} resource={resource} operation={operation}>
        {content}
      </OverrideHooksHost>
    );
  }

  // None mode: render built-in as normal
  return content;
}
