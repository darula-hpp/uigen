import type { Resource, Operation } from '@uigen-dev/core';

export function resolveRefListOperation(resource?: Resource): Operation | undefined {
  return resource?.operations.find(
    (operation) => operation.viewHint === 'list' || operation.viewHint === 'search',
  );
}

export function resolveRefDisplayFields(resource: Resource): {
  valueField: string;
  labelField: string;
} {
  const children = resource.schema.children ?? [];
  const valueField = children.find((child) => child.key === 'id')?.key
    ?? children.find((child) => child.type === 'integer' || child.type === 'string')?.key
    ?? 'id';
  const labelField = children.find((child) => ['name', 'label', 'title'].includes(child.key))?.key
    ?? children.find((child) => child.type === 'string' && child.key !== valueField)?.key
    ?? valueField;

  return { valueField, labelField };
}

export function humanizeChartLabel(value: string): string {
  return value
    .replace(/([A-Z])/g, ' $1')
    .replace(/[_-]/g, ' ')
    .trim()
    .split(' ')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(' ');
}
