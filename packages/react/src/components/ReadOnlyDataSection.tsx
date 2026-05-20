import type { SchemaNode } from '@uigen-dev/core';
import { cn } from '@/lib/utils';
import { ReadOnlyFieldsLayout } from '@/components/ReadOnlyFieldsLayout';

export type ReadOnlyDataSectionVariant = 'default' | 'action-result';

interface ReadOnlyDataSectionProps {
  title: string;
  description?: string;
  fields: SchemaNode[];
  data: Record<string, unknown>;
  variant?: ReadOnlyDataSectionVariant;
  className?: string;
  ariaLabel?: string;
}

const variantStyles: Record<ReadOnlyDataSectionVariant, string> = {
  default: 'border bg-card',
  'action-result': 'border border-primary/30 bg-primary/5 shadow-sm',
};

/**
 * Titled read-only section for detail views and action responses.
 */
export function ReadOnlyDataSection({
  title,
  description,
  fields,
  data,
  variant = 'default',
  className,
  ariaLabel,
}: ReadOnlyDataSectionProps) {
  return (
    <section
      role="region"
      aria-label={ariaLabel ?? title}
      className={cn('rounded-lg p-5', variantStyles[variant], className)}
    >
      <div className="mb-4 border-b pb-3">
        <h3 className="text-base font-semibold text-foreground">{title}</h3>
        {description ? (
          <p className="mt-1 text-sm text-muted-foreground">{description}</p>
        ) : null}
      </div>

      <ReadOnlyFieldsLayout fields={fields} data={data} />
    </section>
  );
}
