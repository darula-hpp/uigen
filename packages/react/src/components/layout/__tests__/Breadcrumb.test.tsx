import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/react';
import { BrowserRouter, Routes, Route, MemoryRouter } from 'react-router-dom';
import { Breadcrumb } from '../Breadcrumb';
import type { UIGenApp } from '@uigen/core';

const mockConfig: UIGenApp = {
  meta: { title: 'Test API', version: '1.0.0' },
  resources: [
    {
      name: 'Users',
      slug: 'users',
      operations: [],
      schema: { type: 'object', key: 'User', label: 'User', required: false },
      relationships: [],
    },
  ],
  auth: { schemes: [], globalRequired: false },
  dashboard: {},
  servers: [{ url: 'https://api.example.com' }],
};

describe('Breadcrumb', () => {
  describe('Requirements 59.1-59.5: Breadcrumb navigation', () => {
    it('should render breadcrumb component within routing context', () => {
      const { container } = render(
        <MemoryRouter initialEntries={['/users']}>
          <Routes>
            <Route path="/:resource" element={<Breadcrumb config={mockConfig} />} />
          </Routes>
        </MemoryRouter>
      );
      
      // Component should render a nav element
      const nav = container.querySelector('nav');
      expect(nav).toBeInTheDocument();
    });

    it('should not render when on root path', () => {
      const { container } = render(
        <MemoryRouter initialEntries={['/']}>
          <Routes>
            <Route path="/" element={<Breadcrumb config={mockConfig} />} />
          </Routes>
        </MemoryRouter>
      );
      
      const nav = container.querySelector('nav');
      expect(nav).not.toBeInTheDocument();
    });

    it('should not render for unknown resources', () => {
      const { container } = render(
        <MemoryRouter initialEntries={['/unknown']}>
          <Routes>
            <Route path="/:resource" element={<Breadcrumb config={mockConfig} />} />
          </Routes>
        </MemoryRouter>
      );
      
      const nav = container.querySelector('nav');
      expect(nav).not.toBeInTheDocument();
    });
  });
});
