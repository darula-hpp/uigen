import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, within } from '@testing-library/react';
import { ReferencesPanel, type SchemaReference } from '../ReferencesPanel.js';

/**
 * Unit tests for ReferencesPanel component
 * 
 * Requirements: 14.1, 14.2, 14.3, 14.4, 14.5
 */

describe('ReferencesPanel', () => {
  const mockSchema = {
    path: 'components.schemas.User',
    name: 'User'
  };

  const mockReferences: SchemaReference[] = [
    {
      type: 'requestBody',
      path: 'paths./users.post.requestBody',
      displayName: 'POST /users',
      method: 'POST',
      isIgnored: false
    },
    {
      type: 'response',
      path: 'paths./users.get.responses.200',
      displayName: 'GET /users',
      method: 'GET',
      statusCode: '200',
      isIgnored: false
    },
    {
      type: 'response',
      path: 'paths./users/{id}.get.responses.200',
      displayName: 'GET /users/{id}',
      method: 'GET',
      statusCode: '200',
      isIgnored: true
    },
    {
      type: 'property',
      path: 'components.schemas.Profile.properties.user',
      displayName: 'Profile.user',
      isIgnored: false
    }
  ];

  describe('Empty State (Requirement 14.1)', () => {
    it('should show empty state when no schema is selected', () => {
      render(
        <ReferencesPanel
          selectedSchema={null}
          references={[]}
        />
      );

      expect(screen.getByTestId('references-panel-empty')).toBeInTheDocument();
      expect(screen.getByText('Select a schema to view its references')).toBeInTheDocument();
    });

    it('should not show references when no schema is selected', () => {
      render(
        <ReferencesPanel
          selectedSchema={null}
          references={mockReferences}
        />
      );

      expect(screen.queryByTestId('references-panel')).not.toBeInTheDocument();
    });
  });

  describe('Schema Selection (Requirement 14.1)', () => {
    it('should display selected schema name', () => {
      render(
        <ReferencesPanel
          selectedSchema={mockSchema}
          references={mockReferences}
        />
      );

      expect(screen.getByText('Schema References')).toBeInTheDocument();
      expect(screen.getByText('User')).toBeInTheDocument();
    });

    it('should show references panel when schema is selected', () => {
      render(
        <ReferencesPanel
          selectedSchema={mockSchema}
          references={mockReferences}
        />
      );

      expect(screen.getByTestId('references-panel')).toBeInTheDocument();
    });
  });

  describe('Impact Summary (Requirement 14.5)', () => {
    it('should display count of affected operations and properties', () => {
      render(
        <ReferencesPanel
          selectedSchema={mockSchema}
          references={mockReferences}
        />
      );

      const impactSummary = screen.getByTestId('impact-summary');
      const operationsCount = within(impactSummary).getByTestId('operations-count');
      const propertiesCount = within(impactSummary).getByTestId('properties-count');

      expect(operationsCount).toHaveTextContent('3'); // 1 request body + 2 responses
      expect(propertiesCount).toHaveTextContent('1');
    });

    it('should use singular form for single operation', () => {
      const singleRef: SchemaReference[] = [
        {
          type: 'requestBody',
          path: 'paths./users.post.requestBody',
          displayName: 'POST /users',
          method: 'POST',
          isIgnored: false
        }
      ];

      render(
        <ReferencesPanel
          selectedSchema={mockSchema}
          references={singleRef}
        />
      );

      const impactSummary = screen.getByTestId('impact-summary');
      expect(within(impactSummary).getByText((content, element) => {
        return element?.tagName === 'SPAN' && element?.textContent === '1 operation and 0 properties will be affected';
      })).toBeInTheDocument();
    });

    it('should use plural form for multiple operations', () => {
      render(
        <ReferencesPanel
          selectedSchema={mockSchema}
          references={mockReferences}
        />
      );

      const impactSummary = screen.getByTestId('impact-summary');
      expect(within(impactSummary).getByText((content, element) => {
        return element?.tagName === 'SPAN' && element?.textContent === '3 operations and 1 property will be affected';
      })).toBeInTheDocument();
    });

    it('should show "No references found" when no references exist', () => {
      render(
        <ReferencesPanel
          selectedSchema={mockSchema}
          references={[]}
        />
      );

      expect(screen.getByText('No references found')).toBeInTheDocument();
    });
  });

  describe('Reference Sections (Requirement 14.3)', () => {
    it('should display request body references section', () => {
      render(
        <ReferencesPanel
          selectedSchema={mockSchema}
          references={mockReferences}
        />
      );

      expect(screen.getByTestId('reference-section-request-bodies')).toBeInTheDocument();
      expect(screen.getByText('Request Bodies')).toBeInTheDocument();
      expect(screen.getByTestId('request-bodies-count')).toHaveTextContent('(1)');
    });

    it('should display responses references section', () => {
      render(
        <ReferencesPanel
          selectedSchema={mockSchema}
          references={mockReferences}
        />
      );

      expect(screen.getByTestId('reference-section-responses')).toBeInTheDocument();
      expect(screen.getByText('Responses')).toBeInTheDocument();
      expect(screen.getByTestId('responses-count')).toHaveTextContent('(2)');
    });

    it('should display properties references section', () => {
      render(
        <ReferencesPanel
          selectedSchema={mockSchema}
          references={mockReferences}
        />
      );

      const section = screen.getByTestId('reference-section-properties');
      expect(section).toBeInTheDocument();
      expect(screen.getByText('Properties')).toBeInTheDocument();
      expect(within(section).getByTestId('properties-count')).toHaveTextContent('(1)');
    });

    it('should not display sections with no references', () => {
      const onlyRequestBody: SchemaReference[] = [
        {
          type: 'requestBody',
          path: 'paths./users.post.requestBody',
          displayName: 'POST /users',
          method: 'POST',
          isIgnored: false
        }
      ];

      render(
        <ReferencesPanel
          selectedSchema={mockSchema}
          references={onlyRequestBody}
        />
      );

      expect(screen.getByTestId('reference-section-request-bodies')).toBeInTheDocument();
      expect(screen.queryByTestId('reference-section-responses')).not.toBeInTheDocument();
      expect(screen.queryByTestId('reference-section-properties')).not.toBeInTheDocument();
    });
  });

  describe('Reference Items Display (Requirement 14.3)', () => {
    it('should display reference name and path', () => {
      render(
        <ReferencesPanel
          selectedSchema={mockSchema}
          references={mockReferences}
        />
      );

      const items = screen.getAllByTestId('reference-item');
      expect(items).toHaveLength(4);

      // Check first item
      expect(screen.getByText('POST /users')).toBeInTheDocument();
      expect(screen.getByText('paths./users.post.requestBody')).toBeInTheDocument();
    });

    it('should display HTTP method badges for operations', () => {
      render(
        <ReferencesPanel
          selectedSchema={mockSchema}
          references={mockReferences}
        />
      );

      const methodBadges = screen.getAllByTestId('reference-method');
      expect(methodBadges).toHaveLength(3); // 1 POST + 2 GET

      expect(methodBadges[0]).toHaveTextContent('POST');
      expect(methodBadges[1]).toHaveTextContent('GET');
      expect(methodBadges[2]).toHaveTextContent('GET');
    });

    it('should display status code badges for responses', () => {
      render(
        <ReferencesPanel
          selectedSchema={mockSchema}
          references={mockReferences}
        />
      );

      const statusBadges = screen.getAllByTestId('reference-status-code');
      expect(statusBadges).toHaveLength(2);

      expect(statusBadges[0]).toHaveTextContent('200');
      expect(statusBadges[1]).toHaveTextContent('200');
    });

    it('should apply correct color to method badges', () => {
      render(
        <ReferencesPanel
          selectedSchema={mockSchema}
          references={mockReferences}
        />
      );

      const postBadge = screen.getAllByTestId('reference-method')[0];
      expect(postBadge.className).toContain('bg-blue-100');

      const getBadge = screen.getAllByTestId('reference-method')[1];
      expect(getBadge.className).toContain('bg-green-100');
    });

    it('should apply correct color to status code badges', () => {
      render(
        <ReferencesPanel
          selectedSchema={mockSchema}
          references={mockReferences}
        />
      );

      const statusBadges = screen.getAllByTestId('reference-status-code');
      // 200 status codes should be green
      expect(statusBadges[0].className).toContain('bg-green-100');
    });
  });

  describe('Ignored References (Requirement 14.2)', () => {
    it('should dim ignored references', () => {
      render(
        <ReferencesPanel
          selectedSchema={mockSchema}
          references={mockReferences}
        />
      );

      const items = screen.getAllByTestId('reference-item');
      
      // Third item is ignored
      expect(items[2].className).toContain('bg-red-50');
      expect(items[2].className).toContain('opacity-60');
    });

    it('should display ignored indicator for ignored references', () => {
      render(
        <ReferencesPanel
          selectedSchema={mockSchema}
          references={mockReferences}
        />
      );

      const ignoredIndicators = screen.getAllByTestId('ignored-indicator');
      expect(ignoredIndicators).toHaveLength(1);
    });

    it('should not display ignored indicator for active references', () => {
      const activeRefs: SchemaReference[] = [
        {
          type: 'requestBody',
          path: 'paths./users.post.requestBody',
          displayName: 'POST /users',
          method: 'POST',
          isIgnored: false
        }
      ];

      render(
        <ReferencesPanel
          selectedSchema={mockSchema}
          references={activeRefs}
        />
      );

      expect(screen.queryByTestId('ignored-indicator')).not.toBeInTheDocument();
    });
  });

  describe('Navigation (Requirement 14.4)', () => {
    it('should call onNavigate when clicking a reference', () => {
      const onNavigate = vi.fn();

      render(
        <ReferencesPanel
          selectedSchema={mockSchema}
          references={mockReferences}
          onNavigate={onNavigate}
        />
      );

      const items = screen.getAllByTestId('reference-item');
      fireEvent.click(items[0]);

      expect(onNavigate).toHaveBeenCalledWith('paths./users.post.requestBody');
    });

    it('should show navigate icon when onNavigate is provided', () => {
      render(
        <ReferencesPanel
          selectedSchema={mockSchema}
          references={mockReferences}
          onNavigate={vi.fn()}
        />
      );

      const navigateIcons = screen.getAllByTestId('navigate-icon');
      expect(navigateIcons).toHaveLength(4); // One for each reference
    });

    it('should not show navigate icon when onNavigate is not provided', () => {
      render(
        <ReferencesPanel
          selectedSchema={mockSchema}
          references={mockReferences}
        />
      );

      expect(screen.queryByTestId('navigate-icon')).not.toBeInTheDocument();
    });

    it('should support keyboard navigation with Enter key', () => {
      const onNavigate = vi.fn();

      render(
        <ReferencesPanel
          selectedSchema={mockSchema}
          references={mockReferences}
          onNavigate={onNavigate}
        />
      );

      const items = screen.getAllByTestId('reference-item');
      fireEvent.keyDown(items[0], { key: 'Enter' });

      expect(onNavigate).toHaveBeenCalledWith('paths./users.post.requestBody');
    });

    it('should support keyboard navigation with Space key', () => {
      const onNavigate = vi.fn();

      render(
        <ReferencesPanel
          selectedSchema={mockSchema}
          references={mockReferences}
          onNavigate={onNavigate}
        />
      );

      const items = screen.getAllByTestId('reference-item');
      fireEvent.keyDown(items[0], { key: ' ' });

      expect(onNavigate).toHaveBeenCalledWith('paths./users.post.requestBody');
    });
  });

  describe('Accessibility', () => {
    it('should have proper role for clickable references', () => {
      render(
        <ReferencesPanel
          selectedSchema={mockSchema}
          references={mockReferences}
          onNavigate={vi.fn()}
        />
      );

      const items = screen.getAllByTestId('reference-item');
      items.forEach(item => {
        expect(item).toHaveAttribute('role', 'button');
        expect(item).toHaveAttribute('tabIndex', '0');
      });
    });

    it('should not have button role when onNavigate is not provided', () => {
      render(
        <ReferencesPanel
          selectedSchema={mockSchema}
          references={mockReferences}
        />
      );

      const items = screen.getAllByTestId('reference-item');
      items.forEach(item => {
        expect(item).not.toHaveAttribute('role');
      });
    });

    it('should have aria-label for ignored indicator', () => {
      render(
        <ReferencesPanel
          selectedSchema={mockSchema}
          references={mockReferences}
        />
      );

      const ignoredIndicator = screen.getByTestId('ignored-indicator');
      expect(ignoredIndicator).toHaveAttribute('aria-label', 'Reference is ignored');
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty references array', () => {
      render(
        <ReferencesPanel
          selectedSchema={mockSchema}
          references={[]}
        />
      );

      expect(screen.getByText('No references found')).toBeInTheDocument();
      expect(screen.queryByTestId('reference-item')).not.toBeInTheDocument();
    });

    it('should handle references without method or status code', () => {
      const propertyOnly: SchemaReference[] = [
        {
          type: 'property',
          path: 'components.schemas.Profile.properties.user',
          displayName: 'Profile.user',
          isIgnored: false
        }
      ];

      render(
        <ReferencesPanel
          selectedSchema={mockSchema}
          references={propertyOnly}
        />
      );

      expect(screen.queryByTestId('reference-method')).not.toBeInTheDocument();
      expect(screen.queryByTestId('reference-status-code')).not.toBeInTheDocument();
    });

    it('should handle long paths with truncation', () => {
      const longPath: SchemaReference[] = [
        {
          type: 'property',
          path: 'components.schemas.VeryLongSchemaName.properties.veryLongPropertyName.properties.nestedProperty',
          displayName: 'VeryLongSchemaName.veryLongPropertyName.nestedProperty',
          isIgnored: false
        }
      ];

      render(
        <ReferencesPanel
          selectedSchema={mockSchema}
          references={longPath}
        />
      );

      const pathElement = screen.getByTestId('reference-path');
      expect(pathElement.className).toContain('truncate');
    });
  });
});
