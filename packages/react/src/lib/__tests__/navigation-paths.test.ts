import { describe, it, expect } from 'vitest';
import type { Resource } from '@uigen-dev/core';
import {
  resolveCreateFormOperation,
  resolveDashboardPath,
  resolveFormDismissPath,
  resourceHasIndexView,
} from '../navigation-paths';

const listResource: Resource = {
  name: 'Sensors',
  slug: 'sensors',
  schema: { type: 'object', key: 'Sensor', label: 'Sensor', required: false },
  operations: [
    {
      id: 'list_sensors',
      method: 'GET',
      path: '/api/v1/sensors',
      viewHint: 'list',
      parameters: [],
      responses: {},
    },
  ],
  relationships: [],
};

const actionResource: Resource = {
  name: 'Blink Built-in LED',
  slug: 'api-v1-actions-blink',
  schema: { type: 'object', key: 'BlinkRequest', label: 'Blink Request', required: false },
  operations: [
    {
      id: 'blink_led',
      method: 'POST',
      path: '/api/v1/actions/blink',
      viewHint: 'action',
      parameters: [],
      responses: {},
    },
  ],
  relationships: [],
};

describe('navigation-paths', () => {
  it('resolves dashboard path based on landing page config', () => {
    expect(resolveDashboardPath(false)).toBe('/');
    expect(resolveDashboardPath(true)).toBe('/dashboard');
  });

  it('detects resources with index views', () => {
    expect(resourceHasIndexView(listResource)).toBe(true);
    expect(resourceHasIndexView(actionResource)).toBe(false);
  });

  it('returns resource index for dismiss when a list view exists', () => {
    expect(resolveFormDismissPath(listResource, '/')).toBe('/sensors');
  });

  it('returns dashboard path for action-only resources', () => {
    expect(resolveFormDismissPath(actionResource, '/')).toBe('/');
    expect(resolveFormDismissPath(actionResource, '/dashboard')).toBe('/dashboard');
  });

  it('resolves create form operations for create and action resources', () => {
    expect(resolveCreateFormOperation(listResource)?.id).toBe(undefined);
    expect(resolveCreateFormOperation(actionResource)?.id).toBe('blink_led');
    expect(resolveCreateFormOperation(actionResource, 'blink_led')?.id).toBe('blink_led');
  });
});
