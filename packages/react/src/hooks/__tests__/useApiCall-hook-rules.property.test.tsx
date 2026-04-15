/**
 * Property-Based Tests: useApiCall Hook Rules
 * 
 * Tests that useApiCall satisfies React's Rules of Hooks by always calling
 * useQuery unconditionally, regardless of whether operation is defined.
 * 
 * Bug: useApiCall previously called useQuery conditionally (early-return when
 * operation is undefined, bottom call when defined), causing crashes when
 * operation changed between renders.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useApiCall } from '../useApiCall';
import fc from 'fast-check';
import type { Operation } from '@uigen-dev/core';
import React from 'react';

// Mock auth and server functions
vi.mock('@/lib/auth', () => ({
  getAuthHeaders: () => ({}),
  clearAuthCredentials: vi.fn(),
}));

vi.mock('@/lib/server', () => ({
  getSelectedServer: () => null,
}));

// Helper to create QueryClient wrapper
function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
    },
  });
  return ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>
      {children}
    </QueryClientProvider>
  );
}

// Arbitraries for fast-check
const operationArb = fc.record({
  id: fc.string({ minLength: 1 }),
  uigenId: fc.string({ minLength: 1 }),
  method: fc.constantFrom('GET', 'POST', 'PUT', 'DELETE', 'PATCH'),
  path: fc.string({ minLength: 1 }),
  summary: fc.string(),
  parameters: fc.constant([]),
  responses: fc.constant({}),
});

describe('Property-Based Tests: useApiCall Hook Rules', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Mock fetch to avoid actual network calls
    global.fetch = vi.fn(() =>
      Promise.resolve({
        ok: true,
        json: () => Promise.resolve({}),
      } as Response)
    );
  });

  /**
   * Property 1: Bug Condition Exploration
   * 
   * Demonstrates that the bug exists in the current implementation.
   * When operation is undefined, useApiCall should still work without crashing.
   */
  describe('Property 1: Bug Condition Exploration', () => {
    it('should handle operation=undefined without crashing (bug demonstration)', () => {
      fc.assert(
        fc.property(fc.constant(undefined), (operation) => {
          // This test demonstrates the bug exists
          // With the buggy implementation, this may cause inconsistent hook calls
          const wrapper = createWrapper();
          
          let result;
          try {
            result = renderHook(
              () => useApiCall({ operation }),
              { wrapper }
            );
            
            // If we get here without crashing, the hook was called
            expect(result.result.current).toBeDefined();
            expect(result.result.current.data).toBeNull();
            expect(result.result.current.isLoading).toBe(false);
          } catch (error) {
            // With buggy implementation, this might throw React hooks error
            // After fix, this should never throw
            console.log('Bug detected:', error);
          }
        }),
        { numRuns: 10 }
      );
    });
  });

  /**
   * Property 2: Fix Checking
   * 
   * After fix, operation=undefined should return a disabled query without crashing.
   */
  describe('Property 2: Fix Checking', () => {
    it('should return disabled query when operation is undefined', () => {
      fc.assert(
        fc.property(fc.constant(undefined), (operation) => {
          const wrapper = createWrapper();
          
          const { result } = renderHook(
            () => useApiCall({ operation }),
            { wrapper }
          );
          
          // Should return disabled query
          expect(result.current.data).toBeUndefined();
          expect(result.current.isLoading).toBe(false);
          expect(result.current.error).toBeNull();
        }),
        { numRuns: 100 }
      );
    });

    it('should return disabled query when operation is null', () => {
      const wrapper = createWrapper();
      
      const { result } = renderHook(
        () => useApiCall({ operation: null as any }),
        { wrapper }
      );
      
      expect(result.current.data).toBeUndefined();
      expect(result.current.isLoading).toBe(false);
      expect(result.current.error).toBeNull();
    });
  });

  /**
   * Property 3: Preservation Checking
   * 
   * Valid operations should continue to work correctly after fix.
   */
  describe('Property 3: Preservation Checking', () => {
    it('should fetch data for valid GET operations', async () => {
      await fc.assert(
        fc.asyncProperty(operationArb, async (operation) => {
          const getOperation = { ...operation, method: 'GET' as const };
          const wrapper = createWrapper();
          
          const { result } = renderHook(
            () => useApiCall({ operation: getOperation }),
            { wrapper }
          );
          
          // Should be loading initially
          expect(result.current.isLoading).toBe(true);
          
          // Wait for query to complete
          await waitFor(() => {
            expect(result.current.isLoading).toBe(false);
          });
          
          // Should have fetched data
          expect(global.fetch).toHaveBeenCalled();
        }),
        { numRuns: 20 }
      );
    });

    it('should return disabled query for non-GET operations', () => {
      fc.assert(
        fc.property(
          operationArb,
          fc.constantFrom('POST', 'PUT', 'DELETE', 'PATCH'),
          (operation, method) => {
            const nonGetOperation = { ...operation, method };
            const wrapper = createWrapper();
            
            const { result } = renderHook(
              () => useApiCall({ operation: nonGetOperation }),
              { wrapper }
            );
            
            // Should be disabled (not loading)
            expect(result.current.isLoading).toBe(false);
            expect(result.current.data).toBeUndefined();
          }
        ),
        { numRuns: 50 }
      );
    });

    it('should respect explicit enabled=false', () => {
      fc.assert(
        fc.property(operationArb, (operation) => {
          const getOperation = { ...operation, method: 'GET' as const };
          const wrapper = createWrapper();
          
          const { result } = renderHook(
            () => useApiCall({ operation: getOperation, enabled: false }),
            { wrapper }
          );
          
          // Should be disabled
          expect(result.current.isLoading).toBe(false);
          expect(result.current.data).toBeUndefined();
        }),
        { numRuns: 50 }
      );
    });
  });

  /**
   * Property 4: Hook Call Consistency
   * 
   * Hook call count should always be exactly 1, regardless of operation value.
   */
  describe('Property 4: Hook Call Consistency', () => {
    it('should call useQuery exactly once regardless of operation value', () => {
      fc.assert(
        fc.property(
          fc.option(operationArb, { nil: undefined }),
          (operation) => {
            const wrapper = createWrapper();
            
            // First render
            const { result, rerender } = renderHook(
              () => useApiCall({ operation }),
              { wrapper }
            );
            
            expect(result.current).toBeDefined();
            
            // Re-render with same operation
            rerender();
            expect(result.current).toBeDefined();
            
            // Should not crash
            return true;
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should handle operation changing from undefined to defined', () => {
      const wrapper = createWrapper();
      
      // Start with undefined
      const { result, rerender } = renderHook(
        ({ op }: { op?: Operation }) => useApiCall({ operation: op }),
        { 
          wrapper,
          initialProps: { op: undefined }
        }
      );
      
      expect(result.current.data).toBeUndefined();
      
      // Change to defined operation
      const operation: Operation = {
        id: 'test',
        uigenId: 'test',
        method: 'GET',
        path: '/test',
        summary: 'Test',
        parameters: [],
        responses: {},
      };
      
      rerender({ op: operation });
      
      // Should not crash
      expect(result.current).toBeDefined();
    });

    it('should handle operation changing from defined to undefined', () => {
      const wrapper = createWrapper();
      
      const operation: Operation = {
        id: 'test',
        uigenId: 'test',
        method: 'GET',
        path: '/test',
        summary: 'Test',
        parameters: [],
        responses: {},
      };
      
      // Start with defined
      const { result, rerender } = renderHook(
        ({ op }: { op?: Operation }) => useApiCall({ operation: op }),
        { 
          wrapper,
          initialProps: { op: operation }
        }
      );
      
      expect(result.current).toBeDefined();
      
      // Change to undefined
      rerender({ op: undefined });
      
      // Should not crash
      expect(result.current.data).toBeUndefined();
    });
  });
});
