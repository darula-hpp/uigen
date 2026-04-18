import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { IgnoreToggle } from '../IgnoreToggle.js';
import type { IgnoreState } from '../../../../types/index.js';

/**
 * Unit tests for IgnoreToggle component
 * 
 * Requirements: 1.1, 1.2, 1.3, 1.4, 1.5, 1.6, 1.7, 1.8
 */
describe('IgnoreToggle', () => {
  describe('Basic Rendering', () => {
    it('should render toggle switch with active state', () => {
      const ignoreState: IgnoreState = {
        explicit: false,
        effective: false,
        source: 'explicit',
        isOverride: false
      };
      
      render(
        <IgnoreToggle
          elementPath="components.schemas.User.properties.email"
          elementType="property"
          ignoreState={ignoreState}
          disabled={false}
          onChange={vi.fn()}
        />
      );
      
      const toggle = screen.getByRole('switch');
      expect(toggle).toBeInTheDocument();
      expect(toggle).toHaveAttribute('aria-checked', 'false');
      expect(screen.getByText('active')).toBeInTheDocument();
    });
    
    it('should render toggle switch with ignored state', () => {
      const ignoreState: IgnoreState = {
        explicit: true,
        effective: true,
        source: 'explicit',
        isOverride: false
      };
      
      render(
        <IgnoreToggle
          elementPath="components.schemas.User.properties.email"
          elementType="property"
          ignoreState={ignoreState}
          disabled={false}
          onChange={vi.fn()}
        />
      );
      
      const toggle = screen.getByRole('switch');
      expect(toggle).toHaveAttribute('aria-checked', 'true');
      expect(screen.getByText('ignored')).toBeInTheDocument();
    });
  });
  
  describe('Disabled State', () => {
    it('should render disabled toggle when disabled prop is true', () => {
      const ignoreState: IgnoreState = {
        explicit: undefined,
        effective: true,
        source: 'inherited',
        inheritedFrom: 'components.schemas.User',
        isOverride: false
      };
      
      render(
        <IgnoreToggle
          elementPath="components.schemas.User.properties.email"
          elementType="property"
          ignoreState={ignoreState}
          disabled={true}
          onChange={vi.fn()}
        />
      );
      
      const toggle = screen.getByRole('switch');
      expect(toggle).toBeDisabled();
      expect(toggle).toHaveClass('cursor-not-allowed');
    });
    
    it('should not call onChange when disabled toggle is clicked', async () => {
      const user = userEvent.setup();
      const onChange = vi.fn();
      const ignoreState: IgnoreState = {
        explicit: undefined,
        effective: true,
        source: 'inherited',
        inheritedFrom: 'components.schemas.User',
        isOverride: false
      };
      
      render(
        <IgnoreToggle
          elementPath="components.schemas.User.properties.email"
          elementType="property"
          ignoreState={ignoreState}
          disabled={true}
          onChange={onChange}
        />
      );
      
      const toggle = screen.getByRole('switch');
      await user.click(toggle);
      
      expect(onChange).not.toHaveBeenCalled();
    });
  });
  
  describe('Toggle Interaction', () => {
    it('should call onChange with true when toggling from active to ignored', async () => {
      const user = userEvent.setup();
      const onChange = vi.fn();
      const ignoreState: IgnoreState = {
        explicit: false,
        effective: false,
        source: 'explicit',
        isOverride: false
      };
      
      render(
        <IgnoreToggle
          elementPath="components.schemas.User.properties.email"
          elementType="property"
          ignoreState={ignoreState}
          disabled={false}
          onChange={onChange}
        />
      );
      
      const toggle = screen.getByRole('switch');
      await user.click(toggle);
      
      expect(onChange).toHaveBeenCalledWith(true);
      expect(onChange).toHaveBeenCalledTimes(1);
    });
    
    it('should call onChange with false when toggling from ignored to active', async () => {
      const user = userEvent.setup();
      const onChange = vi.fn();
      const ignoreState: IgnoreState = {
        explicit: true,
        effective: true,
        source: 'explicit',
        isOverride: false
      };
      
      render(
        <IgnoreToggle
          elementPath="components.schemas.User.properties.email"
          elementType="property"
          ignoreState={ignoreState}
          disabled={false}
          onChange={onChange}
        />
      );
      
      const toggle = screen.getByRole('switch');
      await user.click(toggle);
      
      expect(onChange).toHaveBeenCalledWith(false);
      expect(onChange).toHaveBeenCalledTimes(1);
    });
  });
  
  describe('Annotation Badges', () => {
    it('should display "Explicit" badge for explicit annotations', () => {
      const ignoreState: IgnoreState = {
        explicit: true,
        effective: true,
        source: 'explicit',
        isOverride: false
      };
      
      render(
        <IgnoreToggle
          elementPath="components.schemas.User.properties.email"
          elementType="property"
          ignoreState={ignoreState}
          disabled={false}
          onChange={vi.fn()}
        />
      );
      
      const badge = screen.getByTestId('annotation-badge');
      expect(badge).toHaveTextContent('Explicit');
      expect(badge).toHaveClass('bg-blue-100');
    });
    
    it('should display "Inherited" badge for inherited state', () => {
      const ignoreState: IgnoreState = {
        explicit: undefined,
        effective: true,
        source: 'inherited',
        inheritedFrom: 'components.schemas.User',
        isOverride: false
      };
      
      render(
        <IgnoreToggle
          elementPath="components.schemas.User.properties.email"
          elementType="property"
          ignoreState={ignoreState}
          disabled={false}
          onChange={vi.fn()}
        />
      );
      
      const badge = screen.getByTestId('annotation-badge');
      expect(badge).toHaveTextContent('Inherited');
      expect(badge).toHaveClass('bg-amber-100');
    });
    
    it('should display "Override" badge for override annotations', () => {
      const ignoreState: IgnoreState = {
        explicit: false,
        effective: false,
        source: 'explicit',
        isOverride: true
      };
      
      render(
        <IgnoreToggle
          elementPath="components.schemas.User.properties.email"
          elementType="property"
          ignoreState={ignoreState}
          disabled={false}
          onChange={vi.fn()}
        />
      );
      
      const badge = screen.getByTestId('annotation-badge');
      expect(badge).toHaveTextContent('Override');
      expect(badge).toHaveClass('bg-purple-100');
    });
    
    it('should not display badge for default state', () => {
      const ignoreState: IgnoreState = {
        explicit: undefined,
        effective: false,
        source: 'default',
        isOverride: false
      };
      
      render(
        <IgnoreToggle
          elementPath="components.schemas.User.properties.email"
          elementType="property"
          ignoreState={ignoreState}
          disabled={false}
          onChange={vi.fn()}
        />
      );
      
      const badge = screen.queryByTestId('annotation-badge');
      expect(badge).not.toBeInTheDocument();
    });
  });
  
  describe('Accessibility', () => {
    it('should have proper ARIA labels', () => {
      const ignoreState: IgnoreState = {
        explicit: false,
        effective: false,
        source: 'explicit',
        isOverride: false
      };
      
      render(
        <IgnoreToggle
          elementPath="components.schemas.User.properties.email"
          elementType="property"
          ignoreState={ignoreState}
          disabled={false}
          onChange={vi.fn()}
        />
      );
      
      const toggle = screen.getByRole('switch');
      expect(toggle).toHaveAttribute('aria-label', 'Toggle ignore for email');
      expect(toggle).toHaveAttribute('aria-describedby', 'components.schemas.User.properties.email-tooltip');
    });
    
    it('should have proper title attribute for tooltip', () => {
      const ignoreState: IgnoreState = {
        explicit: false,
        effective: false,
        source: 'explicit',
        isOverride: false
      };
      
      render(
        <IgnoreToggle
          elementPath="components.schemas.User.properties.email"
          elementType="property"
          ignoreState={ignoreState}
          disabled={false}
          onChange={vi.fn()}
        />
      );
      
      const toggle = screen.getByRole('switch');
      expect(toggle).toHaveAttribute('title', 'Ignore email in generated UI');
    });
  });
  
  describe('Element Name Extraction', () => {
    it('should extract property name from path', () => {
      const ignoreState: IgnoreState = {
        explicit: false,
        effective: false,
        source: 'explicit',
        isOverride: false
      };
      
      render(
        <IgnoreToggle
          elementPath="components.schemas.User.properties.email"
          elementType="property"
          ignoreState={ignoreState}
          disabled={false}
          onChange={vi.fn()}
        />
      );
      
      const toggle = screen.getByRole('switch');
      expect(toggle).toHaveAttribute('aria-label', 'Toggle ignore for email');
    });
    
    it('should extract operation name from path', () => {
      const ignoreState: IgnoreState = {
        explicit: false,
        effective: false,
        source: 'explicit',
        isOverride: false
      };
      
      render(
        <IgnoreToggle
          elementPath="paths./users.get"
          elementType="operation"
          ignoreState={ignoreState}
          disabled={false}
          onChange={vi.fn()}
        />
      );
      
      const toggle = screen.getByRole('switch');
      expect(toggle).toHaveAttribute('aria-label', 'Toggle ignore for get');
    });
    
    it('should extract schema name from path', () => {
      const ignoreState: IgnoreState = {
        explicit: false,
        effective: false,
        source: 'explicit',
        isOverride: false
      };
      
      render(
        <IgnoreToggle
          elementPath="components.schemas.User"
          elementType="schema"
          ignoreState={ignoreState}
          disabled={false}
          onChange={vi.fn()}
        />
      );
      
      const toggle = screen.getByRole('switch');
      expect(toggle).toHaveAttribute('aria-label', 'Toggle ignore for User');
    });
  });
  
  describe('Visual States', () => {
    it('should apply green color for active state', () => {
      const ignoreState: IgnoreState = {
        explicit: false,
        effective: false,
        source: 'explicit',
        isOverride: false
      };
      
      render(
        <IgnoreToggle
          elementPath="components.schemas.User.properties.email"
          elementType="property"
          ignoreState={ignoreState}
          disabled={false}
          onChange={vi.fn()}
        />
      );
      
      const toggle = screen.getByRole('switch');
      expect(toggle).toHaveClass('bg-green-400');
      
      const label = screen.getByText('active');
      expect(label).toHaveClass('text-green-600');
    });
    
    it('should apply red color for ignored state', () => {
      const ignoreState: IgnoreState = {
        explicit: true,
        effective: true,
        source: 'explicit',
        isOverride: false
      };
      
      render(
        <IgnoreToggle
          elementPath="components.schemas.User.properties.email"
          elementType="property"
          ignoreState={ignoreState}
          disabled={false}
          onChange={vi.fn()}
        />
      );
      
      const toggle = screen.getByRole('switch');
      expect(toggle).toHaveClass('bg-red-400');
      
      const label = screen.getByText('ignored');
      expect(label).toHaveClass('text-red-600');
    });
    
    it('should apply gray color for disabled state', () => {
      const ignoreState: IgnoreState = {
        explicit: undefined,
        effective: true,
        source: 'inherited',
        inheritedFrom: 'components.schemas.User',
        isOverride: false
      };
      
      render(
        <IgnoreToggle
          elementPath="components.schemas.User.properties.email"
          elementType="property"
          ignoreState={ignoreState}
          disabled={true}
          onChange={vi.fn()}
        />
      );
      
      const toggle = screen.getByRole('switch');
      expect(toggle).toHaveClass('bg-gray-300');
      
      const label = screen.getByText('ignored');
      expect(label).toHaveClass('text-gray-400');
    });
  });
});
