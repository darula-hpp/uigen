import type { ConfigFile } from '@uigen-dev/core';

/**
 * Build a Map of element paths to their x-uigen-ignore boolean values
 * from the config annotations.
 */
export function buildAnnotationsMap(config: ConfigFile | null): Map<string, boolean> {
  const map = new Map<string, boolean>();
  if (!config?.annotations) return map;
  for (const [path, annots] of Object.entries(config.annotations)) {
    const val = (annots as Record<string, unknown>)['x-uigen-ignore'];
    if (typeof val === 'boolean') map.set(path, val);
  }
  return map;
}

/**
 * Build an updated ConfigFile with a single annotation value changed.
 * Passing undefined as value removes the annotation key.
 */
export function buildUpdatedAnnotations(
  config: ConfigFile | null,
  elementPath: string,
  annotationName: string,
  value: unknown
): ConfigFile {
  const base: ConfigFile = config ?? {
    version: '1.0',
    enabled: {},
    defaults: {},
    annotations: {}
  };

  const existing: Record<string, unknown> = {
    ...((base.annotations[elementPath] as Record<string, unknown>) ?? {})
  };

  if (value === undefined) {
    delete existing[annotationName];
  } else {
    existing[annotationName] = value;
  }

  const updatedAnnotations = { ...base.annotations };
  if (Object.keys(existing).length === 0) {
    delete updatedAnnotations[elementPath];
  } else {
    updatedAnnotations[elementPath] = existing;
  }

  return {
    ...base,
    annotations: updatedAnnotations
  };
}
