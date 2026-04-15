import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useApiMutation, useApiCall } from '@/hooks/useApiCall';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import type { Resource, SchemaNode, ValidationRule, Operation } from '@uigen-dev/core';
import { reconcile, OverrideHooksHost } from '@/overrides';
import { useNavigate, useParams } from 'react-router-dom';
import { useMemo, useState, useEffect } from 'react';
import { componentRegistry } from '@/components/fields';
import { ChevronLeft, ChevronRight, Check } from 'lucide-react';

function resolvePathParams(operation: Operation, id: string | undefined): Record<string, string> {
  if (!id) return {};
  const matches = operation.path.match(/\{([^}]+)\}/g);
  if (!matches || matches.length === 0) return { id };
  const paramName = matches[matches.length - 1].slice(1, -1);
  return { [paramName]: id };
}

interface WizardViewProps {
  resource: Resource;
  mode?: 'create' | 'edit';
  initialData?: Record<string, unknown>;
  onSuccess?: () => void;
}

interface WizardStep {
  title: string;
  fields: SchemaNode[];
}

/**
 * Generate Zod schema from IR SchemaNode
 * Implements Requirements 14.4, 34.1-34.9
 */
function generateZodSchema(schemaNode: SchemaNode): z.ZodTypeAny {
  const fields = schemaNode.children || [];
  const shape: Record<string, z.ZodTypeAny> = {};

  for (const field of fields) {
    let fieldSchema: z.ZodTypeAny;

    // Base type mapping
    switch (field.type) {
      case 'string':
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
        fieldSchema = z.any();
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
  }

  return schema;
}

/**
 * Group fields into steps with maximum 5 fields per step
 * Implements Requirement 14.2
 */
function groupFieldsIntoSteps(fields: SchemaNode[]): WizardStep[] {
  const MAX_FIELDS_PER_STEP = 5;
  const steps: WizardStep[] = [];
  
  for (let i = 0; i < fields.length; i += MAX_FIELDS_PER_STEP) {
    const stepFields = fields.slice(i, i + MAX_FIELDS_PER_STEP);
    const stepNumber = Math.floor(i / MAX_FIELDS_PER_STEP) + 1;
    
    steps.push({
      title: `Step ${stepNumber}`,
      fields: stepFields,
    });
  }
  
  return steps;
}

/**
 * Render appropriate input component based on field type
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

/**
 * WizardView component - multi-step form for operations with many fields
 * Implements Requirements 14.1-14.7
 */
export function WizardView({ resource, mode = 'create', initialData, onSuccess }: WizardViewProps) {
  const navigate = useNavigate();
  const params = useParams<{ id: string }>();
  
  // Construct view-specific uigenId
  const uigenId = `${resource.uigenId}.${mode}`;
  
  // Reconcile to determine override mode
  const { mode: overrideMode, renderFn } = reconcile(uigenId);
  
  // Find wizard or update operation based on mode
  const operation = mode === 'edit'
    ? resource.operations.find(op => op.viewHint === 'update')
      // Fallback: POST action on a path with a path param (Twilio-style update)
      || resource.operations.find(op => op.viewHint === 'action' && op.method === 'POST' && op.path.includes('{') && !!op.requestBody)
      || resource.operations.find(op => op.viewHint === 'wizard')
    : resource.operations.find(op => op.viewHint === 'wizard');

  // Current step state (Requirement 14.7 - persist step data)
  const [currentStep, setCurrentStep] = useState(0);
  const [completedSteps, setCompletedSteps] = useState<Set<number>>(new Set());

  // For edit mode, fetch current resource data
  const detailOperation = mode === 'edit' ? resource.operations.find(op => op.viewHint === 'detail') : undefined;
  const { data: fetchedData, isLoading: isFetchingData } = useApiCall({
    operation: detailOperation,
    pathParams: detailOperation && params.id ? resolvePathParams(detailOperation, params.id) : {},
    enabled: mode === 'edit' && !!detailOperation && !!params.id,
  });

  // Merge: fetched data takes priority over passed initialData
  const resolvedInitialData = mode === 'edit' ? (fetchedData || initialData) : initialData;

  // Get schema and filter out readOnly fields
  const schema = operation?.requestBody || resource.schema;
  const fields = (schema.children || []).filter(field => {
    const isReadOnly = (field as any).readOnly === true;
    return !isReadOnly;
  });

  // Group fields into steps (Requirement 14.2)
  const steps = useMemo(() => groupFieldsIntoSteps(fields), [fields]);

  // Generate Zod schema for the entire form
  const fullZodSchema = useMemo(() => {
    if (!operation) return z.object({});
    return generateZodSchema(schema);
  }, [operation, schema]);

  // Generate Zod schema for current step only (for step validation)
  const currentStepSchema = useMemo(() => {
    if (steps.length === 0) return z.object({});
    
    const stepFields = steps[currentStep].fields;
    const shape: Record<string, z.ZodTypeAny> = {};
    
    const fullSchema = fullZodSchema as z.ZodObject<any>;
    const fullShape = fullSchema.shape;
    
    for (const field of stepFields) {
      if (fullShape[field.key]) {
        shape[field.key] = fullShape[field.key];
      }
    }
    
    return z.object(shape);
  }, [currentStep, steps, fullZodSchema]);

  // Set up React Hook Form
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    trigger,
    getValues,
    reset,
  } = useForm({
    resolver: zodResolver(fullZodSchema),
    mode: 'onBlur',
    defaultValues: resolvedInitialData,
  });

  // Reset form when fetched data arrives (edit mode)
  // Map response keys (snake_case) to form field keys (PascalCase) using the schema
  useEffect(() => {
    if (!fetchedData || !operation) return;
    const formFields = (operation.requestBody?.children || []).map(f => f.key);
    const mapped: Record<string, unknown> = {};
    for (const formKey of formFields) {
      // Try exact match first
      if (formKey in fetchedData) {
        mapped[formKey] = (fetchedData as any)[formKey];
        continue;
      }
      // Try snake_case version of the PascalCase key
      const snakeKey = formKey
        .replace(/([A-Z])/g, '_$1')
        .toLowerCase()
        .replace(/^_/, '');
      if (snakeKey in fetchedData) {
        mapped[formKey] = (fetchedData as any)[snakeKey];
        continue;
      }
      // Try camelCase version
      const camelKey = formKey.charAt(0).toLowerCase() + formKey.slice(1);
      if (camelKey in fetchedData) {
        mapped[formKey] = (fetchedData as any)[camelKey];
      }
    }
    reset(mapped, { keepIsSubmitted: false, keepSubmitCount: false });
  }, [fetchedData, reset, operation]);

  const mutation = useApiMutation(operation!);

  if (!operation) {
    return <div className="p-4 text-muted-foreground">No wizard operation available</div>;
  }

  if (steps.length === 0) {
    return <div className="p-4 text-muted-foreground">No fields to display</div>;
  }

  if (isFetchingData) {
    return (
      <div className="space-y-4 max-w-4xl mx-auto">
        <div className="h-8 w-48 bg-muted animate-pulse rounded" />
        {[1,2,3].map(i => <div key={i} className="h-10 w-full bg-muted animate-pulse rounded" />)}
      </div>
    );
  }

  // Validate current step before moving forward (Requirement 14.4)
  const validateCurrentStep = async (): Promise<boolean> => {
    const stepFields = steps[currentStep].fields.map(f => f.key);
    const isValid = await trigger(stepFields);
    
    if (isValid) {
      setCompletedSteps(prev => new Set([...prev, currentStep]));
    }
    
    return isValid;
  };

  // Navigate to next step
  const handleNext = async () => {
    const isValid = await validateCurrentStep();
    
    if (isValid && currentStep < steps.length - 1) {
      setCurrentStep(currentStep + 1);
    }
  };

  // Navigate to previous step (Requirement 14.5)
  const handlePrevious = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  // Navigate to specific step (only if it's a previous step or the next immediate step)
  const handleStepClick = async (stepIndex: number) => {
    if (stepIndex < currentStep) {
      // Allow going back to any previous step (Requirement 14.5)
      setCurrentStep(stepIndex);
    } else if (stepIndex === currentStep + 1) {
      // Allow going to next step if current step is valid
      const isValid = await validateCurrentStep();
      if (isValid) {
        setCurrentStep(stepIndex);
      }
    }
  };

  // Submit the entire form (Requirement 14.6)
  const onSubmit = async (data: Record<string, unknown>) => {
    try {
      const mutationParams = mode === 'edit' && params.id
        ? { pathParams: resolvePathParams(operation!, params.id), body: data }
        : { body: data };
      await mutation.mutateAsync(mutationParams);
      if (onSuccess) {
        onSuccess();
      } else {
        navigate(`/${resource.slug}`);
      }
    } catch (error) {
      console.error('Form submission error:', error);
    }
  };

  // Submit the entire form (Requirement 14.6)
  const handleFormSubmit = async () => {
    handleSubmit(onSubmit)();
  };

  const currentStepData = steps[currentStep];
  const isLastStep = currentStep === steps.length - 1;
  const isFirstStep = currentStep === 0;

  // Render mode: call renderFn with wizard data
  if (overrideMode === 'render' && renderFn) {
    try {
      return <>{renderFn({ 
        resource, 
        operation,
        data: getValues(), 
        isLoading: isFetchingData, 
        error: null,
        currentStep,
        totalSteps: steps.length,
        nextStep: handleNext,
        previousStep: handlePrevious,
        goToStep: handleStepClick,
        isFirstStep,
        isLastStep
      })}</>;
    } catch (err) {
      console.error(`[UIGen Override] Error in render function for "${uigenId}":`, err);
      // Fall through to built-in view
    }
  }

  // Built-in wizard content
  const content = (
    <div className="space-y-6 max-w-4xl mx-auto">
      <h2 className="text-2xl font-bold">{mode === 'edit' ? 'Edit' : 'Create'} {resource.name}</h2>

      {/* Step Progress Indicator - Requirement 14.3 */}
      <div className="flex items-center justify-between mb-8">
        {steps.map((step, index) => {
          const isCompleted = completedSteps.has(index);
          const isCurrent = index === currentStep;
          const isPast = index < currentStep;
          
          return (
            <div key={index} className="flex items-center flex-1">
              <div className="flex flex-col items-center flex-1">
                <button
                  type="button"
                  onClick={() => handleStepClick(index)}
                  disabled={index > currentStep && !completedSteps.has(currentStep)}
                  className={`
                    w-10 h-10 rounded-full flex items-center justify-center font-semibold
                    transition-colors duration-200
                    ${isCurrent 
                      ? 'bg-primary text-primary-foreground ring-2 ring-primary ring-offset-2' 
                      : isPast || isCompleted
                        ? 'bg-primary text-primary-foreground cursor-pointer hover:bg-primary/90'
                        : 'bg-muted text-muted-foreground cursor-not-allowed'
                    }
                  `}
                >
                  {isCompleted || isPast ? (
                    <Check className="w-5 h-5" />
                  ) : (
                    index + 1
                  )}
                </button>
                <span className={`
                  mt-2 text-sm font-medium
                  ${isCurrent ? 'text-foreground' : 'text-muted-foreground'}
                `}>
                  {step.title}
                </span>
              </div>
              
              {/* Connector line between steps */}
              {index < steps.length - 1 && (
                <div className={`
                  h-0.5 flex-1 mx-2 -mt-8
                  ${isPast || isCompleted ? 'bg-primary' : 'bg-muted'}
                `} />
              )}
            </div>
          );
        })}
      </div>

      {/* Current Step Form Fields */}
      <form
        onSubmit={(e) => e.preventDefault()}
        onKeyDown={(e) => { if (e.key === 'Enter') e.preventDefault(); }}
        className="space-y-6"
      >
        <div className="space-y-4">
          {currentStepData.fields.map(field => (
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
        </div>

        {/* Navigation Buttons */}
        <div className="flex justify-between pt-6 border-t">
          <Button
            type="button"
            variant="outline"
            onClick={handlePrevious}
            disabled={isFirstStep}
          >
            <ChevronLeft className="w-4 h-4 mr-2" />
            Previous
          </Button>

          <div className="flex gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => navigate(`/${resource.slug}`)}
            >
              Cancel
            </Button>

            {!isLastStep ? (
              <Button
                type="button"
                onClick={handleNext}
              >
                Next
                <ChevronRight className="w-4 h-4 ml-2" />
              </Button>
            ) : (
              <Button
                type="button"
                onClick={handleFormSubmit}
                disabled={isSubmitting || mutation.isPending || isFetchingData}
              >
                {isSubmitting || mutation.isPending ? 'Submitting...' : 'Submit'}
              </Button>
            )}
          </div>
        </div>

        {mutation.isError && (
          <p className="text-sm text-destructive">
            Error creating {resource.name.toLowerCase()}: {mutation.error.message}
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
