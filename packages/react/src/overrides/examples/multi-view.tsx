/**
 * Multi-View Example: Different overrides per view for the same resource
 *
 * You can mix and match override modes across different views of the
 * same resource. Each view is targeted independently.
 */

import { useEffect } from 'react';
import { overrideRegistry } from '../index';
import type { OverrideComponentProps, ListRenderProps } from '../types';

// List view: render mode — custom card layout, UIGen fetches data
overrideRegistry.register({
  targetId: 'products.list',
  render: (({ data, isLoading }: ListRenderProps) => {
    if (isLoading) return <div>Loading products...</div>;

    const products = (data as any[]) ?? [];

    return (
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '16px', padding: '24px' }}>
        {products.map((p: any) => (
          <div key={p.id} style={{ border: '1px solid #e2e8f0', borderRadius: '8px', padding: '16px' }}>
            <div style={{ fontWeight: '600' }}>{p.name}</div>
            <div style={{ color: '#64748b' }}>${p.price}</div>
          </div>
        ))}
      </div>
    );
  }) as any,
});

// Create view: component mode — custom multi-step form
function CustomProductCreate({ resource }: OverrideComponentProps) {
  return (
    <div style={{ padding: '24px', maxWidth: '480px' }}>
      <h1>Create {resource.name}</h1>
      <p style={{ color: '#64748b' }}>Custom multi-step product creation form</p>
      {/* Your custom form implementation */}
    </div>
  );
}

overrideRegistry.register({
  targetId: 'products.create',
  component: CustomProductCreate,
});

// Detail view: useHooks mode — analytics only, built-in view renders normally
overrideRegistry.register({
  targetId: 'products.detail',
  useHooks: ({ resource }) => {
    useEffect(() => {
      console.log('[Analytics] Viewed product detail:', resource.uigenId);
    }, [resource.uigenId]);
  },
});

// Edit view: no override — built-in edit form renders as normal
// (No registration needed — UIGen handles it automatically)
