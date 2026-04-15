import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { userEvent } from '@testing-library/user-event';
import { TopBar } from '../TopBar';
import { BrowserRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { UIGenApp } from '@uigen-dev/core';

/**
 * Test suite to verify search results don't flicker or show stale data
 * when the search query changes.
 * 
 * Expected behavior:
 * 1. When user types a new search term, old results should not be visible
 * 2. Loading state should be shown immediately when query changes
 * 3. Results should only appear after the new query completes
 * 4. No "flash" of old results before new results appear
 */
describe('TopBar - Search Results Flicker Prevention', () => {
  let queryClient: QueryClient;
  let fetchMock: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: {
        queries: {
          retry: false,
          gcTime: 0,
          staleTime: 0,
        },
      },
    });

    // Mock fetch
    fetchMock = vi.fn();
    global.fetch = fetchMock;
  });

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

  it('should not show stale results when search query changes', async () => {
    const user = userEvent.setup();
    
    const config = createMockConfig([
      {
        name: 'Users',
        slug: 'users',
        operations: [
          {
            id: 'listUsers',
            operationId: 'listUsers',
            path: '/users',
            method: 'GET',
            viewHint: 'list',
            parameters: [
              { name: 'name', in: 'query', required: false, schema: { type: 'string' } },
            ],
          },
        ],
        schema: { type: 'object', children: [{ key: 'name', type: 'string' }] },
      },
    ]);

    // First query returns "Alice"
    fetchMock.mockResolvedValueOnce({
      ok: true,
      json: async () => [{ id: '1', name: 'Alice' }],
    });

    const { rerender } = render(
      <QueryClientProvider client={queryClient}>
        <BrowserRouter>
          <TopBar config={config} onMenuClick={() => {}} />
        </BrowserRouter>
      </QueryClientProvider>
    );

    // Type "ali" in search
    const searchInput = screen.getByPlaceholderText('Search across all resources...');
    await user.type(searchInput, 'ali');

    // Wait for debounce and results
    await waitFor(() => {
      expect(screen.getByText('Alice')).toBeInTheDocument();
    }, { timeout: 1000 });

    // Now change search to "bob" - should return different results
    fetchMock.mockResolvedValueOnce({
      ok: true,
      json: async () => [{ id: '2', name: 'Bob' }],
    });

    await user.clear(searchInput);
    await user.type(searchInput, 'bob');

    // CRITICAL: During the transition, "Alice" should NOT be visible
    // We should see either "Loading..." or nothing, but never stale "Alice" results
    await waitFor(() => {
      const aliceElements = screen.queryAllByText('Alice');
      const loadingElements = screen.queryAllByText('Loading...');
      
      // Either we're loading OR Alice is gone, but Alice should never show with "bob" query
      if (aliceElements.length > 0) {
        // If Alice is still visible, we must be showing loading state
        expect(loadingElements.length).toBeGreaterThan(0);
      }
    }, { timeout: 500 });

    // Eventually Bob should appear
    await waitFor(() => {
      expect(screen.getByText('Bob')).toBeInTheDocument();
      expect(screen.queryByText('Alice')).not.toBeInTheDocument();
    }, { timeout: 1000 });
  });

  it('should show loading state immediately when query changes', async () => {
    const user = userEvent.setup();
    
    const config = createMockConfig([
      {
        name: 'Products',
        slug: 'products',
        operations: [
          {
            id: 'listProducts',
            operationId: 'listProducts',
            path: '/products',
            method: 'GET',
            viewHint: 'list',
            parameters: [
              { name: 'name', in: 'query', required: false, schema: { type: 'string' } },
            ],
          },
        ],
        schema: { type: 'object', children: [{ key: 'name', type: 'string' }] },
      },
    ]);

    // First query
    fetchMock.mockResolvedValueOnce({
      ok: true,
      json: async () => [{ id: '1', name: 'Product A' }],
    });

    render(
      <QueryClientProvider client={queryClient}>
        <BrowserRouter>
          <TopBar config={config} onMenuClick={() => {}} />
        </BrowserRouter>
      </QueryClientProvider>
    );

    const searchInput = screen.getByPlaceholderText('Search across all resources...');
    await user.type(searchInput, 'prod');

    // Wait for first results
    await waitFor(() => {
      expect(screen.getByText('Product A')).toBeInTheDocument();
    }, { timeout: 1000 });

    // Second query - slow response
    fetchMock.mockImplementationOnce(() => 
      new Promise(resolve => 
        setTimeout(() => resolve({
          ok: true,
          json: async () => [{ id: '2', name: 'Product B' }],
        }), 500)
      )
    );

    // Change query
    await user.clear(searchInput);
    await user.type(searchInput, 'product b');

    // Should show loading state quickly (within debounce + small buffer)
    await waitFor(() => {
      expect(screen.getByText('Loading...')).toBeInTheDocument();
    }, { timeout: 500 });
  });

  it('should handle rapid query changes without showing stale data', async () => {
    const user = userEvent.setup();
    
    const config = createMockConfig([
      {
        name: 'Items',
        slug: 'items',
        operations: [
          {
            id: 'listItems',
            operationId: 'listItems',
            path: '/items',
            method: 'GET',
            viewHint: 'list',
            parameters: [
              { name: 'query', in: 'query', required: false, schema: { type: 'string' } },
            ],
          },
        ],
        schema: { type: 'object', children: [{ key: 'name', type: 'string' }] },
      },
    ]);

    // Mock responses for rapid queries
    fetchMock
      .mockResolvedValueOnce({
        ok: true,
        json: async () => [{ id: '1', name: 'Item 1' }],
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => [{ id: '2', name: 'Item 2' }],
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => [{ id: '3', name: 'Item 3' }],
      });

    render(
      <QueryClientProvider client={queryClient}>
        <BrowserRouter>
          <TopBar config={config} onMenuClick={() => {}} />
        </BrowserRouter>
      </QueryClientProvider>
    );

    const searchInput = screen.getByPlaceholderText('Search across all resources...');
    
    // Type "a" and wait for results
    await user.type(searchInput, 'a');
    await waitFor(() => {
      expect(screen.getByText('Item 1')).toBeInTheDocument();
    }, { timeout: 1000 });

    // Clear and type "ab"
    await user.clear(searchInput);
    await user.type(searchInput, 'ab');
    await waitFor(() => {
      expect(screen.getByText('Item 2')).toBeInTheDocument();
      expect(screen.queryByText('Item 1')).not.toBeInTheDocument();
    }, { timeout: 1000 });

    // Clear and type "abc"
    await user.clear(searchInput);
    await user.type(searchInput, 'abc');
    await waitFor(() => {
      expect(screen.getByText('Item 3')).toBeInTheDocument();
      expect(screen.queryByText('Item 1')).not.toBeInTheDocument();
      expect(screen.queryByText('Item 2')).not.toBeInTheDocument();
    }, { timeout: 1000 });
  });

  it('should clear results immediately when search is cleared', async () => {
    const user = userEvent.setup();
    
    const config = createMockConfig([
      {
        name: 'Users',
        slug: 'users',
        operations: [
          {
            id: 'listUsers',
            operationId: 'listUsers',
            path: '/users',
            method: 'GET',
            viewHint: 'list',
            parameters: [
              { name: 'name', in: 'query', required: false, schema: { type: 'string' } },
            ],
          },
        ],
        schema: { type: 'object', children: [{ key: 'name', type: 'string' }] },
      },
    ]);

    fetchMock.mockResolvedValueOnce({
      ok: true,
      json: async () => [{ id: '1', name: 'Alice' }],
    });

    render(
      <QueryClientProvider client={queryClient}>
        <BrowserRouter>
          <TopBar config={config} onMenuClick={() => {}} />
        </BrowserRouter>
      </QueryClientProvider>
    );

    const searchInput = screen.getByPlaceholderText('Search across all resources...');
    await user.type(searchInput, 'ali');

    // Wait for results
    await waitFor(() => {
      expect(screen.getByText('Alice')).toBeInTheDocument();
    }, { timeout: 1000 });

    // Clear search
    const clearButton = screen.getByRole('button', { name: '' }); // X button
    await user.click(clearButton);

    // Results should disappear immediately
    expect(screen.queryByText('Alice')).not.toBeInTheDocument();
  });
});
