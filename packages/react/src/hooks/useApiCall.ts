import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import type { Operation } from '@uigen-dev/core';
import { getAuthHeaders, clearAuthCredentials } from '@/lib/auth';
import { getSelectedServer } from '@/lib/server';

interface ApiCallOptions {
  operation?: Operation;
  pathParams?: Record<string, string>;
  queryParams?: Record<string, string>;
  body?: unknown;
  enabled?: boolean;
}

/**
 * Hook for API queries with caching and retry logic
 * Implements Requirements 44.1-44.4, 45.1-45.5, 16.4, 17.5
 */
export function useApiCall(options: ApiCallOptions) {
  const { operation, pathParams = {}, queryParams = {}, enabled = true } = options;

  // If no operation provided, return disabled query
  if (!operation) {
    return useQuery({
      queryKey: ['disabled'],
      queryFn: () => Promise.resolve(null),
      enabled: false,
    });
  }

  let url = operation.path;
  Object.entries(pathParams).forEach(([key, value]) => {
    url = url.replace(`{${key}}`, value);
  });

  const queryString = new URLSearchParams(
    Object.entries(queryParams).reduce((acc, [key, value]) => {
      acc[key] = String(value);
      return acc;
    }, {} as Record<string, string>)
  ).toString();
  if (queryString) url += `?${queryString}`;

  return useQuery({
    queryKey: [operation.id, pathParams, queryParams],
    queryFn: async () => {
      // Requirement 16.4, 17.5: Inject auth headers into requests
      const authHeaders = getAuthHeaders();
      
      // Requirement 19.4: Route API requests to selected server
      const selectedServer = getSelectedServer();
      
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
        ...authHeaders
      };
      
      if (selectedServer) {
        headers['x-uigen-server'] = selectedServer;
      }
      
      const response = await fetch(`/api${url}`, {
        method: operation.method,
        headers
      });
      
      // Requirement 16.5: Clear token on 401 response
      if (response.status === 401) {
        clearAuthCredentials();
        window.location.reload();
      }
      
      if (!response.ok) {
        const error = new Error(`API error: ${response.statusText}`) as Error & { status?: number };
        error.status = response.status;
        throw error;
      }
      return response.json();
    },
    enabled: enabled && operation.method === 'GET',
    // Cache for 5 minutes (Requirement 44.2)
    staleTime: 5 * 60 * 1000,
    // Retry logic (Requirement 45.1-45.5)
    retry: (failureCount, error) => {
      // Don't retry 4xx errors (Requirement 45.4)
      if ((error as any)?.status >= 400 && (error as any)?.status < 500) {
        return false;
      }
      // Retry up to 3 times for network errors and 5xx (Requirement 45.1, 45.5)
      return failureCount < 3;
    },
    // Exponential backoff: 1s, 2s, 4s (Requirement 45.2)
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000)
  });
}

/**
 * Hook for API mutations with cache invalidation and optimistic updates
 * Implements Requirements 44.5, 47.1-47.4, 16.4, 17.5
 */
export function useApiMutation(operation: Operation, options?: {
  optimisticUpdate?: (oldData: any, variables: any) => any;
  relatedQueryKeys?: string[];
}) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ pathParams = {}, body }: { pathParams?: Record<string, string>; body?: unknown }) => {
      let url = operation.path;
      Object.entries(pathParams).forEach(([key, value]) => {
        url = url.replace(`{${key}}`, value);
      });

      // Requirement 16.4, 17.5: Inject auth headers into requests
      const authHeaders = getAuthHeaders();
      
      // Requirement 19.4: Route API requests to selected server
      const selectedServer = getSelectedServer();
      
      const contentType = operation.requestContentType || 'application/json';

      const headers: Record<string, string> = {
        'Content-Type': contentType,
        ...authHeaders
      };
      
      if (selectedServer) {
        headers['x-uigen-server'] = selectedServer;
      }

      // Serialize body based on content type
      let serializedBody: string | FormData | undefined;
      if (body) {
        if (contentType === 'application/x-www-form-urlencoded') {
          const params = new URLSearchParams();
          for (const [k, v] of Object.entries(body as Record<string, unknown>)) {
            if (v !== undefined && v !== null) params.set(k, String(v));
          }
          serializedBody = params.toString();
        } else if (contentType === 'multipart/form-data') {
          const fd = new FormData();
          for (const [k, v] of Object.entries(body as Record<string, unknown>)) {
            if (v !== undefined && v !== null) fd.append(k, v instanceof File ? v : String(v));
          }
          serializedBody = fd;
          // Let browser set Content-Type with boundary for multipart
          delete headers['Content-Type'];
        } else {
          serializedBody = JSON.stringify(body);
        }
      }

      const response = await fetch(`/api${url}`, {
        method: operation.method,
        headers,
        body: serializedBody
      });

      // Requirement 16.5, 17.6: Clear credentials on 401 response
      if (response.status === 401) {
        clearAuthCredentials();
        window.location.reload();
      }

      if (!response.ok) {
        const error = new Error(`API error: ${response.statusText}`) as Error & { status?: number };
        error.status = response.status;
        throw error;
      }
      return response.json();
    },
    // Optimistic update support (Requirement 47.1-47.4)
    onMutate: async (variables) => {
      if (options?.optimisticUpdate) {
        // Cancel outgoing refetches
        await queryClient.cancelQueries({ queryKey: [operation.id] });
        
        // Snapshot previous value
        const previousData = queryClient.getQueryData([operation.id]);
        
        // Optimistically update
        if (previousData) {
          queryClient.setQueryData([operation.id], (old: any) => 
            options.optimisticUpdate!(old, variables)
          );
        }
        
        return { previousData };
      }
    },
    // Revert on error (Requirement 47.2, 47.4)
    onError: (_err, _variables, context) => {
      if (context?.previousData) {
        queryClient.setQueryData([operation.id], context.previousData);
      }
    },
    // Invalidate cache on success (Requirement 44.5)
    onSuccess: () => {
      // Invalidate the operation's own queries
      queryClient.invalidateQueries({ queryKey: [operation.id] });
      
      // Also invalidate queries that might be related (e.g., list queries when creating/updating)
      // Extract resource name from path for broader invalidation
      const resourceMatch = operation.path.match(/^\/([^/]+)/);
      if (resourceMatch) {
        const resourceName = resourceMatch[1];
        // Invalidate all queries for this resource
        queryClient.invalidateQueries({
          predicate: (query) => {
            const queryKey = query.queryKey[0];
            return typeof queryKey === 'string' && queryKey.includes(resourceName);
          }
        });
      }
      
      // Invalidate related queries if specified
      if (options?.relatedQueryKeys) {
        options.relatedQueryKeys.forEach(key => {
          queryClient.invalidateQueries({ queryKey: [key] });
        });
      }
    }
  });
}
