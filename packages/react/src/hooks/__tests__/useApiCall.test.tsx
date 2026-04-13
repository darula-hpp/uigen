import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useApiCall, useApiMutation } from '../useApiCall';
import type { Operation } from '@uigen-dev/core';
import { ReactNode } from 'react';

describe('useApiCall', () => {
  let queryClient: QueryClient;

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
        mutations: { retry: false }
      }
    });
    vi.clearAllMocks();
  });

  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={queryClient}>
      {children}
    </QueryClientProvider>
  );

  const mockOperation: Operation = {
    id: 'listUsers',
    method: 'GET',
    path: '/users',
    summary: 'List users',
    parameters: [],
    responses: {},
    viewHint: 'list'
  };

  describe('Query Functionality', () => {
    it('should fetch data successfully', async () => {
      const mockData = [{ id: 1, name: 'John' }, { id: 2, name: 'Jane' }];
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => mockData
      });

      const { result } = renderHook(
        () => useApiCall({ operation: mockOperation }),
        { wrapper }
      );

      await waitFor(() => expect(result.current.isSuccess).toBe(true));

      expect(result.current.data).toEqual(mockData);
      expect(global.fetch).toHaveBeenCalledWith(
        '/api/users',
        expect.objectContaining({
          method: 'GET',
          headers: { 'Content-Type': 'application/json' }
        })
      );
    });

    it('should handle path parameters', async () => {
      const operation: Operation = {
        ...mockOperation,
        path: '/users/{id}'
      };

      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ id: 123, name: 'John' })
      });

      const { result } = renderHook(
        () => useApiCall({ operation, pathParams: { id: '123' } }),
        { wrapper }
      );

      await waitFor(() => expect(result.current.isSuccess).toBe(true));

      expect(global.fetch).toHaveBeenCalledWith(
        '/api/users/123',
        expect.any(Object)
      );
    });

    it('should handle query parameters', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => []
      });

      const { result } = renderHook(
        () => useApiCall({
          operation: mockOperation,
          queryParams: { page: '1', limit: '10' }
        }),
        { wrapper }
      );

      await waitFor(() => expect(result.current.isSuccess).toBe(true));

      expect(global.fetch).toHaveBeenCalledWith(
        '/api/users?page=1&limit=10',
        expect.any(Object)
      );
    });

    it('should handle API errors', async () => {
      global.fetch = vi.fn().mockRejectedValue(new Error('Network error'));

      const { result } = renderHook(
        () => useApiCall({ operation: mockOperation }),
        { wrapper }
      );

      await waitFor(() => expect(result.current.isError).toBe(true));

      expect(result.current.error).toBeDefined();
    });
  });

  describe('Retry Logic (Requirement 45)', () => {
    it('should retry on network errors up to 3 times', async () => {
      let callCount = 0;
      global.fetch = vi.fn().mockImplementation(() => {
        callCount++;
        if (callCount <= 3) {
          return Promise.reject(new Error('Network error'));
        }
        return Promise.resolve({
          ok: true,
          json: async () => ({ success: true })
        });
      });

      const { result } = renderHook(
        () => useApiCall({ operation: mockOperation }),
        { wrapper: ({ children }: { children: ReactNode }) => (
          <QueryClientProvider client={new QueryClient({
            defaultOptions: {
              queries: {
                retry: (failureCount, error) => {
                  if ((error as any)?.status >= 400 && (error as any)?.status < 500) {
                    return false;
                  }
                  return failureCount < 3;
                },
                retryDelay: 10 // Fast retries for testing
              }
            }
          })}>
            {children}
          </QueryClientProvider>
        )}
      );

      await waitFor(() => expect(result.current.isSuccess).toBe(true), { timeout: 10000 });

      expect(callCount).toBe(4); // Initial + 3 retries
    }, 15000);

    it('should not retry on 4xx errors', async () => {
      let callCount = 0;
      global.fetch = vi.fn().mockImplementation(() => {
        callCount++;
        const error = new Error('Bad Request') as Error & { status?: number };
        error.status = 400;
        return Promise.reject(error);
      });

      const { result } = renderHook(
        () => useApiCall({ operation: mockOperation }),
        { wrapper: ({ children }: { children: ReactNode }) => (
          <QueryClientProvider client={new QueryClient({
            defaultOptions: {
              queries: {
                retry: (failureCount, error) => {
                  if ((error as any)?.status >= 400 && (error as any)?.status < 500) {
                    return false;
                  }
                  return failureCount < 3;
                }
              }
            }
          })}>
            {children}
          </QueryClientProvider>
        )}
      );

      await waitFor(() => expect(result.current.isError).toBe(true));

      expect(callCount).toBe(1); // No retries for 4xx
    });

    it('should retry on 5xx errors', async () => {
      let callCount = 0;
      global.fetch = vi.fn().mockImplementation(() => {
        callCount++;
        if (callCount <= 2) {
          const error = new Error('Server Error') as Error & { status?: number };
          error.status = 500;
          return Promise.reject(error);
        }
        return Promise.resolve({
          ok: true,
          json: async () => ({ success: true })
        });
      });

      const { result } = renderHook(
        () => useApiCall({ operation: mockOperation }),
        { wrapper: ({ children }: { children: ReactNode }) => (
          <QueryClientProvider client={new QueryClient({
            defaultOptions: {
              queries: {
                retry: (failureCount, error) => {
                  if ((error as any)?.status >= 400 && (error as any)?.status < 500) {
                    return false;
                  }
                  return failureCount < 3;
                },
                retryDelay: 0
              }
            }
          })}>
            {children}
          </QueryClientProvider>
        )}
      );

      await waitFor(() => expect(result.current.isSuccess).toBe(true), { timeout: 5000 });

      expect(callCount).toBe(3); // Initial + 2 retries
    });
  });

  describe('Caching (Requirement 44)', () => {
    it('should cache responses for 5 minutes', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => [{ id: 1 }]
      });

      const { result, rerender } = renderHook(
        () => useApiCall({ operation: mockOperation }),
        { wrapper }
      );

      await waitFor(() => expect(result.current.isSuccess).toBe(true));

      // First call should fetch
      expect(global.fetch).toHaveBeenCalledTimes(1);

      // Rerender should use cache (not fetch again)
      rerender();
      expect(global.fetch).toHaveBeenCalledTimes(1);
    });
  });
});

