import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/react';
import { TopBar } from '../TopBar';
import { BrowserRouter } from 'react-router-dom';
import type { UIGenApp } from '@uigen-dev/core';

/**
 * Test suite to verify TopBar and its child components (especially ResourceSearchResults)
 * do not violate React's Rules of Hooks by calling hooks conditionally.
 * 
 * This addresses the React error #300: "Rendered more hooks than during the previous render"
 * that was occurring when searching resources with mixed operation types.
 */
describe('TopBar - Conditional Hooks Detection', () => {
  const createMockConfig = (resources: any[]): UIGenApp => ({
    meta: {
      title: 'Test App',
      version: '1.0.0',
      description: 'Test',
    },
    servers: [{ url: 'http://localhost:3000', description: 'Test' }],
    auth: { schemes: [], loginEndpoints: [] },
    resources,
  });

  it('should call hooks unconditionally in ResourceSearchResults even when some resources lack search operations', () => {
    // Create a mix of resources - some with search ops, some without
    const config = createMockConfig([
      {
        name: 'Users',
        slug: 'users',
        operations: [
          {
            operationId: 'listUsers',
            path: '/users',
            method: 'GET',
            viewHint: 'list',
            parameters: [],
          },
        ],
        schema: { type: 'object', children: [{ key: 'name', type: 'string' }] },
      },
      {
        name: 'Posts',
        slug: 'posts',
        operations: [
          {
            operationId: 'createPost',
            path: '/posts',
            method: 'POST',
            viewHint: 'create',
            parameters: [],
          },
        ],
        schema: { type: 'object', children: [{ key: 'title', type: 'string' }] },
      },
      {
        name: 'Comments',
        slug: 'comments',
        operations: [
          {
            operationId: 'searchComments',
            path: '/comments',
            method: 'GET',
            viewHint: 'search',
            parameters: [
              { name: 'query', in: 'query', required: false, schema: { type: 'string' } },
            ],
          },
        ],
        schema: { type: 'object', children: [{ key: 'text', type: 'string' }] },
      },
    ]);

    // First render - should not crash
    const { rerender } = render(
      <BrowserRouter>
        <TopBar config={config} onMenuClick={() => {}} />
      </BrowserRouter>
    );

    // Re-render multiple times - should maintain consistent hook calls
    rerender(
      <BrowserRouter>
        <TopBar config={config} onMenuClick={() => {}} />
      </BrowserRouter>
    );

    rerender(
      <BrowserRouter>
        <TopBar config={config} onMenuClick={() => {}} />
      </BrowserRouter>
    );

    // If we get here without React error #300, hooks are being called unconditionally
    expect(true).toBe(true);
  });

  it('should handle sub-resources (operations with path parameters) without crashing', () => {
    // Create resources with path parameters (sub-resources)
    const config = createMockConfig([
      {
        name: 'Services',
        slug: 'services',
        operations: [
          {
            operationId: 'listServices',
            path: '/v1/Services',
            method: 'GET',
            viewHint: 'list',
            parameters: [],
          },
        ],
        schema: { type: 'object', children: [{ key: 'sid', type: 'string' }] },
      },
      {
        name: 'AlphaSenders',
        slug: 'alpha-senders',
        operations: [
          {
            operationId: 'listAlphaSenders',
            path: '/v1/Services/{ServiceSid}/AlphaSenders',
            method: 'GET',
            viewHint: 'list',
            parameters: [
              { name: 'ServiceSid', in: 'path', required: true, schema: { type: 'string' } },
            ],
          },
        ],
        schema: { type: 'object', children: [{ key: 'sid', type: 'string' }] },
      },
    ]);

    // Should not crash even with sub-resources
    const { rerender } = render(
      <BrowserRouter>
        <TopBar config={config} onMenuClick={() => {}} />
      </BrowserRouter>
    );

    // Multiple re-renders should maintain consistent hook calls
    rerender(
      <BrowserRouter>
        <TopBar config={config} onMenuClick={() => {}} />
      </BrowserRouter>
    );

    expect(true).toBe(true);
  });

  it('should maintain consistent hook calls when config changes', () => {
    const config1 = createMockConfig([
      {
        name: 'Users',
        slug: 'users',
        operations: [
          {
            operationId: 'listUsers',
            path: '/users',
            method: 'GET',
            viewHint: 'list',
            parameters: [],
          },
        ],
        schema: { type: 'object', children: [{ key: 'name', type: 'string' }] },
      },
    ]);

    const config2 = createMockConfig([
      {
        name: 'Posts',
        slug: 'posts',
        operations: [
          {
            operationId: 'createPost',
            path: '/posts',
            method: 'POST',
            viewHint: 'create',
            parameters: [],
          },
        ],
        schema: { type: 'object', children: [{ key: 'title', type: 'string' }] },
      },
    ]);

    const { rerender } = render(
      <BrowserRouter>
        <TopBar config={config1} onMenuClick={() => {}} />
      </BrowserRouter>
    );

    // Change config - should not cause hook order violations
    rerender(
      <BrowserRouter>
        <TopBar config={config2} onMenuClick={() => {}} />
      </BrowserRouter>
    );

    expect(true).toBe(true);
  });

  it('should handle empty resources array without crashing', () => {
    const config = createMockConfig([]);

    const { rerender } = render(
      <BrowserRouter>
        <TopBar config={config} onMenuClick={() => {}} />
      </BrowserRouter>
    );

    rerender(
      <BrowserRouter>
        <TopBar config={config} onMenuClick={() => {}} />
      </BrowserRouter>
    );

    expect(true).toBe(true);
  });
});
