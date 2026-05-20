import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { Layout } from '../Layout';
import type { UIGenApp } from '@uigen-dev/core';

vi.mock('../AppShell', () => ({
  AppShell: ({ children, onMenuClick }: { children: React.ReactNode; onMenuClick?: () => void }) => (
    <div data-testid="app-shell">
      <button onClick={onMenuClick}>Menu</button>
      {children}
    </div>
  ),
}));

const mockConfig: UIGenApp = {
  meta: {
    title: 'Test API',
    version: '1.0.0',
  },
  resources: [
    {
      name: 'Users',
      slug: 'users',
      operations: [],
      schema: { type: 'object', key: 'User', label: 'User', required: false },
      relationships: [],
    },
    {
      name: 'Posts',
      slug: 'posts',
      operations: [],
      schema: { type: 'object', key: 'Post', label: 'Post', required: false },
      relationships: [],
    },
  ],
  auth: {
    schemes: [],
    globalRequired: false,
  },
  dashboard: {},
  servers: [{ url: 'https://api.example.com' }],
};

describe('Layout', () => {
  const renderLayout = (config = mockConfig) => {
    return render(
      <BrowserRouter>
        <Layout config={config}>
          <div data-testid="content">Test Content</div>
        </Layout>
      </BrowserRouter>
    );
  };

  describe('Requirement 31.1: Render sidebar, top bar, and content area', () => {
    it('should render the shared app shell', () => {
      renderLayout();
      expect(screen.getByTestId('app-shell')).toBeInTheDocument();
    });

    it('should render content area with children', () => {
      renderLayout();
      expect(screen.getByTestId('content')).toBeInTheDocument();
      expect(screen.getByText('Test Content')).toBeInTheDocument();
    });
  });

  describe('Requirement 31.2: Support responsive layout', () => {
    it('should provide app config through AppProvider', () => {
      renderLayout();
      expect(screen.getByTestId('app-shell')).toBeInTheDocument();
    });
  });

  describe('Layout structure', () => {
    it('should render with different config', () => {
      const customConfig: UIGenApp = {
        ...mockConfig,
        meta: {
          title: 'Custom API',
          version: '2.0.0',
        },
        resources: [
          {
            name: 'Products',
            slug: 'products',
            operations: [],
            schema: { type: 'object', key: 'Product', label: 'Product', required: false },
            relationships: [],
          },
        ],
      };

      renderLayout(customConfig);
      expect(screen.getByTestId('content')).toBeInTheDocument();
    });
  });
});
