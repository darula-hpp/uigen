import { useState } from 'react';
import type { UIGenApp } from '@uigen/core';
import { Sidebar } from './Sidebar';
import { TopBar } from './TopBar';
import { Breadcrumb } from './Breadcrumb';

interface LayoutProps {
  config: UIGenApp;
  children: React.ReactNode;
}

/**
 * Main layout shell component
 * Implements Requirements 31.1, 31.2
 */
export function Layout({ config, children }: LayoutProps) {
  // Requirement 60.4: Support collapsible sidebar on desktop
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);

  const handleMobileMenuClick = () => {
    setMobileSidebarOpen(!mobileSidebarOpen);
  };

  const handleMobileSidebarClose = () => {
    setMobileSidebarOpen(false);
  };

  return (
    // Requirement 31.1: Render sidebar, top bar, and content area
    <div className="flex h-screen overflow-hidden">
      {/* Sidebar - Requirement 31.2: Support responsive layout */}
      <Sidebar
        config={config}
        isOpen={mobileSidebarOpen}
        onClose={handleMobileSidebarClose}
      />

      {/* Main content area */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Top bar */}
        <TopBar config={config} onMenuClick={handleMobileMenuClick} />

        {/* Breadcrumb navigation */}
        <Breadcrumb config={config} />

        {/* Content area */}
        <main className="flex-1 overflow-auto">
          <div className="container mx-auto p-6">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
