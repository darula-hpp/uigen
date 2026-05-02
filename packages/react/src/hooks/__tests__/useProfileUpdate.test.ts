import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook } from '@testing-library/react';
import { useProfileUpdate } from '../useProfileUpdate';
import type { Operation } from '@uigen-dev/core';

// Mock useApiMutation
vi.mock('../useApiCall', () => ({
  useApiMutation: vi.fn(),
}));

import { useApiMutation } from '../useApiCall';

const mockUseApiMutation = useApiMutation as ReturnType<typeof vi.fn>;

/**
 * Unit tests for useProfileUpdate hook
 * Task 9.1: Create useProfileUpdate custom hook
 * 
 * Tests verify:
 * - Hook wraps useApiMutation correctly
 * - Configures related query keys for cache invalidation
 * - Returns correct mutation functions and state
 */
describe('useProfileUpdate', () => {
  const mockOperation: Operation = {
    id: 'updateProfile',
    uigenId: 'updateProfile',
    operationId: 'updateProfile',
    method: 'PUT',
    path: '/api/v1/auth/me',
    viewHint: 'update',
    responses: {
      '200': {
        description: 'Success',
        schema: {
          key: 'User',
          type: 'object',
          label: 'User',
          required: false,
        },
      },
    },
    parameters: [],
    requestBody: undefined,
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should call useApiMutation with operation and related query keys', () => {
    const mockMutate = vi.fn();
    const mockReset = vi.fn();

    mockUseApiMutation.mockReturnValue({
      mutate: mockMutate,
      isPending: false,
      error: null,
      isSuccess: false,
      reset: mockReset,
    } as any);

    renderHook(() => useProfileUpdate(mockOperation));

    expect(mockUseApiMutation).toHaveBeenCalledWith(
      mockOperation,
      expect.objectContaining({
        relatedQueryKeys: ['profile', 'auth/me', 'user', 'me'],
      })
    );
  });

  it('should return updateProfile function', () => {
    const mockMutate = vi.fn();

    mockUseApiMutation.mockReturnValue({
      mutate: mockMutate,
      isPending: false,
      error: null,
      isSuccess: false,
      reset: vi.fn(),
    } as any);

    const { result } = renderHook(() => useProfileUpdate(mockOperation));

    expect(result.current.updateProfile).toBeDefined();
    expect(typeof result.current.updateProfile).toBe('function');
  });

  it('should call mutate with body and pathParams when updateProfile is called', () => {
    const mockMutate = vi.fn();

    mockUseApiMutation.mockReturnValue({
      mutate: mockMutate,
      isPending: false,
      error: null,
      isSuccess: false,
      reset: vi.fn(),
    } as any);

    const { result } = renderHook(() => useProfileUpdate(mockOperation));

    const testData = { username: 'testuser', email: 'test@example.com' };
    const testPathParams = { id: '123' };

    result.current.updateProfile(testData, testPathParams);

    expect(mockMutate).toHaveBeenCalledWith({
      body: testData,
      pathParams: testPathParams,
    });
  });

  it('should use empty pathParams if not provided', () => {
    const mockMutate = vi.fn();

    mockUseApiMutation.mockReturnValue({
      mutate: mockMutate,
      isPending: false,
      error: null,
      isSuccess: false,
      reset: vi.fn(),
    } as any);

    const { result } = renderHook(() => useProfileUpdate(mockOperation));

    const testData = { username: 'testuser' };
    result.current.updateProfile(testData);

    expect(mockMutate).toHaveBeenCalledWith({
      body: testData,
      pathParams: {},
    });
  });

  it('should return isUpdating state from mutation', () => {
    mockUseApiMutation.mockReturnValue({
      mutate: vi.fn(),
      isPending: true,
      error: null,
      isSuccess: false,
      reset: vi.fn(),
    } as any);

    const { result } = renderHook(() => useProfileUpdate(mockOperation));

    expect(result.current.isUpdating).toBe(true);
  });

  it('should return error from mutation', () => {
    const mockError = new Error('Update failed');

    mockUseApiMutation.mockReturnValue({
      mutate: vi.fn(),
      isPending: false,
      error: mockError,
      isSuccess: false,
      reset: vi.fn(),
    } as any);

    const { result } = renderHook(() => useProfileUpdate(mockOperation));

    expect(result.current.error).toBe(mockError);
  });

  it('should return isSuccess state from mutation', () => {
    mockUseApiMutation.mockReturnValue({
      mutate: vi.fn(),
      isPending: false,
      error: null,
      isSuccess: true,
      reset: vi.fn(),
    } as any);

    const { result } = renderHook(() => useProfileUpdate(mockOperation));

    expect(result.current.isSuccess).toBe(true);
  });

  it('should return reset function from mutation', () => {
    const mockReset = vi.fn();

    mockUseApiMutation.mockReturnValue({
      mutate: vi.fn(),
      isPending: false,
      error: null,
      isSuccess: false,
      reset: mockReset,
    } as any);

    const { result } = renderHook(() => useProfileUpdate(mockOperation));

    expect(result.current.reset).toBe(mockReset);
  });

  it('should handle undefined operation', () => {
    mockUseApiMutation.mockReturnValue({
      mutate: vi.fn(),
      isPending: false,
      error: null,
      isSuccess: false,
      reset: vi.fn(),
    } as any);

    const { result } = renderHook(() => useProfileUpdate(undefined));

    expect(result.current.updateProfile).toBeDefined();
    expect(result.current.isUpdating).toBe(false);
    expect(result.current.error).toBe(null);
    expect(result.current.isSuccess).toBe(false);
  });
});
