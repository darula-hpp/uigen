import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor, act } from '@testing-library/react';
import { PreviewRenderer } from '../PreviewRenderer.js';
import { AppProvider } from '../../../contexts/AppContext.js';
import type { SpecStructure } from '../../../types/index.js';

describe('PreviewRenderer', () => {
  const mockStructure: SpecStructure = {
    resources: [
      {
        name: 'User',
        slug: 'User',
        uigenId: 'user-resource',
        operations: [],
        fields: [
          {
            key: 'id',
            label: 'ID',
            type: 'string',
            path: 'User.id',
            required: true,
            annotations: {}
          },
          {
            key: 'name',
            label: 'Name',
            type: 'string',
            path: 'User.name',
            required: true,
            annotations: {}
          },
          {
            key: 'email',
            label: 'Email',
            type: 'string',
            path: 'User.email',
            required: false,
            annotations: {}
          }
        ],
        annotations: {}
      }
    ]
  };

  const renderWithProvider = (structure: SpecStructure | null) => {
    return render(
      <AppProvider>
        <PreviewRenderer structure={structure} />
      </AppProvider>
    );
  };

  describe('Empty State', () => {
    it('should show empty state when structure is null', () => {
      renderWithProvider(null);
      expect(screen.getByText('No preview available')).toBeInTheDocument();
      expect(screen.getByText('Load a spec file to see a preview of the generated UI.')).toBeInTheDocument();
    });
  });

  describe('Preview Rendering', () => {
    it('should render preview with structure', async () => {
      renderWithProvider(mockStructure);
      
      // Wait for debounce to complete
      await waitFor(() => {
        expect(screen.getByTestId('preview-renderer')).toBeInTheDocument();
      }, { timeout: 1000 });
    });

    it('should show loading state during debounce', () => {
      renderWithProvider(mockStructure);
      
      expect(screen.getByText('Updating preview...')).toBeInTheDocument();
    });

    it('should render form view preview', async () => {
      renderWithProvider(mockStructure);
      
      await waitFor(() => {
        expect(screen.getByText('Form View')).toBeInTheDocument();
        expect(screen.getByText('How fields appear in create/edit forms')).toBeInTheDocument();
      }, { timeout: 1000 });
    });

    it('should render list view preview', async () => {
      renderWithProvider(mockStructure);
      
      await waitFor(() => {
        expect(screen.getByText('List View')).toBeInTheDocument();
        expect(screen.getByText('How fields appear in list tables')).toBeInTheDocument();
      }, { timeout: 1000 });
    });

    it('should render detail view preview', async () => {
      renderWithProvider(mockStructure);
      
      await waitFor(() => {
        expect(screen.getByText('Detail View')).toBeInTheDocument();
        expect(screen.getByText('How fields appear in detail pages')).toBeInTheDocument();
      }, { timeout: 1000 });
    });
  });

  describe('Field Rendering', () => {
    it('should render field labels', async () => {
      renderWithProvider(mockStructure);
      
      await waitFor(() => {
        expect(screen.getAllByText('ID').length).toBeGreaterThan(0);
        expect(screen.getAllByText('Name').length).toBeGreaterThan(0);
        expect(screen.getAllByText('Email').length).toBeGreaterThan(0);
      }, { timeout: 1000 });
    });

    it('should show required indicator for required fields', async () => {
      renderWithProvider(mockStructure);
      
      await waitFor(() => {
        const requiredIndicators = screen.getAllByText('*');
        expect(requiredIndicators.length).toBeGreaterThan(0);
      }, { timeout: 1000 });
    });
  });

  describe('Error Handling', () => {
    it('should handle preview generation errors gracefully', async () => {
      // Create structure that will cause an error
      const invalidStructure: SpecStructure = {
        resources: []
      };
      
      renderWithProvider(invalidStructure);
      
      await waitFor(() => {
        // Should still render without crashing
        expect(screen.getByTestId('preview-renderer')).toBeInTheDocument();
      }, { timeout: 1000 });
    });
  });
});
