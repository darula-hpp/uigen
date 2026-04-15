/**
 * Render Mode Example: Custom Table Layout
 *
 * Use render mode when UIGen should handle data fetching but you
 * want to control how the data is displayed.
 *
 * Your render function receives the fetched data, loading state,
 * error state, and view-specific extras (like pagination).
 */

import { overrideRegistry } from '../index';
import type { ListRenderProps, DetailRenderProps } from '../types';

// Example 1: Custom card grid for list view
overrideRegistry.register({
  targetId: 'users.list',
  // Cast needed because render props are view-specific subtypes
  render: (({ resource, data, isLoading, error, pagination }: ListRenderProps) => {
    if (isLoading) {
      return (
        <div style={{ padding: '24px', textAlign: 'center', color: '#64748b' }}>
          Loading {resource.name}...
        </div>
      );
    }

    if (error) {
      return (
        <div style={{ padding: '24px', color: '#ef4444' }}>
          Error: {error.message}
        </div>
      );
    }

    const items = (data as any[]) ?? [];

    return (
      <div style={{ padding: '24px' }}>
        <h1 style={{ fontSize: '24px', fontWeight: 'bold', marginBottom: '16px' }}>
          {resource.name}
        </h1>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '12px' }}>
          {items.map((item: any, idx: number) => (
            <div
              key={item.id ?? idx}
              style={{ padding: '16px', border: '1px solid #e2e8f0', borderRadius: '8px', background: '#f8fafc' }}
            >
              {Object.entries(item).slice(0, 3).map(([key, value]) => (
                <div key={key} style={{ marginBottom: '4px' }}>
                  <span style={{ fontWeight: '500', fontSize: '12px', color: '#64748b' }}>{key}: </span>
                  <span style={{ fontSize: '14px' }}>{String(value)}</span>
                </div>
              ))}
            </div>
          ))}
        </div>

        <div style={{ marginTop: '16px', display: 'flex', gap: '8px', alignItems: 'center' }}>
          <button
            onClick={pagination.previousPage}
            disabled={pagination.currentPage === 0}
            style={{ padding: '6px 12px', border: '1px solid #e2e8f0', borderRadius: '4px' }}
          >
            Previous
          </button>
          <span style={{ color: '#64748b', fontSize: '14px' }}>Page {pagination.currentPage + 1}</span>
          <button
            onClick={pagination.nextPage}
            style={{ padding: '6px 12px', border: '1px solid #e2e8f0', borderRadius: '4px' }}
          >
            Next
          </button>
        </div>
      </div>
    );
  }) as any,
});

// Example 2: Custom detail view with a two-column layout
overrideRegistry.register({
  targetId: 'users.detail',
  render: (({ resource, data, isLoading }: DetailRenderProps) => {
    if (isLoading) return <div>Loading...</div>;

    const record = data as Record<string, unknown> | undefined;

    return (
      <div style={{ padding: '24px', maxWidth: '600px' }}>
        <h1 style={{ fontSize: '20px', fontWeight: 'bold', marginBottom: '24px' }}>
          {resource.name} Details
        </h1>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
          {record &&
            Object.entries(record).map(([key, value]) => (
              <div key={key}>
                <div style={{ fontSize: '12px', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  {key}
                </div>
                <div style={{ fontWeight: '500', marginTop: '4px' }}>{String(value ?? '—')}</div>
              </div>
            ))}
        </div>
      </div>
    );
  }) as any,
});
