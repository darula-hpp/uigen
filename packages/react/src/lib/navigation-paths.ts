import type { Resource } from '@uigen-dev/core';

export function resolveDashboardPath(landingPageEnabled: boolean): string {
  return landingPageEnabled ? '/dashboard' : '/';
}

export function resourceHasIndexView(resource: Resource): boolean {
  return resource.operations.some(
    (operation) => operation.viewHint === 'list' || operation.viewHint === 'search',
  );
}

export function resolveFormDismissPath(
  resource: Resource,
  dashboardPath: string,
): string {
  if (resourceHasIndexView(resource)) {
    return `/${resource.slug}`;
  }

  return dashboardPath;
}

export function resolveCreateFormOperation(resource: Resource, operationId?: string | null) {
  if (operationId) {
    return resource.operations.find((operation) => operation.id === operationId);
  }

  return (
    resource.operations.find((operation) => operation.viewHint === 'create')
    ?? resource.operations.find((operation) => operation.viewHint === 'action')
  );
}
