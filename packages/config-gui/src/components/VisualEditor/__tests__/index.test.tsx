import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { VisualEditor } from '../index.js';
import { AppProvider } from '../../../contexts/AppContext.js';
import type { SpecStructure } from '../../../types/index.js';

describe('VisualEditor', () => {
  const mockStructure: SpecStructure = {
    resources: [
      {
        name: 'User',
        slug: 'User',
        uigenId: 'user-resource',
        operations: [
          {
            id: 'get-users',
            uigenId: 'get-users-op',
            method: 'GET',
            path: '/users',
            annotations: {}
          }
        ],
        fields: [
          {
            key: 'id',
            label: 'ID',
            type: 'string',
            path: 'User.id',
            required: true,
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
        <VisualEditor structure={structure} />
      </AppProvider>
    );
  };

  it('should show empty state when structure is null', () => {
    renderWithProvider(null);
    expect(screen.getByText('No spec loaded')).toBeInTheDocument();
  });

  it('should render visual editor with structure', () => {
    renderWithProvider(mockStructure);
    expect(screen.getByTestId('visual-editor')).toBeInTheDocument();
  });

  it('should render tabs', () => {
    renderWithProvider(mockStructure);
    expect(screen.getByTestId('structure-tab')).toBeInTheDocument();
    expect(screen.getByTestId('refs-tab')).toBeInTheDocument();
  });

  it('should render help text', () => {
    renderWithProvider(mockStructure);
    expect(screen.getByText('Visual Editor Tips')).toBeInTheDocument();
  });
});
