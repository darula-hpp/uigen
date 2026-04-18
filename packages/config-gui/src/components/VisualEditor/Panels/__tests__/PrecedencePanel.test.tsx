import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { PrecedencePanel, type AnnotationLevel, type ElementInfo } from '../PrecedencePanel.js';

/**
 * Unit tests for PrecedencePanel component
 * 
 * Requirements: 5.1, 5.2, 5.3, 5.4, 5.5
 */

describe('PrecedencePanel', () => {
  const mockElementInfo: ElementInfo = {
    path: 'components.schemas.User.properties.email',
    type: 'property',
    name: 'email'
  };

  const mockHierarchyWithAnnotations: AnnotationLevel[] = [
    {
      level: 'property',
      path: 'components.schemas.User.properties.email',
      annotation: true,
      isActive: true,
      displayName: 'Property: email'
    },
    {
      level: 'schema',
      path: 'components.schemas.User',
      annotation: undefined,
      isActive: false,
      displayName: 'Schema: User'
    },
    {
      level: 'operation',
      path: 'paths./users.post',
      annotation: false,
      isActive: false,
      displayName: 'Operation: post'
    }
  ];

  const mockHierarchyNoAnnotations: AnnotationLevel[] = [
    {
      level: 'property',
      path: 'components.schemas.User.properties.email',
      annotation: undefined,
      isActive: false,
      displayName: 'Property: email'
    },
    {
      level: 'schema',
      path: 'components.schemas.User',
      annotation: undefined,
      isActive: false,
      displayName: 'Schema: User'
    }
  ];

  describe('Empty State (Requirement 5.1)', () => {
    it('should show empty state when no element is selected', () => {
      render(
        <PrecedencePanel
          selectedElement={null}
          annotationHierarchy={[]}
        />
      );

      expect(screen.getByTestId('precedence-panel-empty')).toBeInTheDocument();
      expect(screen.getByText('Select an element to view its annotation precedence')).toBeInTheDocument();
    });

    it('should not show precedence levels when no element is selected', () => {
      render(
        <PrecedencePanel
          selectedElement={null}
          annotationHierarchy={[]}
        />
      );

      expect(screen.queryByTestId('precedence-level-row')).not.toBeInTheDocument();
    });
  });

  describe('Default State (Requirement 5.5)', () => {
    it('should display default message when no annotations exist', () => {
      render(
        <PrecedencePanel
          selectedElement={mockElementInfo}
          annotationHierarchy={mockHierarchyNoAnnotations}
        />
      );

      expect(screen.getByTestId('precedence-default-message')).toBeInTheDocument();
      expect(screen.getByText('Default: Included (no annotations)')).toBeInTheDocument();
    });

    it('should not display precedence levels when no annotations exist', () => {
      render(
        <PrecedencePanel
          selectedElement={mockElementInfo}
          annotationHierarchy={mockHierarchyNoAnnotations}
        />
      );

      expect(screen.queryByTestId('precedence-level-row')).not.toBeInTheDocument();
    });
  });

  describe('Hierarchy Display (Requirement 5.2)', () => {
    it('should display all levels in precedence order', () => {
      render(
        <PrecedencePanel
          selectedElement={mockElementInfo}
          annotationHierarchy={mockHierarchyWithAnnotations}
        />
      );

      const rows = screen.getAllByTestId('precedence-level-row');
      expect(rows).toHaveLength(3);

      // Check order: property > schema > operation
      expect(rows[0]).toHaveAttribute('data-level', 'property');
      expect(rows[1]).toHaveAttribute('data-level', 'schema');
      expect(rows[2]).toHaveAttribute('data-level', 'operation');
    });

    it('should display level names correctly', () => {
      render(
        <PrecedencePanel
          selectedElement={mockElementInfo}
          annotationHierarchy={mockHierarchyWithAnnotations}
        />
      );

      expect(screen.getByText('Property: email')).toBeInTheDocument();
      expect(screen.getByText('Schema: User')).toBeInTheDocument();
      expect(screen.getByText('Operation: post')).toBeInTheDocument();
    });

    it('should display element paths', () => {
      render(
        <PrecedencePanel
          selectedElement={mockElementInfo}
          annotationHierarchy={mockHierarchyWithAnnotations}
        />
      );

      expect(screen.getByText('components.schemas.User.properties.email')).toBeInTheDocument();
      expect(screen.getByText('components.schemas.User')).toBeInTheDocument();
      expect(screen.getByText('paths./users.post')).toBeInTheDocument();
    });
  });

  describe('Annotation Values (Requirement 5.3)', () => {
    it('should display "Ignored" for true annotations', () => {
      render(
        <PrecedencePanel
          selectedElement={mockElementInfo}
          annotationHierarchy={mockHierarchyWithAnnotations}
        />
      );

      const rows = screen.getAllByTestId('precedence-level-row');
      const propertyRow = rows[0];

      expect(propertyRow.querySelector('[data-testid="annotation-ignored-icon"]')).toBeInTheDocument();
      expect(propertyRow.querySelector('[data-testid="annotation-value"]')).toHaveTextContent('Ignored');
    });

    it('should display "Included" for false annotations', () => {
      render(
        <PrecedencePanel
          selectedElement={mockElementInfo}
          annotationHierarchy={mockHierarchyWithAnnotations}
        />
      );

      const rows = screen.getAllByTestId('precedence-level-row');
      const operationRow = rows[2];

      expect(operationRow.querySelector('[data-testid="annotation-included-icon"]')).toBeInTheDocument();
      expect(operationRow.querySelector('[data-testid="annotation-value"]')).toHaveTextContent('Included');
    });

    it('should display "No annotation" for undefined annotations', () => {
      render(
        <PrecedencePanel
          selectedElement={mockElementInfo}
          annotationHierarchy={mockHierarchyWithAnnotations}
        />
      );

      const rows = screen.getAllByTestId('precedence-level-row');
      const schemaRow = rows[1];

      expect(schemaRow.querySelector('[data-testid="annotation-undefined-icon"]')).toBeInTheDocument();
      expect(schemaRow.querySelector('[data-testid="annotation-value"]')).toHaveTextContent('No annotation');
    });
  });

  describe('Active Level Highlighting (Requirement 5.4)', () => {
    it('should highlight the active annotation level', () => {
      render(
        <PrecedencePanel
          selectedElement={mockElementInfo}
          annotationHierarchy={mockHierarchyWithAnnotations}
        />
      );

      const rows = screen.getAllByTestId('precedence-level-row');
      
      // Property level should be active
      expect(rows[0]).toHaveAttribute('data-active', 'true');
      expect(rows[0].querySelector('[data-testid="active-indicator"]')).toBeInTheDocument();

      // Other levels should not be active
      expect(rows[1]).toHaveAttribute('data-active', 'false');
      expect(rows[2]).toHaveAttribute('data-active', 'false');
    });

    it('should apply distinct visual styling to active level', () => {
      render(
        <PrecedencePanel
          selectedElement={mockElementInfo}
          annotationHierarchy={mockHierarchyWithAnnotations}
        />
      );

      const rows = screen.getAllByTestId('precedence-level-row');
      
      // Active row should have blue background
      expect(rows[0].className).toContain('bg-blue-50');
      expect(rows[0].className).toContain('border-blue-300');

      // Inactive rows should have gray background
      expect(rows[1].className).toContain('bg-gray-50');
      expect(rows[2].className).toContain('bg-gray-50');
    });

    it('should mark only the most specific annotation as active', () => {
      const hierarchyMultipleAnnotations: AnnotationLevel[] = [
        {
          level: 'property',
          path: 'components.schemas.User.properties.email',
          annotation: true,
          isActive: true,
          displayName: 'Property: email'
        },
        {
          level: 'schema',
          path: 'components.schemas.User',
          annotation: false,
          isActive: false,
          displayName: 'Schema: User'
        },
        {
          level: 'operation',
          path: 'paths./users.post',
          annotation: true,
          isActive: false,
          displayName: 'Operation: post'
        }
      ];

      render(
        <PrecedencePanel
          selectedElement={mockElementInfo}
          annotationHierarchy={hierarchyMultipleAnnotations}
        />
      );

      const activeRows = screen.getAllByTestId('precedence-level-row').filter(
        row => row.getAttribute('data-active') === 'true'
      );

      expect(activeRows).toHaveLength(1);
      expect(activeRows[0]).toHaveAttribute('data-level', 'property');
    });
  });

  describe('Navigation (Requirement 5.1)', () => {
    it('should call onNavigate when clicking a level with annotation', () => {
      const onNavigate = vi.fn();

      render(
        <PrecedencePanel
          selectedElement={mockElementInfo}
          annotationHierarchy={mockHierarchyWithAnnotations}
          onNavigate={onNavigate}
        />
      );

      const rows = screen.getAllByTestId('precedence-level-row');
      fireEvent.click(rows[0]); // Click property level (has annotation)

      expect(onNavigate).toHaveBeenCalledWith('components.schemas.User.properties.email');
    });

    it('should not call onNavigate when clicking a level without annotation', () => {
      const onNavigate = vi.fn();

      render(
        <PrecedencePanel
          selectedElement={mockElementInfo}
          annotationHierarchy={mockHierarchyWithAnnotations}
          onNavigate={onNavigate}
        />
      );

      const rows = screen.getAllByTestId('precedence-level-row');
      fireEvent.click(rows[1]); // Click schema level (no annotation)

      expect(onNavigate).not.toHaveBeenCalled();
    });

    it('should show navigate icon for levels with annotations when onNavigate is provided', () => {
      render(
        <PrecedencePanel
          selectedElement={mockElementInfo}
          annotationHierarchy={mockHierarchyWithAnnotations}
          onNavigate={vi.fn()}
        />
      );

      const rows = screen.getAllByTestId('precedence-level-row');
      
      // Property level (has annotation) should have navigate icon
      expect(rows[0].querySelector('[data-testid="navigate-icon"]')).toBeInTheDocument();

      // Schema level (no annotation) should not have navigate icon
      expect(rows[1].querySelector('[data-testid="navigate-icon"]')).not.toBeInTheDocument();
    });

    it('should not show navigate icon when onNavigate is not provided', () => {
      render(
        <PrecedencePanel
          selectedElement={mockElementInfo}
          annotationHierarchy={mockHierarchyWithAnnotations}
        />
      );

      const navigateIcons = screen.queryAllByTestId('navigate-icon');
      expect(navigateIcons).toHaveLength(0);
    });

    it('should support keyboard navigation with Enter key', () => {
      const onNavigate = vi.fn();

      render(
        <PrecedencePanel
          selectedElement={mockElementInfo}
          annotationHierarchy={mockHierarchyWithAnnotations}
          onNavigate={onNavigate}
        />
      );

      const rows = screen.getAllByTestId('precedence-level-row');
      fireEvent.keyDown(rows[0], { key: 'Enter' });

      expect(onNavigate).toHaveBeenCalledWith('components.schemas.User.properties.email');
    });

    it('should support keyboard navigation with Space key', () => {
      const onNavigate = vi.fn();

      render(
        <PrecedencePanel
          selectedElement={mockElementInfo}
          annotationHierarchy={mockHierarchyWithAnnotations}
          onNavigate={onNavigate}
        />
      );

      const rows = screen.getAllByTestId('precedence-level-row');
      fireEvent.keyDown(rows[0], { key: ' ' });

      expect(onNavigate).toHaveBeenCalledWith('components.schemas.User.properties.email');
    });
  });

  describe('Accessibility', () => {
    it('should have proper role for clickable levels', () => {
      render(
        <PrecedencePanel
          selectedElement={mockElementInfo}
          annotationHierarchy={mockHierarchyWithAnnotations}
          onNavigate={vi.fn()}
        />
      );

      const rows = screen.getAllByTestId('precedence-level-row');
      
      // Level with annotation should be a button
      expect(rows[0]).toHaveAttribute('role', 'button');
      expect(rows[0]).toHaveAttribute('tabIndex', '0');

      // Level without annotation should not be a button
      expect(rows[1]).not.toHaveAttribute('role');
    });

    it('should have aria-label for active indicator', () => {
      render(
        <PrecedencePanel
          selectedElement={mockElementInfo}
          annotationHierarchy={mockHierarchyWithAnnotations}
        />
      );

      const activeIndicator = screen.getByTestId('active-indicator');
      expect(activeIndicator).toHaveAttribute('aria-label', 'Active annotation level');
    });
  });

  describe('Edge Cases', () => {
    it('should handle single level hierarchy', () => {
      const singleLevel: AnnotationLevel[] = [
        {
          level: 'operation',
          path: 'paths./users.get',
          annotation: true,
          isActive: true,
          displayName: 'Operation: get'
        }
      ];

      render(
        <PrecedencePanel
          selectedElement={mockElementInfo}
          annotationHierarchy={singleLevel}
        />
      );

      const rows = screen.getAllByTestId('precedence-level-row');
      expect(rows).toHaveLength(1);
      expect(rows[0]).toHaveAttribute('data-active', 'true');
    });

    it('should handle empty hierarchy array', () => {
      render(
        <PrecedencePanel
          selectedElement={mockElementInfo}
          annotationHierarchy={[]}
        />
      );

      expect(screen.getByTestId('precedence-default-message')).toBeInTheDocument();
    });

    it('should display element name in header', () => {
      render(
        <PrecedencePanel
          selectedElement={mockElementInfo}
          annotationHierarchy={mockHierarchyWithAnnotations}
        />
      );

      expect(screen.getByText('email')).toBeInTheDocument();
      expect(screen.getByText('Annotation Precedence')).toBeInTheDocument();
    });
  });
});
