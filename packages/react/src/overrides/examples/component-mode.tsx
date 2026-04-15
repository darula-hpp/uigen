/**
 * Component Mode Example: Custom Login/Auth View
 *
 * Use component mode when you need full ownership of a view —
 * including data fetching, state management, and routing.
 *
 * This example replaces the auto-generated user list with a
 * custom card-based layout that fetches its own data.
 */

import { overrideRegistry } from '../index';
import type { OverrideComponentProps } from '../types';

// Example: Custom user list with card layout
function CustomUserList({ resource }: OverrideComponentProps) {
  // Component mode: you own data fetching
  // (In a real app, use useQuery or your preferred data fetching library)
  const users = [
    { id: '1', name: 'Alice', role: 'Admin' },
    { id: '2', name: 'Bob', role: 'Editor' },
  ];

  return (
    <div style={{ padding: '24px' }}>
      <h1 style={{ fontSize: '24px', fontWeight: 'bold', marginBottom: '16px' }}>
        {resource.name}
      </h1>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '16px' }}>
        {users.map((user) => (
          <div
            key={user.id}
            style={{
              padding: '16px',
              border: '1px solid #e2e8f0',
              borderRadius: '8px',
              background: '#fff',
            }}
          >
            <div style={{ fontWeight: '600' }}>{user.name}</div>
            <div style={{ color: '#64748b', fontSize: '14px' }}>{user.role}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

// Register the override — call this before your app renders
overrideRegistry.register({
  targetId: 'users.list',
  component: CustomUserList,
});
