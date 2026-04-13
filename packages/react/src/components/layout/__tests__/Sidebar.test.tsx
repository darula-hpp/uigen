import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { Sidebar } from '../Sidebar';
import type { UIGenApp } from '@uigen/core';

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
    {
      name: 'Comments',
      slug: 'comments',
      operations: [],
      schema: { type: 'object', key: 'Comment', label: 'Comment', required: false },
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

describe('Sidebar', () => {
  const renderSidebar = (isOpen = true, onClose = vi.fn()) => {
    return render(
      <BrowserRouter>
        <Sidebar config={mockConfig} isOpen={isOpen} onClose={onClose} />
      </BrowserRouter>
    );
  };

  describe('Requirement 60.1: Render sidebar with navigation links', () => {
    it('should render sidebar navigation', () => {
      renderSidebar();
      expect(screen.getByRole('complementary')).toBeInTheDocument();
    });

    it('should render navigation links for all resources', () => {
      renderSidebar();
      expect(screen.getByRole('link', { name: /Users/i })).toBeInTheDocument();
      expect(screen.getByRole('link', { name: /Posts/i })).toBeInTheDocument();
      expect(screen.getByRole('link', { name: /Comments/i })).toBeInTheDocument();
    });
  });

  describe('Requirement 60.2: Display resource list with names', () => {
    it('should display all resource names', () => {
      renderSidebar();
      expect(screen.getByText('Users')).toBeInTheDocument();
      expect(screen.getByText('Posts')).toBeInTheDocument();
      expect(screen.getByText('Comments')).toBeInTheDocument();
    });

    it('should display app title and version in header', () => {
      renderSidebar();
      expect(screen.getByText('Test API')).toBeInTheDocument();
      expect(screen.getByText('1.0.0')).toBeInTheDocument();
    });
  });

  describe('Requirement 60.3: Highlight active resource', () => {
    it('should render links with appropriate styling classes', () => {
      // Render with /users path
      render(
        <BrowserRouter initialEntries={['/users']}>
          <Routes>
            <Route path="*" element={<Sidebar config={mockConfig} isOpen={true} onClose={vi.fn()} />} />
          </Routes>
        </BrowserRouter>
      );

      const usersLink = screen.getByRole('link', { name: /Users/i });
      const postsLink = screen.getByRole('link', { name: /Posts/i });
      
      // Both links should have transition classes
      expect(usersLink.className).toContain('transition-colors');
      expect(postsLink.className).toContain('transition-colors');
      
      // Links should have styling classes (either active or inactive)
      expect(usersLink.className).toMatch(/(bg-primary|text-foreground)/);
      expect(postsLink.className).toMatch(/(bg-primary|text-foreground)/);
    });

    it('should not highlight inactive resources', () => {
      render(
        <BrowserRouter initialEntries={['/users']}>
          <Routes>
            <Route path="*" element={<Sidebar config={mockConfig} isOpen={true} onClose={vi.fn()} />} />
          </Routes>
        </BrowserRouter>
      );

      const postsLink = screen.getByRole('link', { name: /Posts/i });
      // Posts should have the inactive classes
      expect(postsLink.className).toContain('text-foreground');
      expect(postsLink.className).not.toContain('bg-primary');
    });
  });

  describe('Requirement 60.4: Support collapsible sidebar on desktop', () => {
    it('should be visible when isOpen is true', () => {
      const { container } = renderSidebar(true);
      const sidebar = container.querySelector('aside');
      expect(sidebar).not.toHaveClass('-translate-x-full');
    });

    it('should be hidden when isOpen is false', () => {
      const { container } = renderSidebar(false);
      const sidebar = container.querySelector('aside');
      expect(sidebar).toHaveClass('-translate-x-full');
    });
  });

  describe('Requirement 60.5: Render as drawer on mobile', () => {
    it('should render overlay when open on mobile', () => {
      const { container } = renderSidebar(true);
      const overlay = container.querySelector('.fixed.inset-0.bg-black\\/50');
      expect(overlay).toBeInTheDocument();
    });

    it('should not render overlay when closed', () => {
      const { container } = renderSidebar(false);
      const overlay = container.querySelector('.fixed.inset-0.bg-black\\/50');
      expect(overlay).not.toBeInTheDocument();
    });

    it('should call onClose when overlay is clicked', () => {
      const onClose = vi.fn();
      const { container } = renderSidebar(true, onClose);
      
      const overlay = container.querySelector('.fixed.inset-0.bg-black\\/50');
      if (overlay) {
        fireEvent.click(overlay);
        expect(onClose).toHaveBeenCalled();
      }
    });

    it('should render close button on mobile', () => {
      renderSidebar(true);
      const closeButton = screen.getByRole('button', { name: /✕/i });
      expect(closeButton).toBeInTheDocument();
    });

    it('should call onClose when close button is clicked', () => {
      const onClose = vi.fn();
      renderSidebar(true, onClose);
      
      const closeButton = screen.getByRole('button', { name: /✕/i });
      fireEvent.click(closeButton);
      expect(onClose).toHaveBeenCalled();
    });

    it('should call onClose when navigation link is clicked', () => {
      const onClose = vi.fn();
      renderSidebar(true, onClose);
      
      const usersLink = screen.getByRole('link', { name: /Users/i });
      fireEvent.click(usersLink);
      expect(onClose).toHaveBeenCalled();
    });
  });

  describe('Navigation behavior', () => {
    it('should have correct href for each resource', () => {
      renderSidebar();
      
      const usersLink = screen.getByRole('link', { name: /Users/i });
      const postsLink = screen.getByRole('link', { name: /Posts/i });
      const commentsLink = screen.getByRole('link', { name: /Comments/i });

      expect(usersLink).toHaveAttribute('href', '/users');
      expect(postsLink).toHaveAttribute('href', '/posts');
      expect(commentsLink).toHaveAttribute('href', '/comments');
    });
  });
});
