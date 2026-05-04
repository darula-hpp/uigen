import { useState, useEffect, useRef, memo } from 'react';
import type { ReactNode } from 'react';
import type { LayoutMetadata } from '@uigen-dev/core';
import type { LayoutStrategy } from '@/lib/layout-registry';
import { loadLayoutPreferences, updateLayoutPreferences } from '@/lib/layout-preferences';
import { Sidebar } from '../Sidebar';
import { TopBar } from '../TopBar';
import { Breadcrumb } from '../Breadcrumb';
import { useApp } from '@/contexts/AppContext';

/**
 * Sidebar layout strategy implementation
 * Preserves current sidebar layout as default
 * Implements Requirements 3.1, 3.2, 3.3, 3.4, 3.5, 3.6, 15.1
 */
export class SidebarLayoutStrategy implements LayoutStrategy {
  type = 'sidebar' as const;
  
  render(children: ReactNode, metadata?: LayoutMetadata): ReactNode {
    return <SidebarLayoutComponent metadata={metadata}>{children}</SidebarLayoutComponent>;
  }
  
  validate(metadata?: LayoutMetadata): boolean {
    if (!metadata) return true;
    
    // Validate sidebar-specific metadata
    if (metadata.sidebarWidth !== undefined) {
      if (typeof metadata.sidebarWidth !== 'number' || metadata.sidebarWidth <= 0) {
        console.warn('[SidebarLayout] Invalid sidebarWidth: must be a positive number');
        return false;
      }
    }
    
    return true;
  }
  
  getDefaults(): LayoutMetadata {
    return {
      sidebarWidth: 256,
      sidebarCollapsible: true,
      sidebarDefaultCollapsed: false
    };
  }
}

interface SidebarLayoutComponentProps {
  children: ReactNode;
  metadata?: LayoutMetadata;
}

// Requirement 15.1: Memoize layout strategy component to prevent unnecessary re-renders
const SidebarLayoutComponent = memo(function SidebarLayoutComponent({ children, metadata }: SidebarLayoutComponentProps) {
  const { config } = useApp();
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const mainContentRef = useRef<HTMLElement>(null);
  
  // Get sidebar width from metadata or use default
  const sidebarWidth = metadata?.sidebarWidth ?? 256;
  
  // Requirement 10.1, 10.2, 10.3: Load persisted sidebar state using layout preferences
  const appId = config.meta.title || 'uigen-app';
  const [sidebarCollapsed, setSidebarCollapsed] = useState(() => {
    const prefs = loadLayoutPreferences(appId);
    return prefs?.sidebarCollapsed ?? metadata?.sidebarDefaultCollapsed ?? false;
  });
  
  // Requirement 10.1, 10.2: Persist sidebar state using layout preferences
  useEffect(() => {
    updateLayoutPreferences(appId, {
      sidebarCollapsed
    });
  }, [sidebarCollapsed, appId]);
  
  // Requirement 14.4: Focus management when layout changes
  useEffect(() => {
    if (!mobileSidebarOpen && mainContentRef.current) {
      // When sidebar closes, return focus to main content
      mainContentRef.current.focus();
    }
  }, [mobileSidebarOpen]);
  
  // Requirement 3.5: Handle mobile sidebar overlay
  const handleMobileMenuClick = () => {
    setMobileSidebarOpen(!mobileSidebarOpen);
  };
  
  const handleMobileSidebarClose = () => {
    setMobileSidebarOpen(false);
  };
  
  // Requirement 15.4: Use CSS variables to avoid inline style recalculation
  const layoutStyles = {
    '--sidebar-width': `${sidebarWidth}px`,
  } as React.CSSProperties;
  
  return (
    <div className="flex h-screen overflow-hidden" style={layoutStyles}>
      <style>{`
        .sidebar-layout-sidebar {
          width: var(--sidebar-width);
        }
        
        /* Mobile: fixed width for overlay */
        @media (max-width: 768px) {
          .sidebar-layout-sidebar {
            width: 256px;
          }
        }
      `}</style>
      
      {/* Requirement 14.5: ARIA live region for layout change announcements */}
      <div 
        role="status" 
        aria-live="polite" 
        aria-atomic="true"
        className="sr-only"
      >
        {mobileSidebarOpen ? 'Navigation menu opened' : ''}
      </div>
      
      {/* Requirement 3.1: Render collapsible sidebar with resource navigation */}
      <div className="sidebar-layout-sidebar h-full">
        <Sidebar
          config={config}
          isOpen={mobileSidebarOpen}
          onClose={handleMobileSidebarClose}
        />
      </div>
      
      {/* Requirement 9.1, 9.3, 9.4, 9.5: Add transitions for content area width changes */}
      <div className="flex-1 flex flex-col overflow-hidden transition-all duration-300 ease-in-out">
        {/* Requirement 3.2: Render top bar with app title and controls */}
        <TopBar config={config} onMenuClick={handleMobileMenuClick} />
        <Breadcrumb config={config} />
        
        {/* Requirement 3.3, 14.1, 14.4: Render main content area with focus management */}
        <main 
          ref={mainContentRef}
          role="main" 
          tabIndex={-1}
          className="flex-1 overflow-auto focus:outline-none"
        >
          <div className="container mx-auto p-6">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
});
