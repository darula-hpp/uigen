import { useApiMutation } from './useApiCall';
import type { Operation } from '@uigen-dev/core';

/**
 * Custom hook for profile update mutations
 * 
 * This hook wraps useApiMutation and provides a simplified interface
 * for updating user profile data. It handles cache invalidation for
 * profile-related queries to ensure UI consistency after updates.
 * 
 * Requirements:
 * - Task 9.1: Create useProfileUpdate custom hook
 * - Configure related query keys for cache invalidation
 * - Return mutation functions and state (isUpdating, error, isSuccess)
 * 
 * @param operation - The PUT/PATCH operation for profile updates
 * @returns Object containing mutation function and state
 */
export function useProfileUpdate(operation: Operation | undefined) {
  const mutation = useApiMutation(operation, {
    // Invalidate profile and auth/me queries after successful update
    // This ensures the UI reflects the latest data
    relatedQueryKeys: ['profile', 'auth/me', 'user', 'me']
  });

  return {
    /**
     * Function to trigger profile update
     * @param data - Profile data to update
     * @param pathParams - Optional path parameters for the request
     */
    updateProfile: (data: Record<string, unknown>, pathParams?: Record<string, string>) => 
      mutation.mutate({ body: data, pathParams: pathParams || {} }),
    
    /**
     * Loading state - true while update request is in progress
     */
    isUpdating: mutation.isPending,
    
    /**
     * Error object if update fails
     */
    error: mutation.error,
    
    /**
     * Success state - true after successful update
     */
    isSuccess: mutation.isSuccess,
    
    /**
     * Reset mutation state (useful for clearing success/error states)
     */
    reset: mutation.reset,
  };
}
