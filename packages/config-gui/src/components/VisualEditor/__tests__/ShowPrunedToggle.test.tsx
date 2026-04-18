import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { ShowPrunedToggle } from '../ShowPrunedToggle.js';

/**
 * Unit tests for ShowPrunedToggle component
 * 
 * Requirements: 8.1, 8.2, 8.3, 8.4, 8.5
 */

describe('ShowPrunedToggle', () => {
  const mockOnChange = vi.fn();
  
  // Mock localStorage
  const localStorageMock = (() => {
    let store: Record<string, string> = {};
    
    return {
      getItem: (key: string) => store[key] || null,
      setItem: (key: string, value: string) => {
        store[key] = value;
      },
      removeItem: (key: string) => {
        delete store[key];
      },
      clear: () => {
        store = {};
      }
    };
  })();
  
  beforeEach(() => {
    // Reset mocks
    mockOnChange.mockClear();
    localStorageMock.clear();
    
    // Mock localStorage
    Object.defineProperty(window, 'localStorage', {
      value: localStorageMock,
      writable: true
    });
  });
  
  afterEach(() => {
    localStorageMock.clear();
  });

  describe('Rendering (Requirement 8.1)', () => {
    it('should render toggle container', () => {
      render(<ShowPrunedToggle onChange={mockOnChange} />);
      
      expect(screen.getByTestId('show-pruned-toggle-container')).toBeInTheDocument();
    });

    it('should render label text', () => {
      render(<ShowPrunedToggle onChange={mockOnChange} />);
      
      expect(screen.getByText('Show Pruned Elements')).toBeInTheDocument();
    });

    it('should render toggle switch', () => {
      render(<ShowPrunedToggle onChange={mockOnChange} />);
      
      expect(screen.getByTestId('show-pruned-toggle-switch')).toBeInTheDocument();
    });

    it('should render eye icon when enabled', () => {
      render(<ShowPrunedToggle onChange={mockOnChange} initialValue={true} />);
      
      expect(screen.getByTestId('eye-icon')).toBeInTheDocument();
      expect(screen.queryByTestId('eye-off-icon')).not.toBeInTheDocument();
    });

    it('should render eye-off icon when disabled', () => {
      render(<ShowPrunedToggle onChange={mockOnChange} initialValue={false} />);
      
      expect(screen.getByTestId('eye-off-icon')).toBeInTheDocument();
      expect(screen.queryByTestId('eye-icon')).not.toBeInTheDocument();
    });

    it('should display "On" label when enabled', () => {
      render(<ShowPrunedToggle onChange={mockOnChange} initialValue={true} />);
      
      expect(screen.getByTestId('show-pruned-toggle-label')).toHaveTextContent('On');
    });

    it('should display "Off" label when disabled', () => {
      render(<ShowPrunedToggle onChange={mockOnChange} initialValue={false} />);
      
      expect(screen.getByTestId('show-pruned-toggle-label')).toHaveTextContent('Off');
    });
  });

  describe('Default State (Requirement 8.2)', () => {
    it('should default to enabled (show pruned elements)', () => {
      render(<ShowPrunedToggle onChange={mockOnChange} />);
      
      const toggle = screen.getByTestId('show-pruned-toggle-switch');
      expect(toggle).toHaveAttribute('aria-checked', 'true');
    });

    it('should call onChange with true on mount when no stored value', () => {
      render(<ShowPrunedToggle onChange={mockOnChange} />);
      
      expect(mockOnChange).toHaveBeenCalledWith(true);
    });

    it('should respect initialValue prop', () => {
      render(<ShowPrunedToggle onChange={mockOnChange} initialValue={false} />);
      
      const toggle = screen.getByTestId('show-pruned-toggle-switch');
      expect(toggle).toHaveAttribute('aria-checked', 'false');
    });
  });

  describe('Toggle Behavior (Requirements 8.2, 8.3)', () => {
    it('should toggle from enabled to disabled on click', () => {
      render(<ShowPrunedToggle onChange={mockOnChange} initialValue={true} />);
      
      const toggle = screen.getByTestId('show-pruned-toggle-switch');
      fireEvent.click(toggle);
      
      expect(toggle).toHaveAttribute('aria-checked', 'false');
      expect(mockOnChange).toHaveBeenCalledWith(false);
    });

    it('should toggle from disabled to enabled on click', () => {
      render(<ShowPrunedToggle onChange={mockOnChange} initialValue={false} />);
      
      const toggle = screen.getByTestId('show-pruned-toggle-switch');
      fireEvent.click(toggle);
      
      expect(toggle).toHaveAttribute('aria-checked', 'true');
      expect(mockOnChange).toHaveBeenCalledWith(true);
    });

    it('should update icon when toggled', () => {
      render(<ShowPrunedToggle onChange={mockOnChange} initialValue={true} />);
      
      const toggle = screen.getByTestId('show-pruned-toggle-switch');
      fireEvent.click(toggle);
      
      expect(screen.getByTestId('eye-off-icon')).toBeInTheDocument();
      expect(screen.queryByTestId('eye-icon')).not.toBeInTheDocument();
    });

    it('should update label when toggled', () => {
      render(<ShowPrunedToggle onChange={mockOnChange} initialValue={true} />);
      
      const toggle = screen.getByTestId('show-pruned-toggle-switch');
      fireEvent.click(toggle);
      
      expect(screen.getByTestId('show-pruned-toggle-label')).toHaveTextContent('Off');
    });

    it('should call onChange with new value on toggle', () => {
      render(<ShowPrunedToggle onChange={mockOnChange} initialValue={true} />);
      
      mockOnChange.mockClear(); // Clear initial call
      
      const toggle = screen.getByTestId('show-pruned-toggle-switch');
      fireEvent.click(toggle);
      
      expect(mockOnChange).toHaveBeenCalledTimes(1);
      expect(mockOnChange).toHaveBeenCalledWith(false);
    });
  });

  describe('Local Storage Persistence (Requirement 8.5)', () => {
    it('should save state to local storage when toggled', () => {
      render(<ShowPrunedToggle onChange={mockOnChange} initialValue={true} />);
      
      const toggle = screen.getByTestId('show-pruned-toggle-switch');
      fireEvent.click(toggle);
      
      expect(localStorageMock.getItem('uigen-show-pruned-elements')).toBe('false');
    });

    it('should load state from local storage on mount', () => {
      localStorageMock.setItem('uigen-show-pruned-elements', 'false');
      
      render(<ShowPrunedToggle onChange={mockOnChange} />);
      
      const toggle = screen.getByTestId('show-pruned-toggle-switch');
      expect(toggle).toHaveAttribute('aria-checked', 'false');
    });

    it('should prefer local storage value over initialValue', () => {
      localStorageMock.setItem('uigen-show-pruned-elements', 'false');
      
      render(<ShowPrunedToggle onChange={mockOnChange} initialValue={true} />);
      
      const toggle = screen.getByTestId('show-pruned-toggle-switch');
      expect(toggle).toHaveAttribute('aria-checked', 'false');
    });

    it('should update local storage on multiple toggles', () => {
      render(<ShowPrunedToggle onChange={mockOnChange} initialValue={true} />);
      
      const toggle = screen.getByTestId('show-pruned-toggle-switch');
      
      fireEvent.click(toggle);
      expect(localStorageMock.getItem('uigen-show-pruned-elements')).toBe('false');
      
      fireEvent.click(toggle);
      expect(localStorageMock.getItem('uigen-show-pruned-elements')).toBe('true');
    });

    it('should handle local storage errors gracefully', () => {
      const consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
      
      // Mock localStorage.setItem to throw error
      const originalSetItem = localStorageMock.setItem;
      localStorageMock.setItem = () => {
        throw new Error('Storage quota exceeded');
      };
      
      render(<ShowPrunedToggle onChange={mockOnChange} initialValue={true} />);
      
      const toggle = screen.getByTestId('show-pruned-toggle-switch');
      fireEvent.click(toggle);
      
      expect(consoleWarnSpy).toHaveBeenCalled();
      expect(mockOnChange).toHaveBeenCalledWith(false); // Should still call onChange
      
      // Restore
      localStorageMock.setItem = originalSetItem;
      consoleWarnSpy.mockRestore();
    });
  });

  describe('Visual Styling', () => {
    it('should apply indigo color when enabled', () => {
      render(<ShowPrunedToggle onChange={mockOnChange} initialValue={true} />);
      
      const toggle = screen.getByTestId('show-pruned-toggle-switch');
      expect(toggle.className).toContain('bg-indigo-500');
    });

    it('should apply gray color when disabled', () => {
      render(<ShowPrunedToggle onChange={mockOnChange} initialValue={false} />);
      
      const toggle = screen.getByTestId('show-pruned-toggle-switch');
      expect(toggle.className).toContain('bg-gray-300');
    });

    it('should have focus ring styles', () => {
      render(<ShowPrunedToggle onChange={mockOnChange} />);
      
      const toggle = screen.getByTestId('show-pruned-toggle-switch');
      expect(toggle.className).toContain('focus:ring-2');
    });

    it('should have transition classes', () => {
      render(<ShowPrunedToggle onChange={mockOnChange} />);
      
      const toggle = screen.getByTestId('show-pruned-toggle-switch');
      expect(toggle.className).toContain('transition-colors');
    });
  });

  describe('Accessibility', () => {
    it('should have role="switch"', () => {
      render(<ShowPrunedToggle onChange={mockOnChange} />);
      
      const toggle = screen.getByTestId('show-pruned-toggle-switch');
      expect(toggle).toHaveAttribute('role', 'switch');
    });

    it('should have aria-checked attribute', () => {
      render(<ShowPrunedToggle onChange={mockOnChange} initialValue={true} />);
      
      const toggle = screen.getByTestId('show-pruned-toggle-switch');
      expect(toggle).toHaveAttribute('aria-checked', 'true');
    });

    it('should have aria-label', () => {
      render(<ShowPrunedToggle onChange={mockOnChange} />);
      
      const toggle = screen.getByTestId('show-pruned-toggle-switch');
      expect(toggle).toHaveAttribute('aria-label', 'Toggle show pruned elements');
    });

    it('should have title for tooltip', () => {
      render(<ShowPrunedToggle onChange={mockOnChange} initialValue={true} />);
      
      const toggle = screen.getByTestId('show-pruned-toggle-switch');
      expect(toggle).toHaveAttribute('title', 'Hide children of ignored parents');
    });

    it('should update title when toggled', () => {
      render(<ShowPrunedToggle onChange={mockOnChange} initialValue={true} />);
      
      const toggle = screen.getByTestId('show-pruned-toggle-switch');
      fireEvent.click(toggle);
      
      expect(toggle).toHaveAttribute('title', 'Show children of ignored parents');
    });

    it('should be keyboard accessible', () => {
      render(<ShowPrunedToggle onChange={mockOnChange} />);
      
      const toggle = screen.getByTestId('show-pruned-toggle-switch');
      toggle.focus();
      
      expect(document.activeElement).toBe(toggle);
    });
  });

  describe('Dark Mode Support', () => {
    it('should have dark mode classes for container', () => {
      render(<ShowPrunedToggle onChange={mockOnChange} />);
      
      const container = screen.getByTestId('show-pruned-toggle-container');
      expect(container.className).toContain('dark:bg-gray-800');
      expect(container.className).toContain('dark:border-gray-700');
    });

    it('should have dark mode classes for toggle when enabled', () => {
      render(<ShowPrunedToggle onChange={mockOnChange} initialValue={true} />);
      
      const toggle = screen.getByTestId('show-pruned-toggle-switch');
      expect(toggle.className).toContain('dark:bg-indigo-600');
    });

    it('should have dark mode classes for toggle when disabled', () => {
      render(<ShowPrunedToggle onChange={mockOnChange} initialValue={false} />);
      
      const toggle = screen.getByTestId('show-pruned-toggle-switch');
      expect(toggle.className).toContain('dark:bg-gray-600');
    });
  });

  describe('Edge Cases', () => {
    it('should handle rapid toggling', () => {
      render(<ShowPrunedToggle onChange={mockOnChange} initialValue={true} />);
      
      mockOnChange.mockClear();
      
      const toggle = screen.getByTestId('show-pruned-toggle-switch');
      
      fireEvent.click(toggle);
      fireEvent.click(toggle);
      fireEvent.click(toggle);
      
      expect(mockOnChange).toHaveBeenCalledTimes(3);
      expect(toggle).toHaveAttribute('aria-checked', 'false');
    });

    it('should handle corrupted local storage value', () => {
      localStorageMock.setItem('uigen-show-pruned-elements', 'invalid');
      
      render(<ShowPrunedToggle onChange={mockOnChange} />);
      
      const toggle = screen.getByTestId('show-pruned-toggle-switch');
      // Should default to true when value is not 'true'
      expect(toggle).toHaveAttribute('aria-checked', 'false');
    });
  });
});
