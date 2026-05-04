import { type ReactNode, useMemo } from 'react';
import type { LayoutConfig } from '@uigen-dev/core';
import { LayoutRegistry } from '@/lib/layout-registry';
import { ErrorBoundary } from '../ErrorBoundary';

interface LayoutContainerProps {
  /** Layout configuration from IR */
  layoutConfig?: LayoutConfig;
  
  /** Children to render within the layout */
  children: ReactNode;
}

/**
 * Layout container component that resolves and applies layout strategies
 * Implements Requirements 6.1, 6.2, 6.3, 6.4, 6.5
 */
export function LayoutContainer({ 
  layoutConfig, 
  children
}: LayoutContainerProps) {
  const registry = LayoutRegistry.getInstance();
  
  // Requirement 6.2: Resolve layout strategy from registry based on config type
  const strategy = useMemo(() => {
    const type = layoutConfig?.type || 'sidebar';
    return registry.get(type);
  }, [layoutConfig?.type, registry]);
  
  // Requirement 6.3: Merge metadata with strategy defaults
  const metadata = useMemo(() => {
    const defaults = strategy.getDefaults();
    return {
      ...defaults,
      ...layoutConfig?.metadata
    };
  }, [strategy, layoutConfig?.metadata]);
  
  // Requirement 6.4: Validate metadata with strategy validator
  const isValid = useMemo(() => {
    return strategy.validate(metadata);
  }, [strategy, metadata]);
  
  // Requirement 6.5: Log warning when metadata validation fails and use defaults
  if (!isValid) {
    console.warn(
      `[LayoutContainer] Invalid metadata for layout "${strategy.type}". Using defaults.`
    );
  }
  
  // Requirement 6.6: Wrap in ErrorBoundary with fallback UI for layout errors
  return (
    <ErrorBoundary
      fallback={(error, reset) => (
        <div className="min-h-screen flex items-center justify-center p-4">
          <div className="max-w-md w-full bg-destructive/10 border border-destructive rounded-lg p-6">
            <div className="flex items-start gap-3">
              <div className="flex-shrink-0">
                <svg
                  className="h-6 w-6 text-destructive"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                  />
                </svg>
              </div>
              <div className="flex-1">
                <h3 className="text-lg font-semibold text-destructive mb-2">
                  Layout Error
                </h3>
                <p className="text-sm text-muted-foreground mb-4">
                  There was a problem rendering the layout. {error.message}
                </p>
                <button
                  onClick={reset}
                  className="px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 transition-colors"
                >
                  Reload Layout
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    >
      {/* Requirement 6.7: Render children within resolved strategy using strategy.render() */}
      {strategy.render(children, isValid ? metadata : strategy.getDefaults())}
    </ErrorBoundary>
  );
}
