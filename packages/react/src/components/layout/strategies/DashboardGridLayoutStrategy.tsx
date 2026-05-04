import { useState, useMemo, memo } from 'react';
import type { ReactNode } from 'react';
import type { LayoutMetadata, ResponsiveColumns } from '@uigen-dev/core';
import type { LayoutStrategy } from '@/lib/layout-registry';
import { Sidebar } from '../Sidebar';
import { TopBar } from '../TopBar';
import { Breadcrumb } from '../Breadcrumb';
import { useApp } from '@/contexts/AppContext';

/**
 * Dashboard grid layout strategy
 * Implements Requirements 5.1, 5.2, 5.3, 5.4, 5.5, 15.1, 15.4, 15.5
 */
export class DashboardGridLayoutStrategy implements LayoutStrategy {
  type = 'dashboard-grid' as const;
  
  render(children: ReactNode, metadata?: LayoutMetadata): ReactNode {
    return <DashboardGridLayoutComponent metadata={metadata}>{children}</DashboardGridLayoutComponent>;
  }
  
  validate(metadata?: LayoutMetadata): boolean {
    if (!metadata) return true;
    
    // Requirement 5.3: Validate grid-specific metadata
    if (metadata.columns) {
      const cols = metadata.columns as ResponsiveColumns;
      for (const [key, value] of Object.entries(cols)) {
        if (typeof value !== 'number' || value < 1) {
          console.warn(`[DashboardGridLayout] Invalid columns.${key}: must be a positive integer`);
          return false;
        }
      }
    }
    
    if (metadata.gap !== undefined) {
      if (typeof metadata.gap !== 'number' || metadata.gap < 0) {
        console.warn('[DashboardGridLayout] Invalid gap: must be a non-negative number');
        return false;
      }
    }
    
    return true;
  }
  
  getDefaults(): LayoutMetadata {
    return {
      columns: {
        mobile: 1,
        tablet: 2,
        desktop: 3
      },
      gap: 24
    };
  }
}

interface DashboardGridLayoutComponentProps {
  children: ReactNode;
  metadata?: LayoutMetadata;
}

// Requirement 15.1: Memoize layout strategy component to prevent unnecessary re-renders
const DashboardGridLayoutComponent = memo(function DashboardGridLayoutComponent({ children, metadata }: DashboardGridLayoutComponentProps) {
  const { config } = useApp();
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  
  // Requirement 15.5: Use useMemo for expensive computations
  const columns = useMemo(() => 
    metadata?.columns as ResponsiveColumns ?? { mobile: 1, tablet: 2, desktop: 3 },
    [metadata?.columns]
  );
  
  const gap = useMemo(() => 
    metadata?.gap ?? 24,
    [metadata?.gap]
  );
  
  // Requirement 15.4: Use CSS variables instead of inline styles to avoid layout recalculation
  const gridStyles = useMemo(() => ({
    '--grid-gap': `${gap}px`,
    '--grid-columns-mobile': columns.mobile,
    '--grid-columns-tablet': columns.tablet,
    '--grid-columns-desktop': columns.desktop,
  } as React.CSSProperties), [gap, columns.mobile, columns.tablet, columns.desktop]);
  
  // Requirement 5.5: Handle mobile sidebar overlay
  const handleMobileMenuClick = () => {
    setMobileSidebarOpen(!mobileSidebarOpen);
  };
  
  const handleMobileSidebarClose = () => {
    setMobileSidebarOpen(false);
  };
  
  return (
    <div className="flex h-screen overflow-hidden">
      {/* Requirement 14.5: ARIA live region for layout change announcements */}
      <div 
        role="status" 
        aria-live="polite" 
        aria-atomic="true"
        className="sr-only"
      >
        {mobileSidebarOpen ? 'Navigation menu opened' : ''}
      </div>
      
      {/* Requirement 5.3: Include sidebar like sidebar layout */}
      <Sidebar
        config={config}
        isOpen={mobileSidebarOpen}
        onClose={handleMobileSidebarClose}
      />
      
      {/* Requirement 9.1, 9.3, 9.4, 9.5: Add transitions for content area width changes */}
      <div className="flex-1 flex flex-col overflow-hidden transition-all duration-300 ease-in-out">
        {/* Requirement 5.3: Include top bar like sidebar layout */}
        <TopBar config={config} onMenuClick={handleMobileMenuClick} />
        <Breadcrumb config={config} />
        
        {/* Requirement 5.1, 5.2, 5.4, 14.1: Render content in responsive grid with semantic main element */}
        <main role="main" className="flex-1 overflow-auto">
          <div 
            className="dashboard-grid-container container mx-auto p-6 transition-all duration-300 ease-in-out"
            style={gridStyles}
          >
            {/* Requirement 5.4, 15.4: Use CSS variables for responsive grid to avoid inline style recalculation */}
            <style>{`
              .dashboard-grid-container {
                display: grid;
                gap: var(--grid-gap);
                grid-template-columns: repeat(var(--grid-columns-mobile), 1fr);
              }
              @media (min-width: 768px) {
                .dashboard-grid-container {
                  grid-template-columns: repeat(var(--grid-columns-tablet), 1fr);
                }
              }
              @media (min-width: 1024px) {
                .dashboard-grid-container {
                  grid-template-columns: repeat(var(--grid-columns-desktop), 1fr);
                }
              }
            `}</style>
            {children}
          </div>
        </main>
      </div>
    </div>
  );
});
