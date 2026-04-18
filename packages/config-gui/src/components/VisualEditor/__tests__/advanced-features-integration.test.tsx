import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, within } from '@testing-library/react';
import { PrecedencePanel, type AnnotationLevel, type ElementInfo } from '../Panels/PrecedencePanel.js';
import { ReferencesPanel, type SchemaReference } from '../Panels/ReferencesPanel.js';
import { OverrideButton } from '../IgnoreControls/OverrideButton.js';
import { ShowPrunedToggle } from '../ShowPrunedToggle.js';

/**
 * Integration tests for advanced features
 * 
 * Tests the interaction between:
 * - PrecedencePanel (annotation hierarchy visualization)
 * - ReferencesPanel (schema reference tracking)
 * - OverrideButton (parent ignore override)
 * - ShowPrunedToggle (pruned elements visibility)
 * 
 * Requirements: 5.1-5.5, 7.1-7.5, 8.1-8.5, 14.1-14.5
 */

describe('Advanced Features Integration', () => {
  // Mock localStorage
  const localStorageMock = (() => {
    let store: Record<string, string> = {};
    
    return {
      getItem: (key: string) => store[key] || null,
      setItem: (key: string, value: string) => {
        store[key] = value;
      },
      clear: () => {
        store = {};
      }
    };
  })();
  
  beforeEach(() => {
    localStorageMock.clear();
    Object.defineProperty(window, 'localStorage', {
      value: localStorageMock,
      writable: true
    });
  });

  describe('PrecedencePanel Integration (Requirements 5.1-5.5)', () => {
    it('should display annotation hierarchy with multiple levels', () => {
      const selectedElement: ElementInfo = {
        path: 'components.schemas.User.properties.email',
        type: 'property',
        name: 'email'
      };

      const hierarchy: AnnotationLevel[] = [
        {
          level: 'property',
          path: 'components.schemas.User.properties.email',
          annotation: false,
          isActive: true,
          displayName: 'Property Level'
        },
        {
          level: 'schema',
          path: 'components.schemas.User',
          annotation: true,
          isActive: false,
          displayName: 'Schema Level'
        },
        {
          level: 'operation',
          path: 'paths./users.post',
          annotation: undefined,
          isActive: false,
          displayName: 'Operation Level'
        }
      ];

      render(
        <PrecedencePanel
          selectedElement={selectedElement}
          annotationHierarchy={hierarchy}
        />
      );

      expect(screen.getByText('Annotation Precedence')).toBeInTheDocument();
      expect(screen.getByText('Property Level')).toBeInTheDocument();
      expect(screen.getByText('Schema Level')).toBeInTheDocument();
      expect(screen.getByText('Operation Level')).toBeInTheDocument();
    });

    it('should highlight active annotation level', () => {
      const selectedElement: ElementInfo = {
        path: 'components.schemas.User.properties.email',
        type: 'property',
        name: 'email'
      };

      const hierarchy: AnnotationLevel[] = [
        {
          level: 'property',
          path: 'components.schemas.User.properties.email',
          annotation: false,
          isActive: true,
          displayName: 'Property Level'
        },
        {
          level: 'schema',
          path: 'components.schemas.User',
          annotation: true,
          isActive: false,
          displayName: 'Schema Level'
        }
      ];

      render(
        <PrecedencePanel
          selectedElement={selectedElement}
          annotationHierarchy={hierarchy}
        />
      );

      const levels = screen.getAllByTestId('precedence-level-row');
      expect(levels[0].className).toContain('bg-blue-50');
      expect(levels[0].className).toContain('border-blue-300');
    });

    it('should navigate to level on click', () => {
      const onNavigate = vi.fn();
      const selectedElement: ElementInfo = {
        path: 'components.schemas.User.properties.email',
        type: 'property',
        name: 'email'
      };

      const hierarchy: AnnotationLevel[] = [
        {
          level: 'property',
          path: 'components.schemas.User.properties.email',
          annotation: false,
          isActive: true,
          displayName: 'Property Level'
        },
        {
          level: 'schema',
          path: 'components.schemas.User',
          annotation: true,
          isActive: false,
          displayName: 'Schema Level'
        }
      ];

      render(
        <PrecedencePanel
          selectedElement={selectedElement}
          annotationHierarchy={hierarchy}
          onNavigate={onNavigate}
        />
      );

      const levels = screen.getAllByTestId('precedence-level-row');
      fireEvent.click(levels[1]);

      expect(onNavigate).toHaveBeenCalledWith('components.schemas.User');
    });

    it('should show default message when no annotations exist', () => {
      const selectedElement: ElementInfo = {
        path: 'components.schemas.User.properties.email',
        type: 'property',
        name: 'email'
      };

      render(
        <PrecedencePanel
          selectedElement={selectedElement}
          annotationHierarchy={[]}
        />
      );

      expect(screen.getByText('Default: Included (no annotations)')).toBeInTheDocument();
    });
  });

  describe('ReferencesPanel Integration (Requirements 14.1-14.5)', () => {
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
        type: 'property',
        path: 'components.schemas.Profile.properties.user',
        displayName: 'Profile.user',
        isIgnored: false
      }
    ];

    it('should display schema references with impact summary', () => {
      render(
        <ReferencesPanel
          selectedSchema={mockSchema}
          references={mockReferences}
        />
      );

      expect(screen.getByText('Schema References')).toBeInTheDocument();
      expect(screen.getByText('User')).toBeInTheDocument();
      
      const impactSummary = screen.getByTestId('impact-summary');
      expect(within(impactSummary).getByTestId('operations-count')).toHaveTextContent('2');
      expect(within(impactSummary).getByTestId('properties-count')).toHaveTextContent('1');
    });

    it('should navigate to reference on click', () => {
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

    it('should show ignored references with visual indicator', () => {
      const referencesWithIgnored: SchemaReference[] = [
        ...mockReferences,
        {
          type: 'response',
          path: 'paths./users/{id}.get.responses.200',
          displayName: 'GET /users/{id}',
          method: 'GET',
          statusCode: '200',
          isIgnored: true
        }
      ];

      render(
        <ReferencesPanel
          selectedSchema={mockSchema}
          references={referencesWithIgnored}
        />
      );

      const ignoredIndicators = screen.getAllByTestId('ignored-indicator');
      expect(ignoredIndicators).toHaveLength(1);
    });
  });

  describe('OverrideButton Integration (Requirements 7.1-7.5)', () => {
    it('should display override button for child of ignored parent', () => {
      render(
        <OverrideButton
          elementPath="components.schemas.User.properties.email"
          elementName="email"
          parentName="User"
          hasOverride={false}
          onOverride={vi.fn()}
        />
      );

      expect(screen.getByTestId('override-button')).toBeInTheDocument();
      expect(screen.getByText('Override')).toBeInTheDocument();
    });

    it('should call onOverride when clicked', () => {
      const onOverride = vi.fn();

      render(
        <OverrideButton
          elementPath="components.schemas.User.properties.email"
          elementName="email"
          parentName="User"
          hasOverride={false}
          onOverride={onOverride}
        />
      );

      const button = screen.getByTestId('override-button');
      fireEvent.click(button);

      expect(onOverride).toHaveBeenCalledTimes(1);
    });

    it('should show remove override when override exists', () => {
      render(
        <OverrideButton
          elementPath="components.schemas.User.properties.email"
          elementName="email"
          parentName="User"
          hasOverride={true}
          onOverride={vi.fn()}
        />
      );

      expect(screen.getByText('Remove Override')).toBeInTheDocument();
    });

    it('should have different styling for override vs no override', () => {
      const { rerender } = render(
        <OverrideButton
          elementPath="components.schemas.User.properties.email"
          elementName="email"
          parentName="User"
          hasOverride={false}
          onOverride={vi.fn()}
        />
      );

      const button = screen.getByTestId('override-button');
      expect(button.className).toContain('bg-gray-100');

      rerender(
        <OverrideButton
          elementPath="components.schemas.User.properties.email"
          elementName="email"
          parentName="User"
          hasOverride={true}
          onOverride={vi.fn()}
        />
      );

      expect(button.className).toContain('bg-blue-100');
    });
  });

  describe('ShowPrunedToggle Integration (Requirements 8.1-8.5)', () => {
    it('should toggle pruned elements visibility', () => {
      const onChange = vi.fn();

      render(<ShowPrunedToggle onChange={onChange} />);

      const toggle = screen.getByTestId('show-pruned-toggle-switch');
      
      // Initial call on mount
      expect(onChange).toHaveBeenCalledWith(true);
      
      onChange.mockClear();
      
      // Toggle off
      fireEvent.click(toggle);
      expect(onChange).toHaveBeenCalledWith(false);
      
      // Toggle on
      fireEvent.click(toggle);
      expect(onChange).toHaveBeenCalledWith(true);
    });

    it('should persist state in local storage', () => {
      const onChange = vi.fn();

      render(<ShowPrunedToggle onChange={onChange} />);

      const toggle = screen.getByTestId('show-pruned-toggle-switch');
      fireEvent.click(toggle);

      expect(localStorageMock.getItem('uigen-show-pruned-elements')).toBe('false');
    });

    it('should load state from local storage on mount', () => {
      localStorageMock.setItem('uigen-show-pruned-elements', 'false');

      const onChange = vi.fn();
      render(<ShowPrunedToggle onChange={onChange} />);

      expect(onChange).toHaveBeenCalledWith(false);
      expect(screen.getByTestId('show-pruned-toggle-switch')).toHaveAttribute('aria-checked', 'false');
    });

    it('should update icon when toggled', () => {
      render(<ShowPrunedToggle onChange={vi.fn()} initialValue={true} />);

      expect(screen.getByTestId('eye-icon')).toBeInTheDocument();

      const toggle = screen.getByTestId('show-pruned-toggle-switch');
      fireEvent.click(toggle);

      expect(screen.getByTestId('eye-off-icon')).toBeInTheDocument();
      expect(screen.queryByTestId('eye-icon')).not.toBeInTheDocument();
    });
  });

  describe('Cross-Feature Integration', () => {
    it('should coordinate PrecedencePanel and OverrideButton for override scenario', () => {
      const onNavigate = vi.fn();
      const onOverride = vi.fn();

      const selectedElement: ElementInfo = {
        path: 'components.schemas.User.properties.email',
        type: 'property',
        name: 'email'
      };

      // Scenario: Property has override (false) while schema has ignore (true)
      const hierarchy: AnnotationLevel[] = [
        {
          level: 'property',
          path: 'components.schemas.User.properties.email',
          annotation: false,
          isActive: true,
          displayName: 'Property Level'
        },
        {
          level: 'schema',
          path: 'components.schemas.User',
          annotation: true,
          isActive: false,
          displayName: 'Schema Level'
        }
      ];

      const { container } = render(
        <div>
          <PrecedencePanel
            selectedElement={selectedElement}
            annotationHierarchy={hierarchy}
            onNavigate={onNavigate}
          />
          <OverrideButton
            elementPath="components.schemas.User.properties.email"
            elementName="email"
            parentName="User"
            hasOverride={true}
            onOverride={onOverride}
          />
        </div>
      );

      // Verify precedence panel shows override at property level
      const propertyLevel = screen.getByText('Property Level');
      expect(propertyLevel).toBeInTheDocument();
      
      // Verify override button shows remove override
      expect(screen.getByText('Remove Override')).toBeInTheDocument();
      
      // Click override button
      const overrideButton = screen.getByTestId('override-button');
      fireEvent.click(overrideButton);
      
      expect(onOverride).toHaveBeenCalled();
    });

    it('should coordinate ReferencesPanel and ShowPrunedToggle for visibility control', () => {
      const onNavigate = vi.fn();
      const onShowPrunedChange = vi.fn();

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
          isIgnored: true
        }
      ];

      render(
        <div>
          <ShowPrunedToggle onChange={onShowPrunedChange} />
          <ReferencesPanel
            selectedSchema={mockSchema}
            references={mockReferences}
            onNavigate={onNavigate}
          />
        </div>
      );

      // Verify both components render
      expect(screen.getByTestId('show-pruned-toggle-container')).toBeInTheDocument();
      expect(screen.getByTestId('references-panel')).toBeInTheDocument();
      
      // Verify ignored reference is shown
      expect(screen.getByTestId('ignored-indicator')).toBeInTheDocument();
      
      // Toggle show pruned
      const toggle = screen.getByTestId('show-pruned-toggle-switch');
      fireEvent.click(toggle);
      
      expect(onShowPrunedChange).toHaveBeenCalledWith(false);
    });

    it('should handle complex workflow: precedence → override → references', () => {
      const onNavigate = vi.fn();
      const onOverride = vi.fn();

      const selectedElement: ElementInfo = {
        path: 'components.schemas.User.properties.email',
        type: 'property',
        name: 'email'
      };

      // Complex scenario: Schema is ignored, property overrides, check references
      const hierarchy: AnnotationLevel[] = [
        {
          level: 'property',
          path: 'components.schemas.User.properties.email',
          annotation: false,
          isActive: true,
          displayName: 'Property Level'
        },
        {
          level: 'schema',
          path: 'components.schemas.User',
          annotation: true,
          isActive: false,
          displayName: 'Schema Level'
        }
      ];

      const mockSchema = {
        path: 'components.schemas.User',
        name: 'User'
      };

      const mockReferences: SchemaReference[] = [
        {
          type: 'property',
          path: 'components.schemas.User.properties.email',
          displayName: 'User.email',
          isIgnored: false
        }
      ];

      render(
        <div>
          <PrecedencePanel
            selectedElement={selectedElement}
            annotationHierarchy={hierarchy}
            onNavigate={onNavigate}
          />
          <OverrideButton
            elementPath="components.schemas.User.properties.email"
            elementName="email"
            parentName="User"
            hasOverride={true}
            onOverride={onOverride}
          />
          <ReferencesPanel
            selectedSchema={mockSchema}
            references={mockReferences}
            onNavigate={onNavigate}
          />
        </div>
      );

      // Step 1: Verify precedence shows override
      expect(screen.getByText('Property Level')).toBeInTheDocument();
      expect(screen.getByText('Schema Level')).toBeInTheDocument();
      
      // Step 2: Verify override button is present
      expect(screen.getByText('Remove Override')).toBeInTheDocument();
      
      // Step 3: Verify references show the property
      expect(screen.getByText('User.email')).toBeInTheDocument();
      
      // Step 4: Navigate from precedence panel
      const levels = screen.getAllByTestId('precedence-level-row');
      fireEvent.click(levels[1]);
      expect(onNavigate).toHaveBeenCalledWith('components.schemas.User');
      
      // Step 5: Remove override
      const overrideButton = screen.getByTestId('override-button');
      fireEvent.click(overrideButton);
      expect(onOverride).toHaveBeenCalled();
    });

    it('should maintain state consistency across all features', () => {
      const onNavigate = vi.fn();
      const onOverride = vi.fn();
      const onShowPrunedChange = vi.fn();

      const hierarchy: AnnotationLevel[] = [
        {
          level: 'property',
          path: 'components.schemas.User.properties.email',
          annotation: false,
          isActive: true,
          displayName: 'Property Level'
        }
      ];

      const selectedElement = {
        path: 'components.schemas.User.properties.email',
        type: 'property' as const,
        name: 'email'
      };

      const mockSchema = {
        path: 'components.schemas.User',
        name: 'User'
      };

      const mockReferences: SchemaReference[] = [
        {
          type: 'property',
          path: 'components.schemas.User.properties.email',
          displayName: 'User.email',
          isIgnored: false
        }
      ];

      render(
        <div>
          <ShowPrunedToggle onChange={onShowPrunedChange} />
          <PrecedencePanel
            selectedElement={selectedElement}
            annotationHierarchy={hierarchy}
            onNavigate={onNavigate}
          />
          <OverrideButton
            elementPath="components.schemas.User.properties.email"
            elementName="email"
            parentName="User"
            hasOverride={true}
            onOverride={onOverride}
          />
          <ReferencesPanel
            selectedSchema={mockSchema}
            references={mockReferences}
            onNavigate={onNavigate}
          />
        </div>
      );

      // All features should be present and functional
      expect(screen.getByTestId('show-pruned-toggle-container')).toBeInTheDocument();
      expect(screen.getByTestId('precedence-panel')).toBeInTheDocument();
      expect(screen.getByTestId('override-button')).toBeInTheDocument();
      expect(screen.getByTestId('references-panel')).toBeInTheDocument();
      
      // Interact with each feature
      fireEvent.click(screen.getByTestId('show-pruned-toggle-switch'));
      expect(onShowPrunedChange).toHaveBeenCalled();
      
      fireEvent.click(screen.getAllByTestId('precedence-level-row')[0]);
      expect(onNavigate).toHaveBeenCalled();
      
      fireEvent.click(screen.getByTestId('override-button'));
      expect(onOverride).toHaveBeenCalled();
      
      fireEvent.click(screen.getAllByTestId('reference-item')[0]);
      expect(onNavigate).toHaveBeenCalledTimes(2);
    });
  });
});
