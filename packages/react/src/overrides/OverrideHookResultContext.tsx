import { createContext, useContext } from 'react';
import type { OverrideHookProps } from './types';

/**
 * Context for exposing the result of useHooks override functions.
 * Only available when an override is in "hooks" mode.
 * 
 * Provides access to transformation functions like transformSubmit, validate, etc.
 */
export const OverrideHookResultContext = createContext<OverrideHookProps | null>(null);

/**
 * Hook to access the result of a useHooks override function.
 * Returns null if not in hooks mode or if the hook returned void.
 * 
 * @returns The hook result with transformation functions, or null
 * 
 * @example
 * ```typescript
 * function MyFormView() {
 *   const hookResult = useOverrideHookResult();
 *   
 *   const onSubmit = async (data: any) => {
 *     // Apply validation if provided
 *     if (hookResult?.validate) {
 *       const errors = hookResult.validate(data);
 *       if (errors) {
 *         // Show errors
 *         return;
 *       }
 *     }
 *     
 *     // Apply transformation if provided
 *     const transformedData = hookResult?.transformSubmit 
 *       ? await hookResult.transformSubmit(data)
 *       : data;
 *     
 *     // Submit to API
 *     await submitToApi(transformedData);
 *   };
 * }
 * ```
 */
export function useOverrideHookResult(): OverrideHookProps | null {
  return useContext(OverrideHookResultContext);
}
