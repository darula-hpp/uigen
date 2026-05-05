import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { LandingPageView } from '../components/views/LandingPageView';
import { DashboardView } from '../components/views/DashboardView';
import { AppProvider } from '../contexts/AppContext';
import { ToastProvider } from '../components/Toast';
import type { UIGenApp } from '@uigen-dev/core';

// Helper to create a minimal config
const createConfig = (landingPageConfig?: UIGenApp['landingPageConfig']): UIGenApp => ({
  meta: {
    title: 'Test App',
    version: '1.0.0',
    description: 'Test application',
  },
  resources: [],
  auth: {
    schemes: [],
    globalRequired: false,
  },
  dashboard: {
    enabled: true,
    widgets: [],
  },
  servers: [],
  landingPageConfig,
});

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: false,
    },
  },
});

// Wrapper component that mimics App.tsx routing logic
function TestApp({ config, initialPath = '/' }: { config: UIGenApp; initialPath?: string }) {
  const landingPageEnabled = config.landingPageConfig?.enabled === true;
  const dashboardPath = landingPageEnabled ? '/dashboard' : '/';

  return (
    <QueryClientProvider client={queryClient}>
      <AppProvider config={config}>
        <ToastProvider>
          <MemoryRouter initialEntries={[initialPath]}>
            <Routes>
              {landingPageEnabled && (
                <Route path="/" element={<LandingPageView config={config} />} />
              )}
              <Route path={dashboardPath} element={<DashboardView config={config} />} />
            </Routes>
          </MemoryRouter>
        </ToastProvider>
      </AppProvider>
    </QueryClientProvider>
  );
}

describe('Landing Page Routing Integration', () => {
  describe('Landing page disabled (backward compatibility)', () => {
    it('should show dashboard at "/" when landing page is not configured', () => {
      const config = createConfig(undefined);

      render(<TestApp config={config} />);

      // Dashboard should be at root - check for dashboard heading
      expect(screen.getByText('Dashboard')).toBeInTheDocument();
    });

    it('should show dashboard at "/" when landing page is explicitly disabled', () => {
      const config = createConfig({
        enabled: false,
        sections: {},
      });

      render(<TestApp config={config} />);

      // Dashboard should be at root
      expect(screen.getByText('Dashboard')).toBeInTheDocument();
    });
  });

  describe('Landing page enabled', () => {
    it('should show landing page at "/" when enabled', () => {
      const config = createConfig({
        enabled: true,
        sections: {
          hero: {
            enabled: true,
            headline: 'Welcome to Test App',
          },
        },
      });

      render(<TestApp config={config} />);

      // Landing page should be at root
      expect(screen.getByTestId('landing-page')).toBeInTheDocument();
      expect(screen.getByText('Welcome to Test App')).toBeInTheDocument();
    });

    it('should show dashboard at "/dashboard" when landing page is enabled', () => {
      const config = createConfig({
        enabled: true,
        sections: {},
      });

      render(<TestApp config={config} initialPath="/dashboard" />);

      // Dashboard should be at /dashboard
      expect(screen.getByText('Dashboard')).toBeInTheDocument();
      expect(screen.queryByTestId('landing-page')).not.toBeInTheDocument();
    });
  });

  describe('Route configuration', () => {
    it('should register both "/" and "/dashboard" routes when landing page is enabled', () => {
      const config = createConfig({
        enabled: true,
        sections: {
          hero: {
            enabled: true,
            headline: 'Test',
          },
        },
      });

      // Test root route
      const { unmount } = render(<TestApp config={config} initialPath="/" />);
      expect(screen.getByTestId('landing-page')).toBeInTheDocument();
      unmount();

      // Test dashboard route
      render(<TestApp config={config} initialPath="/dashboard" />);
      expect(screen.getByText('Dashboard')).toBeInTheDocument();
    });

    it('should only register "/" route when landing page is disabled', () => {
      const config = createConfig({
        enabled: false,
        sections: {},
      });

      // Root route should show dashboard
      render(<TestApp config={config} initialPath="/" />);
      expect(screen.getByText('Dashboard')).toBeInTheDocument();
    });
  });

  describe('Landing page with authentication', () => {
    it('should show landing page at "/" even when auth is required', () => {
      const config = createConfig({
        enabled: true,
        sections: {
          hero: {
            enabled: true,
            headline: 'Welcome',
          },
        },
      });

      // Add auth configuration
      config.auth.schemes = [{ type: 'bearer', name: 'Bearer' }];

      render(<TestApp config={config} />);

      // Landing page should be public and visible
      expect(screen.getByTestId('landing-page')).toBeInTheDocument();
    });
  });
});
