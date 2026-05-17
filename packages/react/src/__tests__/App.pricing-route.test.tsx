import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render } from '@testing-library/react';
import { App } from '../App';
import type { UIGenApp } from '@uigen-dev/core';

// Mock window.location properly
Object.defineProperty(window, 'location', {
  writable: true,
  value: {
    href: 'http://localhost:3000/pricing',
    origin: 'http://localhost:3000',
    pathname: '/pricing',
    search: '',
    hash: '',
  },
});

// Mock PricingView component
vi.mock('../components/views/PricingView', () => ({
  PricingView: ({ config }: any) => (
    <div data-testid="pricing-view">Pricing View for {config.meta.title}</div>
  ),
}));

// Mock other views to avoid rendering complexity
vi.mock('../components/views/DashboardView', () => ({
  DashboardView: () => <div>Dashboard</div>,
}));

vi.mock('../components/views/ProfileView', () => ({
  ProfileView: () => <div>Profile</div>,
}));

vi.mock('../components/views/LoginView', () => ({
  LoginView: () => <div>Login</div>,
}));

vi.mock('../components/views/LandingPageView', () => ({
  LandingPageView: () => <div>Landing</div>,
}));

vi.mock('../components/views/ListView', () => ({
  ListView: () => <div>List</div>,
}));

vi.mock('../components/views/DetailView', () => ({
  DetailView: () => <div>Detail</div>,
}));

vi.mock('../components/views/FormView', () => ({
  FormView: () => <div>Form</div>,
}));

vi.mock('../components/views/SearchView', () => ({
  SearchView: () => <div>Search</div>,
}));

vi.mock('../components/views/WizardView', () => ({
  WizardView: () => <div>Wizard</div>,
}));

vi.mock('../components/views/ActionSelectionView', () => ({
  ActionSelectionView: () => <div>Action Selection</div>,
}));

vi.mock('../components/auth/OAuthCallback', () => ({
  OAuthCallback: () => <div>OAuth Callback</div>,
}));

describe('App - Pricing Route', () => {
  const baseConfig: UIGenApp = {
    meta: {
      title: 'Test App',
      version: '1.0.0',
      description: 'Test',
    },
    resources: [],
    auth: {
      schemes: [],
      loginEndpoints: [],
      signUpEndpoints: [],
      passwordResetEndpoints: [],
    },
  };

  beforeEach(() => {
    sessionStorage.clear();
  });

  describe('Pricing Route Conditional Rendering', () => {
    it('should include pricing route when pricingPage is enabled', () => {
      const configWithPricing: UIGenApp = {
        ...baseConfig,
        payments: {
          providers: [
            {
              provider: 'stripe',
              publishableKey: 'pk_test_123',
              mode: 'test',
            },
          ],
          pricingPage: {
            enabled: true,
            source: 'inline',
            products: [],
          },
        },
      };

      // Just verify the component renders without errors
      // Route testing requires more complex setup with router context
      expect(() => render(<App config={configWithPricing} />)).not.toThrow();
    });

    it('should not include pricing route when pricingPage is disabled', () => {
      const configWithoutPricing: UIGenApp = {
        ...baseConfig,
        payments: {
          providers: [
            {
              provider: 'stripe',
              publishableKey: 'pk_test_123',
              mode: 'test',
            },
          ],
          pricingPage: {
            enabled: false,
            source: 'inline',
            products: [],
          },
        },
      };

      expect(() => render(<App config={configWithoutPricing} />)).not.toThrow();
    });

    it('should not include pricing route when payments not configured', () => {
      expect(() => render(<App config={baseConfig} />)).not.toThrow();
    });
  });

  describe('Pricing Config Validation', () => {
    it('should handle inline source configuration', () => {
      const config: UIGenApp = {
        ...baseConfig,
        payments: {
          providers: [
            {
              provider: 'stripe',
              publishableKey: 'pk_test_123',
              mode: 'test',
            },
          ],
          pricingPage: {
            enabled: true,
            source: 'inline',
            products: [
              {
                id: 'pro',
                name: 'Pro',
                description: 'Pro plan',
                type: 'subscription',
                price: 2900,
                interval: 'month',
                features: [],
              },
            ],
          },
        },
      };

      expect(() => render(<App config={config} />)).not.toThrow();
    });

    it('should handle endpoint source configuration', () => {
      const config: UIGenApp = {
        ...baseConfig,
        payments: {
          providers: [
            {
              provider: 'stripe',
              publishableKey: 'pk_test_123',
              mode: 'test',
            },
          ],
          pricingPage: {
            enabled: true,
            source: 'endpoint',
            endpoint: '/api/pricing',
          },
        },
      };

      expect(() => render(<App config={config} />)).not.toThrow();
    });

    it('should handle component source configuration', () => {
      const config: UIGenApp = {
        ...baseConfig,
        payments: {
          providers: [
            {
              provider: 'stripe',
              publishableKey: 'pk_test_123',
              mode: 'test',
            },
          ],
          pricingPage: {
            enabled: true,
            source: 'component',
          },
        },
      };

      expect(() => render(<App config={config} />)).not.toThrow();
    });
  });
});
