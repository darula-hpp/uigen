import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { OverrideButton } from '../OverrideButton.js';

/**
 * Unit tests for OverrideButton component
 * 
 * Requirements: 3.3, 6.5, 7.1, 7.2, 7.3, 7.4, 7.5
 */

describe('OverrideButton', () => {
  const mockProps = {
    elementPath: 'components.schemas.User.properties.email',
    elementName: 'email',
    parentName: 'User',
    hasOverride: false,
    onOverride: vi.fn()
  };

  describe('Rendering (Requirement 7.1)', () => {
    it('should render override button', () => {
      render(<OverrideButton {...mockProps} />);
      
      expect(screen.getByTestId('override-button')).toBeInTheDocument();
      expect(screen.getByText('Override')).toBeInTheDocument();
    });

    it('should display "Override" text when no override exists', () => {
      render(<OverrideButton {...mockProps} hasOverride={false} />);
      
      expect(screen.getByText('Override')).toBeInTheDocument();
      expect(screen.queryByText('Remove Override')).not.toBeInTheDocument();
    });

    it('should display "Remove Override" text when override exists', () => {
      render(<OverrideButton {...mockProps} hasOverride={true} />);
      
      expect(screen.getByText('Remove Override')).toBeInTheDocument();
      expect(screen.queryByText('Override')).not.toBeInTheDocument();
    });

    it('should render shield icon', () => {
      render(<OverrideButton {...mockProps} />);
      
      const button = screen.getByTestId('override-button');
      const icon = button.querySelector('svg');
      expect(icon).toBeInTheDocument();
    });

    it('should include element path in data attribute', () => {
      render(<OverrideButton {...mockProps} />);
      
      const button = screen.getByTestId('override-button');
      expect(button).toHaveAttribute('data-element-path', mockProps.elementPath);
    });
  });

  describe('Click Behavior (Requirements 7.2, 7.4)', () => {
    it('should call onOverride when clicked', () => {
      const onOverride = vi.fn();
      render(<OverrideButton {...mockProps} onOverride={onOverride} />);
      
      const button = screen.getByTestId('override-button');
      fireEvent.click(button);
      
      expect(onOverride).toHaveBeenCalledTimes(1);
    });

    it('should call onOverride when override exists (remove override)', () => {
      const onOverride = vi.fn();
      render(<OverrideButton {...mockProps} hasOverride={true} onOverride={onOverride} />);
      
      const button = screen.getByTestId('override-button');
      fireEvent.click(button);
      
      expect(onOverride).toHaveBeenCalledTimes(1);
    });

    it('should not call onOverride multiple times on rapid clicks', () => {
      const onOverride = vi.fn();
      render(<OverrideButton {...mockProps} onOverride={onOverride} />);
      
      const button = screen.getByTestId('override-button');
      fireEvent.click(button);
      fireEvent.click(button);
      fireEvent.click(button);
      
      expect(onOverride).toHaveBeenCalledTimes(3);
    });
  });

  describe('Visual Styling (Requirement 7.3)', () => {
    it('should apply gray styling when no override exists', () => {
      render(<OverrideButton {...mockProps} hasOverride={false} />);
      
      const button = screen.getByTestId('override-button');
      expect(button.className).toContain('bg-gray-100');
      expect(button.className).toContain('text-gray-700');
    });

    it('should apply blue styling when override exists', () => {
      render(<OverrideButton {...mockProps} hasOverride={true} />);
      
      const button = screen.getByTestId('override-button');
      expect(button.className).toContain('bg-blue-100');
      expect(button.className).toContain('text-blue-800');
    });

    it('should have hover styles', () => {
      render(<OverrideButton {...mockProps} />);
      
      const button = screen.getByTestId('override-button');
      expect(button.className).toContain('hover:bg-gray-200');
    });

    it('should have focus ring styles', () => {
      render(<OverrideButton {...mockProps} />);
      
      const button = screen.getByTestId('override-button');
      expect(button.className).toContain('focus:ring-2');
    });
  });

  describe('Tooltips (Requirement 7.1)', () => {
    it('should show override tooltip when no override exists', () => {
      render(<OverrideButton {...mockProps} hasOverride={false} />);
      
      const button = screen.getByTestId('override-button');
      expect(button).toHaveAttribute(
        'title',
        'Override parent ignore and include email in generated UI'
      );
    });

    it('should show remove override tooltip when override exists', () => {
      render(<OverrideButton {...mockProps} hasOverride={true} />);
      
      const button = screen.getByTestId('override-button');
      expect(button).toHaveAttribute(
        'title',
        'Remove override for email (will inherit ignored state from User)'
      );
    });

    it('should include parent name in tooltip', () => {
      render(<OverrideButton {...mockProps} parentName="Profile" hasOverride={true} />);
      
      const button = screen.getByTestId('override-button');
      const title = button.getAttribute('title');
      expect(title).toContain('Profile');
    });

    it('should include element name in tooltip', () => {
      render(<OverrideButton {...mockProps} elementName="username" />);
      
      const button = screen.getByTestId('override-button');
      const title = button.getAttribute('title');
      expect(title).toContain('username');
    });
  });

  describe('Accessibility (Requirement 7.1)', () => {
    it('should have aria-label for screen readers', () => {
      render(<OverrideButton {...mockProps} hasOverride={false} />);
      
      const button = screen.getByTestId('override-button');
      expect(button).toHaveAttribute('aria-label', 'Override parent ignore for email');
    });

    it('should have aria-label for remove override', () => {
      render(<OverrideButton {...mockProps} hasOverride={true} />);
      
      const button = screen.getByTestId('override-button');
      expect(button).toHaveAttribute('aria-label', 'Remove override for email');
    });

    it('should be keyboard accessible', () => {
      const onOverride = vi.fn();
      render(<OverrideButton {...mockProps} onOverride={onOverride} />);
      
      const button = screen.getByTestId('override-button');
      button.focus();
      
      expect(document.activeElement).toBe(button);
    });

    it('should be a button element for native keyboard support', () => {
      render(<OverrideButton {...mockProps} />);
      
      const button = screen.getByTestId('override-button');
      expect(button.tagName).toBe('BUTTON');
    });

    it('should have focus ring for keyboard navigation', () => {
      render(<OverrideButton {...mockProps} />);
      
      const button = screen.getByTestId('override-button');
      expect(button.className).toContain('focus:ring-2');
      expect(button.className).toContain('focus:ring-offset-1');
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty element name', () => {
      render(<OverrideButton {...mockProps} elementName="" />);
      
      const button = screen.getByTestId('override-button');
      expect(button).toBeInTheDocument();
    });

    it('should handle empty parent name', () => {
      render(<OverrideButton {...mockProps} parentName="" />);
      
      const button = screen.getByTestId('override-button');
      expect(button).toBeInTheDocument();
    });

    it('should handle long element names', () => {
      const longName = 'veryLongPropertyNameThatExceedsNormalLength';
      render(<OverrideButton {...mockProps} elementName={longName} />);
      
      const button = screen.getByTestId('override-button');
      const title = button.getAttribute('title');
      expect(title).toContain(longName);
    });

    it('should handle special characters in element name', () => {
      render(<OverrideButton {...mockProps} elementName="user-email@domain" />);
      
      const button = screen.getByTestId('override-button');
      expect(button).toBeInTheDocument();
    });
  });

  describe('Dark Mode Support', () => {
    it('should have dark mode classes for no override state', () => {
      render(<OverrideButton {...mockProps} hasOverride={false} />);
      
      const button = screen.getByTestId('override-button');
      expect(button.className).toContain('dark:bg-gray-700');
      expect(button.className).toContain('dark:text-gray-300');
    });

    it('should have dark mode classes for override state', () => {
      render(<OverrideButton {...mockProps} hasOverride={true} />);
      
      const button = screen.getByTestId('override-button');
      expect(button.className).toContain('dark:bg-blue-900/30');
      expect(button.className).toContain('dark:text-blue-300');
    });

    it('should have dark mode hover classes', () => {
      render(<OverrideButton {...mockProps} />);
      
      const button = screen.getByTestId('override-button');
      expect(button.className).toContain('dark:hover:bg-gray-600');
    });
  });
});
