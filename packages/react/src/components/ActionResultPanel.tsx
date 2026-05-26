import type { Operation } from '@uigen-dev/core';
import { ReadOnlyDataSection } from '@/components/ReadOnlyDataSection';
import { resolveActionResultFields } from '@/lib/resolve-action-result-fields';

interface ActionResultPanelProps {
  operation: Operation;
  data: unknown;
  className?: string;
  title?: string;
}

/**
 * Displays structured fields from a successful non-CRUD action response.
 */
export function ActionResultPanel({ operation, data, className, title }: ActionResultPanelProps) {
  if (!data || typeof data !== 'object' || Array.isArray(data)) {
    return null;
  }

  const fields = resolveActionResultFields(operation, data);
  if (fields.length === 0) {
    return null;
  }

  const payload = data as Record<string, unknown>;
  const actionTitle = title ?? `${operation.summary || operation.id} result`;

  return (
    <ReadOnlyDataSection
      className={className}
      variant="action-result"
      title={actionTitle}
      fields={fields}
      data={payload}
      ariaLabel={actionTitle}
    />
  );
}
