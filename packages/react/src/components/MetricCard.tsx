import type { SchemaNode } from '@uigen-dev/core';
import { cn } from '@/lib/utils';
import { formatMetricValue } from '@/lib/format-metric-value';
import { resolveMetricSuffix } from '@/lib/field-display-mode';

interface MetricCardProps {
  field: SchemaNode;
  value: unknown;
  data: Record<string, unknown>;
  className?: string;
}

export function MetricCard({ field, value, data, className }: MetricCardProps) {
  const suffix = resolveMetricSuffix(field, data);

  return (
    <div
      className={cn(
        'rounded-lg border bg-card p-4 shadow-sm',
        className
      )}
    >
      <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
        {field.label}
      </p>
      <p className="mt-2 text-3xl font-semibold tabular-nums text-foreground">
        {formatMetricValue(value, field)}
        {suffix ? (
          <span className="ml-1 text-lg font-medium text-muted-foreground">{suffix}</span>
        ) : null}
      </p>
      {field.description ? (
        <p className="mt-2 text-xs text-muted-foreground">{field.description}</p>
      ) : null}
    </div>
  );
}
