import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { AnnotationBadge } from '../AnnotationBadge.js';
import type { IgnoreState } from '../../../../types/index.js';

/**
 * Unit tests for AnnotationBadge component
 * 
 * Requirements: 3.1, 3.2, 3.3, 3.4, 3.5
 */
describe('AnnotationBadge', () => {
  describe('Badge Display', () => {
    it('should display "Explicit" badge for explicit annotations', () => {
      const ignoreState: IgnoreState = {
        explicit: true,
        effective: true,
        source: 'explicit',
        isOverride: false
      };
      
      render(<AnnotationBadge ignoreState={ignoreState} />);
      
      const badge = screen.getByTestId('annotation-badge');
      expect(badge).toBeInTheDocument();
      expect(badge).toHaveTextContent('Explicit');
    });
    
    it('should display "Inherited" badge for inherited state', () => {
      const ignoreState: IgnoreState = {
        explicit: undefined,
        effective: true,
        source: 'inherited',
        inheritedFrom: 'components.schemas.User',
        isOverride: false
      };
      
      render(<AnnotationBadge ignoreState={ignoreState} />);
      
      const badge = screen.getByTestId('annotation-badge');
      expect(badge).toBeInTheDocument();
      expect(badge).toHaveTextContent('Inherited');
    });
    
    it('should display "Override" badge for override annotations', () => {
      const ignoreState: IgnoreState = {
        explicit: false,
        effective: false,
        source: 'explicit',
        isOverride: true
      };
      
      render(<AnnotationBadge ignoreState={ignoreState} />);
      
      const badge = screen.getByTestId('annotation-badge');
      expect(badge).toBeInTheDocument();
      expect(badge).toHaveTextContent('Override');
    });
    
    it('should not display badge for default state', () => {
      const ignoreState: IgnoreState = {
        explicit: undefined,
        effective: false,
        source: 'default',
        isOverride: false
      };
      
      render(<AnnotationBadge ignoreState={ignoreState} />);
      
      const badge = screen.queryByTestId('annotation-badge');
      expect(badge).not.toBeInTheDocument();
    });
  });
  
  describe('Badge Colors', () => {
    it('should use purple color for Override badge', () => {
      const ignoreState: IgnoreState = {
        explicit: false,
        effective: false,
        source: 'explicit',
        isOverride: true
      };
      
      render(<AnnotationBadge ignoreState={ignoreState} />);
      
      const badge = screen.getByTestId('annotation-badge');
      expect(badge).toHaveClass('bg-purple-100');
      expect(badge).toHaveClass('text-purple-800');
    });
    
    it('should use blue color for Explicit badge', () => {
      const ignoreState: IgnoreState = {
        explicit: true,
        effective: true,
        source: 'explicit',
        isOverride: false
      };
      
      render(<AnnotationBadge ignoreState={ignoreState} />);
      
      const badge = screen.getByTestId('annotation-badge');
      expect(badge).toHaveClass('bg-blue-100');
      expect(badge).toHaveClass('text-blue-800');
    });
    
    it('should use amber color for Inherited badge', () => {
      const ignoreState: IgnoreState = {
        explicit: undefined,
        effective: true,
        source: 'inherited',
        inheritedFrom: 'components.schemas.User',
        isOverride: false
      };
      
      render(<AnnotationBadge ignoreState={ignoreState} />);
      
      const badge = screen.getByTestId('annotation-badge');
      expect(badge).toHaveClass('bg-amber-100');
      expect(badge).toHaveClass('text-amber-800');
    });
  });
  
  describe('Dark Mode Support', () => {
    it('should include dark mode classes for Override badge', () => {
      const ignoreState: IgnoreState = {
        explicit: false,
        effective: false,
        source: 'explicit',
        isOverride: true
      };
      
      render(<AnnotationBadge ignoreState={ignoreState} />);
      
      const badge = screen.getByTestId('annotation-badge');
      expect(badge).toHaveClass('dark:bg-purple-900');
      expect(badge).toHaveClass('dark:text-purple-200');
    });
    
    it('should include dark mode classes for Explicit badge', () => {
      const ignoreState: IgnoreState = {
        explicit: true,
        effective: true,
        source: 'explicit',
        isOverride: false
      };
      
      render(<AnnotationBadge ignoreState={ignoreState} />);
      
      const badge = screen.getByTestId('annotation-badge');
      expect(badge).toHaveClass('dark:bg-blue-900');
      expect(badge).toHaveClass('dark:text-blue-200');
    });
    
    it('should include dark mode classes for Inherited badge', () => {
      const ignoreState: IgnoreState = {
        explicit: undefined,
        effective: true,
        source: 'inherited',
        inheritedFrom: 'components.schemas.User',
        isOverride: false
      };
      
      render(<AnnotationBadge ignoreState={ignoreState} />);
      
      const badge = screen.getByTestId('annotation-badge');
      expect(badge).toHaveClass('dark:bg-amber-900');
      expect(badge).toHaveClass('dark:text-amber-200');
    });
  });
  
  describe('Tooltips', () => {
    it('should have tooltip for Override badge', () => {
      const ignoreState: IgnoreState = {
        explicit: false,
        effective: false,
        source: 'explicit',
        isOverride: true
      };
      
      render(<AnnotationBadge ignoreState={ignoreState} />);
      
      const badge = screen.getByTestId('annotation-badge');
      expect(badge).toHaveAttribute('title', 'Explicitly included despite parent being ignored');
    });
    
    it('should have tooltip for Explicit badge', () => {
      const ignoreState: IgnoreState = {
        explicit: true,
        effective: true,
        source: 'explicit',
        isOverride: false
      };
      
      render(<AnnotationBadge ignoreState={ignoreState} />);
      
      const badge = screen.getByTestId('annotation-badge');
      expect(badge).toHaveAttribute('title', 'Annotation set directly on this element');
    });
    
    it('should have tooltip with parent name for Inherited badge', () => {
      const ignoreState: IgnoreState = {
        explicit: undefined,
        effective: true,
        source: 'inherited',
        inheritedFrom: 'components.schemas.User',
        isOverride: false
      };
      
      render(<AnnotationBadge ignoreState={ignoreState} />);
      
      const badge = screen.getByTestId('annotation-badge');
      expect(badge).toHaveAttribute('title', 'Inherited from parent: User');
    });
  });
  
  describe('Element Name Context', () => {
    it('should include element name in Override tooltip when provided', () => {
      const ignoreState: IgnoreState = {
        explicit: false,
        effective: false,
        source: 'explicit',
        isOverride: true
      };
      
      render(<AnnotationBadge ignoreState={ignoreState} elementName="email" />);
      
      const badge = screen.getByTestId('annotation-badge');
      expect(badge).toHaveAttribute('title', 'email is explicitly included despite parent being ignored');
    });
    
    it('should include element name in Explicit tooltip when provided', () => {
      const ignoreState: IgnoreState = {
        explicit: true,
        effective: true,
        source: 'explicit',
        isOverride: false
      };
      
      render(<AnnotationBadge ignoreState={ignoreState} elementName="email" />);
      
      const badge = screen.getByTestId('annotation-badge');
      expect(badge).toHaveAttribute('title', 'Annotation set directly on email');
    });
    
    it('should include element name in Inherited tooltip when provided', () => {
      const ignoreState: IgnoreState = {
        explicit: undefined,
        effective: true,
        source: 'inherited',
        inheritedFrom: 'components.schemas.User',
        isOverride: false
      };
      
      render(<AnnotationBadge ignoreState={ignoreState} elementName="email" />);
      
      const badge = screen.getByTestId('annotation-badge');
      expect(badge).toHaveAttribute('title', 'email inherits ignore state from parent: User');
    });
  });
  
  describe('Badge Visibility', () => {
    it('should be visible without hover (always rendered when applicable)', () => {
      const ignoreState: IgnoreState = {
        explicit: true,
        effective: true,
        source: 'explicit',
        isOverride: false
      };
      
      render(<AnnotationBadge ignoreState={ignoreState} />);
      
      const badge = screen.getByTestId('annotation-badge');
      expect(badge).toBeVisible();
      expect(badge).not.toHaveClass('hidden');
    });
    
    it('should render nothing for default state (no badge needed)', () => {
      const ignoreState: IgnoreState = {
        explicit: undefined,
        effective: false,
        source: 'default',
        isOverride: false
      };
      
      const { container } = render(<AnnotationBadge ignoreState={ignoreState} />);
      
      expect(container.firstChild).toBeNull();
    });
  });
  
  describe('Badge Styling', () => {
    it('should have consistent badge styling (rounded, padding, font)', () => {
      const ignoreState: IgnoreState = {
        explicit: true,
        effective: true,
        source: 'explicit',
        isOverride: false
      };
      
      render(<AnnotationBadge ignoreState={ignoreState} />);
      
      const badge = screen.getByTestId('annotation-badge');
      expect(badge).toHaveClass('inline-flex');
      expect(badge).toHaveClass('items-center');
      expect(badge).toHaveClass('px-2');
      expect(badge).toHaveClass('py-0.5');
      expect(badge).toHaveClass('rounded-full');
      expect(badge).toHaveClass('text-xs');
      expect(badge).toHaveClass('font-medium');
    });
  });
  
  describe('Parent Name Extraction', () => {
    it('should extract parent name from nested property path', () => {
      const ignoreState: IgnoreState = {
        explicit: undefined,
        effective: true,
        source: 'inherited',
        inheritedFrom: 'components.schemas.User.properties.address',
        isOverride: false
      };
      
      render(<AnnotationBadge ignoreState={ignoreState} />);
      
      const badge = screen.getByTestId('annotation-badge');
      expect(badge).toHaveAttribute('title', 'Inherited from parent: address');
    });
    
    it('should extract parent name from operation path', () => {
      const ignoreState: IgnoreState = {
        explicit: undefined,
        effective: true,
        source: 'inherited',
        inheritedFrom: 'paths./users.get',
        isOverride: false
      };
      
      render(<AnnotationBadge ignoreState={ignoreState} />);
      
      const badge = screen.getByTestId('annotation-badge');
      expect(badge).toHaveAttribute('title', 'Inherited from parent: get');
    });
    
    it('should extract parent name from schema path', () => {
      const ignoreState: IgnoreState = {
        explicit: undefined,
        effective: true,
        source: 'inherited',
        inheritedFrom: 'components.schemas.User',
        isOverride: false
      };
      
      render(<AnnotationBadge ignoreState={ignoreState} />);
      
      const badge = screen.getByTestId('annotation-badge');
      expect(badge).toHaveAttribute('title', 'Inherited from parent: User');
    });
  });
  
  describe('Edge Cases', () => {
    it('should handle inherited state without inheritedFrom field', () => {
      const ignoreState: IgnoreState = {
        explicit: undefined,
        effective: true,
        source: 'inherited',
        isOverride: false
      };
      
      render(<AnnotationBadge ignoreState={ignoreState} />);
      
      const badge = screen.queryByTestId('annotation-badge');
      expect(badge).not.toBeInTheDocument();
    });
    
    it('should handle explicit false (active) annotation', () => {
      const ignoreState: IgnoreState = {
        explicit: false,
        effective: false,
        source: 'explicit',
        isOverride: false
      };
      
      render(<AnnotationBadge ignoreState={ignoreState} />);
      
      const badge = screen.getByTestId('annotation-badge');
      expect(badge).toHaveTextContent('Explicit');
    });
    
    it('should prioritize override badge over explicit badge', () => {
      const ignoreState: IgnoreState = {
        explicit: false,
        effective: false,
        source: 'explicit',
        isOverride: true
      };
      
      render(<AnnotationBadge ignoreState={ignoreState} />);
      
      const badge = screen.getByTestId('annotation-badge');
      expect(badge).toHaveTextContent('Override');
      expect(badge).not.toHaveTextContent('Explicit');
    });
  });
});