describe('useApiMutation', () => {
  let queryClient: QueryClient;

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
        mutations: { retry: false }
      }
    });
    vi.clearAllMocks();
  });

  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={queryClient}>
      {children}
    </QueryClientProvider>
  );

  const mockOperation: Operation = {
    id: 'createUser',
    method: 'POST',
    path: '/users',
    summary: 'Create user',
    parameters: [],
    responses: {},
    viewHint: 'create'
  };

  describe('Mutation Functionality', () => {
    it('should execute mutation successfully', async () => {
      const mockResponse = { id: 1, name: 'John' };
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => mockResponse
      });

      const { result } = renderHook(
        () => useApiMutation(mockOperation),
        { wrapper }
      );

      result.current.mutate({ body: { name: 'John' } });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));

      expect(result.current.data).toEqual(mockResponse);
      expect(global.fetch).toHaveBeenCalledWith(
        '/api/users',
        expect.objectContaining({
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name: 'John' })
        })
      );
    });

    it('should handle path parameters', async () => {
      const operation: Operation = {
        ...mockOperation,
        method: 'PUT',
        path: '/users/{id}'
      };

      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ success: true })
      });

      const { result } = renderHook(
        () => useApiMutation(operation),
        { wrapper }
      );

      result.current.mutate({
        pathParams: { id: '123' },
        body: { name: 'Updated' }
      });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));

      expect(global.fetch).toHaveBeenCalledWith(
        '/api/users/123',
        expect.any(Object)
      );
    });

    it('should handle mutation errors', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 400,
        statusText: 'Bad Request'
      });

      const { result } = renderHook(
        () => useApiMutation(mockOperation),
        { wrapper }
      );

      result.current.mutate({ body: { name: 'John' } });

      await waitFor(() => expect(result.current.isError).toBe(true));

      expect(result.current.error).toBeDefined();
    });
  });

  describe('Cache Invalidation (Requirement 44.5)', () => {
    it('should invalidate cache on successful mutation', async () => {
      global.fetch = vi.fn()
        .mockResolvedValueOnce({
          ok: true,
          json: async () => [{ id: 1 }]
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ id: 2, name: 'New' })
        });

      const queryOperation: Operation = {
        id: 'listUsers',
        method: 'GET',
        path: '/users',
        summary: 'List users',
        parameters: [],
        responses: {},
        viewHint: 'list'
      };

      // First, populate cache with query
      const { result: queryResult } = renderHook(
        () => useApiCall({ operation: queryOperation }),
        { wrapper }
      );

      await waitFor(() => expect(queryResult.current.isSuccess).toBe(true));

      // Execute mutation
      const { result: mutationResult } = renderHook(
        () => useApiMutation(mockOperation),
        { wrapper }
      );

      mutationResult.current.mutate({ body: { name: 'New' } });

      await waitFor(() => expect(mutationResult.current.isSuccess).toBe(true));

      // Cache should be invalidated (check using predicate since we invalidate by resource name)
      const allQueries = queryClient.getQueryCache().getAll();
      const invalidatedQuery = allQueries.find(q => q.queryKey[0] === 'listUsers');
      expect(invalidatedQuery?.state.isInvalidated).toBe(true);
    });

    it('should invalidate related queries', async () => {
      global.fetch = vi.fn()
        .mockResolvedValueOnce({
          ok: true,
          json: async () => [{ id: 1 }]
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ success: true })
        });

      const relatedOperation: Operation = {
        id: 'relatedQuery',
        method: 'GET',
        path: '/related',
        summary: 'Related query',
        parameters: [],
        responses: {},
        viewHint: 'list'
      };

      // Populate cache
      const { result: queryResult } = renderHook(
        () => useApiCall({ operation: relatedOperation }),
        { wrapper }
      );

      await waitFor(() => expect(queryResult.current.isSuccess).toBe(true));

      // Execute mutation with related query keys
      const { result: mutationResult } = renderHook(
        () => useApiMutation(mockOperation, { relatedQueryKeys: ['relatedQuery'] }),
        { wrapper }
      );

      mutationResult.current.mutate({ body: { name: 'New' } });

      await waitFor(() => expect(mutationResult.current.isSuccess).toBe(true));

      // Related query should be invalidated
      const queryState = queryClient.getQueryState(['relatedQuery', {}, {}]);
      expect(queryState?.isInvalidated).toBe(true);
    });
  });

  describe('Optimistic Updates (Requirement 47)', () => {
    it('should apply optimistic update immediately', async () => {
      const initialData = [{ id: 1, name: 'John' }];
      
      global.fetch = vi.fn()
        .mockResolvedValueOnce({
          ok: true,
          json: async () => initialData
        })
        .mockImplementation(() => new Promise(resolve => {
          // Delay the mutation response so we can check optimistic update
          setTimeout(() => {
            resolve({
              ok: true,
              json: async () => ({ id: 2, name: 'Jane' })
            });
          }, 100);
        }));

      const queryOperation: Operation = {
        id: 'listUsers',
        method: 'GET',
        path: '/users',
        summary: 'List users',
        parameters: [],
        responses: {},
        viewHint: 'list'
      };

      // Populate cache
      const { result: queryResult } = renderHook(
        () => useApiCall({ operation: queryOperation }),
        { wrapper }
      );

      await waitFor(() => expect(queryResult.current.isSuccess).toBe(true));

      // Execute mutation with optimistic update
      const { result: mutationResult } = renderHook(
        () => useApiMutation(mockOperation, {
          optimisticUpdate: (oldData: any[], variables: any) => [
            ...oldData,
            { id: 2, name: variables.body.name }
          ]
        }),
        { wrapper }
      );

      mutationResult.current.mutate({ body: { name: 'Jane' } });

      // Wait a bit for optimistic update to be applied
      await new Promise(resolve => setTimeout(resolve, 50));

      // Optimistic update should be applied
      const cachedData = queryClient.getQueryData(['listUsers', {}, {}]);
      expect(cachedData).toEqual([
        { id: 1, name: 'John' },
        { id: 2, name: 'Jane' }
      ]);

      await waitFor(() => expect(mutationResult.current.isSuccess).toBe(true));
    });

    it('should revert optimistic update on error', async () => {
      const initialData = [{ id: 1, name: 'John' }];
      
      global.fetch = vi.fn()
        .mockResolvedValueOnce({
          ok: true,
          json: async () => initialData
        })
        .mockResolvedValueOnce({
          ok: false,
          status: 500,
          statusText: 'Server Error'
        });

      const queryOperation: Operation = {
        id: 'listUsers',
        method: 'GET',
        path: '/users',
        summary: 'List users',
        parameters: [],
        responses: {},
        viewHint: 'list'
      };

      // Populate cache
      const { result: queryResult } = renderHook(
        () => useApiCall({ operation: queryOperation }),
        { wrapper }
      );

      await waitFor(() => expect(queryResult.current.isSuccess).toBe(true));

      // Execute mutation with optimistic update (will fail)
      const { result: mutationResult } = renderHook(
        () => useApiMutation(mockOperation, {
          optimisticUpdate: (oldData: any[], variables: any) => [
            ...oldData,
            { id: 2, name: variables.body.name }
          ]
        }),
        { wrapper }
      );

      mutationResult.current.mutate({ body: { name: 'Jane' } });

      await waitFor(() => expect(mutationResult.current.isError).toBe(true));

      // Data should be reverted to original
      const cachedData = queryClient.getQueryData(['listUsers', {}, {}]);
      expect(cachedData).toEqual(initialData);
    });
  });
});
