import type { SchemaNode } from '@uigen-dev/core';
import { cn } from '@/lib/utils';
import { formatFieldValue } from '@/lib/format-field-value';
import { partitionFieldsByDisplayMode, resolveFieldDisplayMode, resolveMetricSuffix } from '@/lib/field-display-mode';
import { MetricCard } from '@/components/MetricCard';

type IgnorableSchemaNode = SchemaNode & { __shouldIgnore?: boolean };

interface ReadOnlyFieldsLayoutProps {
  fields: SchemaNode[];
  data: Record<string, unknown>;
  className?: string;
}

function isVisibleField(field: SchemaNode): boolean {
  return !(field as IgnorableSchemaNode).__shouldIgnore;
}

function filterRedundantUnitField(fields: SchemaNode[], data: Record<string, unknown>): SchemaNode[] {
  const usesUnitSuffix = fields.some(
    (field) =>
      resolveFieldDisplayMode(field) === 'metric'
      && resolveMetricSuffix(field, data) !== undefined
  );

  if (!usesUnitSuffix) {
    return fields;
  }

  return fields.filter((field) => field.key !== 'unit');
}

function FieldBadge({ field, value }: { field: SchemaNode; value: unknown }) {
  const label = formatFieldValue(value, field);

  return (
    <span className="inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium">
      {label}
    </span>
  );
}

/**
 * Read-only field layout with metric cards for numeric measurements and
 * definition-list rows for everything else.
 */
export function ReadOnlyFieldsLayout({ fields, data, className }: ReadOnlyFieldsLayoutProps) {
  const visibleFields = filterRedundantUnitField(fields.filter(isVisibleField), data);
  const { metricFields, badgeFields, defaultFields } = partitionFieldsByDisplayMode(visibleFields);

  if (visibleFields.length === 0) {
    return null;
  }

  return (
    <div className={cn('space-y-6', className)}>
      {metricFields.length > 0 ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {metricFields.map((field) => (
            <MetricCard
              key={field.key}
              field={field}
              value={data[field.key]}
              data={data}
            />
          ))}
        </div>
      ) : null}

      {badgeFields.length > 0 || defaultFields.length > 0 ? (
        <dl className="grid gap-4 sm:grid-cols-2">
          {[...badgeFields, ...defaultFields].map((field) => (
            <div key={field.key} className="space-y-1 rounded-lg border bg-card/40 p-4">
              <dt className="text-sm font-medium text-muted-foreground">{field.label}</dt>
              <dd className="text-base text-foreground">
                {resolveFieldDisplayMode(field) === 'badge' ? (
                  <FieldBadge field={field} value={data[field.key]} />
                ) : (
                  formatFieldValue(data[field.key], field)
                )}
              </dd>
              {field.description ? (
                <p className="text-xs text-muted-foreground">{field.description}</p>
              ) : null}
            </div>
          ))}
        </dl>
      ) : null}
    </div>
  );
}
