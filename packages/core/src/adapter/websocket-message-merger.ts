import type { WebSocketConfig, WebSocketMergeMode } from '../ir/types.js';

/**
 * Merges incoming WebSocket payloads into cached REST query data.
 */
export class WebSocketMessageMerger {
  static merge(
    current: unknown,
    incoming: unknown,
    config: Pick<WebSocketConfig, 'mode' | 'appendField'>
  ): unknown {
    switch (config.mode as WebSocketMergeMode) {
      case 'replace':
        return incoming;
      case 'append':
        return WebSocketMessageMerger.append(current, incoming, config.appendField);
      default:
        return incoming;
    }
  }

  static append(current: unknown, incoming: unknown, appendField?: string): unknown {
    if (!appendField || appendField.trim() === '') {
      return incoming;
    }

    const items = WebSocketMessageMerger.coerceItems(incoming);
    if (items.length === 0) {
      return current;
    }

    if (current === null || current === undefined) {
      return WebSocketMessageMerger.setAtPath({}, appendField, items);
    }

    if (typeof current !== 'object') {
      return WebSocketMessageMerger.setAtPath({}, appendField, items);
    }

    const base = Array.isArray(current)
      ? { items: [...current] }
      : { ...(current as Record<string, unknown>) };

    const existing = WebSocketMessageMerger.getAtPath(base, appendField);
    const merged = Array.isArray(existing) ? [...existing, ...items] : items;
    return WebSocketMessageMerger.setAtPath(base, appendField, merged);
  }

  static coerceItems(incoming: unknown): unknown[] {
    if (Array.isArray(incoming)) {
      return incoming;
    }
    if (incoming !== null && incoming !== undefined) {
      return [incoming];
    }
    return [];
  }

  static getAtPath(obj: Record<string, unknown>, dotPath: string): unknown {
    const parts = dotPath.split('.').filter(Boolean);
    let cursor: unknown = obj;

    for (const part of parts) {
      if (cursor === null || cursor === undefined || typeof cursor !== 'object') {
        return undefined;
      }
      cursor = (cursor as Record<string, unknown>)[part];
    }

    return cursor;
  }

  static setAtPath(
    obj: Record<string, unknown>,
    dotPath: string,
    value: unknown
  ): Record<string, unknown> {
    const parts = dotPath.split('.').filter(Boolean);
    if (parts.length === 0) {
      return obj;
    }

    const root = { ...obj };
    let cursor: Record<string, unknown> = root;

    for (let i = 0; i < parts.length - 1; i++) {
      const part = parts[i];
      const next = cursor[part];
      const branch =
        next !== null && typeof next === 'object' && !Array.isArray(next)
          ? { ...(next as Record<string, unknown>) }
          : {};
      cursor[part] = branch;
      cursor = branch;
    }

    cursor[parts[parts.length - 1]] = value;
    return root;
  }
}
