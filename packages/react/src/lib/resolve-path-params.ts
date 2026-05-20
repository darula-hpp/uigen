import type { Operation } from '@uigen-dev/core';

/**
 * Maps a resource identifier from the route to the operation's path parameter name.
 * Uses the last path segment parameter, which is typically the resource id for detail actions.
 */
export function resolvePathParams(
  operation: Operation,
  id: string | undefined
): Record<string, string> {
  if (!id) return {};

  const matches = operation.path.match(/\{([^}]+)\}/g);
  if (!matches || matches.length === 0) {
    return { id };
  }

  const paramName = matches[matches.length - 1].slice(1, -1);
  return { [paramName]: id };
}
