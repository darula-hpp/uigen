import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { Layout } from '../Layout';
import type { UIGenApp } from '@uigen/core';

// Mock child components
vi.mock('../Sidebar', () => ({
  Sidebar: ({ config, isOpen, onClose }: any) => (
    <div data-testid="sidebar" data-open={isOpen}>
      <button onClick={onClose}>Close Sidebar</button>
      {config.resources.map((r: any) => (
        <div key={r.slug}>{r.name}</div>
      ))}
    </div>
  ),
}));

vi.mock('../TopBar', () => ({
  TopBar: ({ config, onMenuClick }: any) => (
    <div data-testid="topbar">
      <button onClick={onMenuClick}>Menu</button>
      <span>{config.meta.title}</span>
    </div>
  ),
}));

vi.mock('../Breadcrumb', () => ({
  Breadcrumb: ({ config }: any) => (
    <div data-testid="breadcrumb">Breadcrumb for {config.meta.title}</div>
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
    it('should render sidebar component', () => {
      renderLayout();
      expect(screen.getByTestId('sidebar')).toBeInTheDocument();
    });

    it('should render top bar component', () => {
      renderLayout();
      expect(screen.getByTestId('topbar')).toBeInTheDocument();
    });

    it('should render breadcrumb component', () => {
      renderLayout();
      expect(screen.getByTestId('breadcrumb')).toBeInTheDocument();
    });

    it('should render content area with children', () => {
      renderLayout();
      expect(screen.getByTestId('content')).toBeInTheDocument();
      expect(screen.getByText('Test Content')).toBeInTheDocument();
    });
  });

  describe('Requirement 31.2: Support responsive layout', () => {
    it('should handle mobile menu toggle', () => {
      renderLayout();

      const sidebar = screen.getByTestId('sidebar');
      const menuButton = screen.getByRole('button', { name: /Menu/i });

      // Initially sidebar should be closed on mobile
      expect(sidebar).toHaveAttribute('data-open', 'false');

      // Click menu button to open
      fireEvent.click(menuButton);
      expect(sidebar).toHaveAttribute('data-open', 'true');

      // Click menu button again to close
      fireEvent.click(menuButton);
      expect(sidebar).toHaveAttribute('data-open', 'false');
    });

    it('should close mobile sidebar when close button is clicked', () => {
      renderLayout();

      const menuButton = screen.getByRole('button', { name: /Menu/i });
      const closeButton = screen.getByRole('button', { name: /Close Sidebar/i });

      // Open sidebar
      fireEvent.click(menuButton);
      expect(screen.getByTestId('sidebar')).toHaveAttribute('data-open', 'true');

      // Close sidebar
      fireEvent.click(closeButton);
      expect(screen.getByTestId('sidebar')).toHaveAttribute('data-open', 'false');
    });
  });

  describe('Layout structure', () => {
    it('should pass config to all child components', () => {
      renderLayout();

      // Check that config is passed to components
      expect(screen.getByText('Test API')).toBeInTheDocument();
      expect(screen.getByText('Users')).toBeInTheDocument();
      expect(screen.getByText('Posts')).toBeInTheDocument();
      expect(screen.getByText('Breadcrumb for Test API')).toBeInTheDocument();
    });

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

      expect(screen.getByText('Custom API')).toBeInTheDocument();
      expect(screen.getByText('Products')).toBeInTheDocument();
    });
  });
});
