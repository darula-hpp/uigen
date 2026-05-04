import { memo, useMemo } from 'react';
import type { ReactNode } from 'react';
import type { LayoutMetadata } from '@uigen-dev/core';
import type { LayoutStrategy } from '@/lib/layout-registry';
import { ThemeToggle } from '../../ThemeToggle';
import { useApp } from '@/contexts/AppContext';

/**
 * Centered layout strategy for authentication pages
 * Implements Requirements 4.1, 4.2, 4.3, 4.4, 4.5, 15.1
 */
export class CenteredLayoutStrategy implements LayoutStrategy {
  type = 'centered' as const;
  
  render(children: ReactNode, metadata?: LayoutMetadata): ReactNode {
    return <CenteredLayoutComponent metadata={metadata}>{children}</CenteredLayoutComponent>;
  }
  
  validate(metadata?: LayoutMetadata): boolean {
    if (!metadata) return true;
    
    // Requirement 4.3: Validate centered-specific metadata
    if (metadata.maxWidth !== undefined) {
      if (typeof metadata.maxWidth !== 'number' || metadata.maxWidth <= 0) {
        console.warn('[CenteredLayout] Invalid maxWidth: must be a positive number');
        return false;
      }
    }
    
    return true;
  }
  
  getDefaults(): LayoutMetadata {
    return {
      maxWidth: 480,
      showHeader: true,
      verticalCenter: true
    };
  }
}

interface CenteredLayoutComponentProps {
  children: ReactNode;
  metadata?: LayoutMetadata;
}

// Requirement 15.1: Memoize layout strategy component to prevent unnecessary re-renders
const CenteredLayoutComponent = memo(function CenteredLayoutComponent({ children, metadata }: CenteredLayoutComponentProps) {
  const { config } = useApp();
  
  // Requirement 15.5: Use useMemo for expensive computations
  const maxWidth = useMemo(() => metadata?.maxWidth ?? 480, [metadata?.maxWidth]);
  const showHeader = useMemo(() => metadata?.showHeader ?? true, [metadata?.showHeader]);
  const verticalCenter = useMemo(() => metadata?.verticalCenter ?? true, [metadata?.verticalCenter]);
  
  // Requirement 15.4: Use CSS variables instead of inline styles to avoid layout recalculation
  const containerStyles = useMemo(() => ({
    '--max-width': `${maxWidth}px`,
  } as React.CSSProperties), [maxWidth]);
  
  return (
    <div className="min-h-screen flex flex-col">
      {/* Requirement 4.2, 14.1: Render optional header with app title and theme toggle using semantic HTML */}
      {/* Requirement 9.1, 9.4, 9.5: Add transitions for smooth layout changes */}
      {showHeader && (
        <header role="banner" className="border-b bg-card transition-all duration-300 ease-in-out">
          <div className="container mx-auto px-4 h-16 flex items-center justify-between">
            <h1 className="text-xl font-bold">{config.meta.title}</h1>
            <ThemeToggle />
          </div>
        </header>
      )}
      
      {/* Requirement 4.1, 4.4, 4.5, 14.1: Render centered container with semantic main element */}
      {/* Requirement 9.1, 9.4, 9.5: Add transitions for smooth layout changes */}
      {/* Requirement 15.4: Use CSS variables to avoid inline style recalculation */}
      <main 
        role="main"
        className={`centered-layout-main flex-1 flex items-center justify-center p-4 transition-all duration-300 ease-in-out ${
          verticalCenter ? '' : 'items-start pt-16'
        }`}
        style={containerStyles}
      >
        <style>{`
          .centered-layout-main > div {
            width: 100%;
            max-width: var(--max-width);
            transition: all 300ms ease-in-out;
          }
        `}</style>
        <div>
          {children}
        </div>
      </main>
    </div>
  );
});
