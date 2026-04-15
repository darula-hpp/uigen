import { createContext, useContext, type ReactNode } from 'react';
import type { Resource, Operation } from '@uigen-dev/core';
import { overrideRegistry } from './registry';

/**
 * Context for storing data returned from useHooks overrides.
 * Currently not consumed by built-in views, but available for future extensibility.
 */
const OverrideDataContext = createContext<Record<string, unknown>>({});

/**
 * Hook to access data returned from useHooks overrides.
 * Currently not used by built-in views, but available for custom components.
 */
export function useOverrideData(): Record<string, unknown> {
  return useContext(OverrideDataContext);
}

interface OverrideHooksHostProps {
  uigenId: string;
  resource: Resource;
  operation?: Operation;
  children: ReactNode;
}

/**
 * Wrapper component that calls override hooks unconditionally to satisfy React hook rules.
 * 
 * This component ensures that useHooks is called unconditionally on every render,
 * which satisfies React's rules of hooks without requiring eslint-disable directives.
 * 
 * The component is only mounted when an override with useHooks exists (checked by the caller),
 * so the hook is always called when the component is rendered.
 */
export function OverrideHooksHost({
  uigenId,
  resource,
  operation,
  children,
}: OverrideHooksHostProps): React.ReactElement {
  const def = overrideRegistry.get(uigenId);

  // Call useHooks unconditionally (satisfies React hook rules)
  // This is safe because this component is only mounted when an override exists
  let hookData: Record<string, unknown> = {};
  
  try {
    if (def?.useHooks) {
      const result = def.useHooks({ resource, operation });
      hookData = typeof result === 'object' && result !== null ? result : {};
    }
  } catch (err) {
    console.error(`[UIGen Override] Error in useHooks for "${uigenId}":`, err);
    // Continue rendering children even if hook fails
  }

  return (
    <OverrideDataContext.Provider value={hookData}>
      {children}
    </OverrideDataContext.Provider>
  );
}
