import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { ThemeToggle } from '../ThemeToggle';

/**
 * Unit tests for ThemeToggle component
 * Validates Requirements 30.1-30.6
 */
describe('ThemeToggle', () => {
  beforeEach(() => {
    // Clear localStorage before each test
    localStorage.clear();
    // Remove dark class from document
    document.documentElement.classList.remove('dark');
  });

  describe('Theme switching', () => {
    it('should render a toggle button', () => {
      // Validates Requirement 30.1: Provide a theme toggle button
      render(<ThemeToggle />);
      const button = screen.getByRole('button');
      expect(button).toBeInTheDocument();
    });

    it('should switch from light to dark theme when clicked', () => {
      // Validates Requirement 30.2: Switch between dark and light themes
      render(<ThemeToggle />);
      const button = screen.getByRole('button');
      
      // Initial state should be light (no dark class)
      expect(document.documentElement.classList.contains('dark')).toBe(false);
      
      // Click to switch to dark
      fireEvent.click(button);
      
      // Should apply dark class
      expect(document.documentElement.classList.contains('dark')).toBe(true);
    });

    it('should switch from dark to light theme when clicked twice', () => {
      // Validates Requirement 30.2: Switch between dark and light themes
      render(<ThemeToggle />);
      const button = screen.getByRole('button');
      
      // Click to dark
      fireEvent.click(button);
      expect(document.documentElement.classList.contains('dark')).toBe(true);
      
      // Click to light
      fireEvent.click(button);
      expect(document.documentElement.classList.contains('dark')).toBe(false);
    });

    it('should update button icon when theme changes', () => {
      // Validates Requirement 30.2: Visual feedback for theme switching
      render(<ThemeToggle />);
      const button = screen.getByRole('button');
      
      // Light theme shows moon icon (SVG path for moon)
      expect(button.querySelector('svg')).toBeInTheDocument();
      expect(button).toHaveAttribute('title', 'Switch to dark mode');
      
      // Click to switch to dark
      fireEvent.click(button);
      
      // Dark theme shows sun icon (SVG path for sun)
      expect(button.querySelector('svg')).toBeInTheDocument();
      expect(button).toHaveAttribute('title', 'Switch to light mode');
    });
  });

  describe('Theme persistence', () => {
    it('should persist theme preference in local storage', () => {
      // Validates Requirement 30.3: Persist theme preference in local storage
      render(<ThemeToggle />);
      const button = screen.getByRole('button');
      
      // Click to switch to dark
      fireEvent.click(button);
      
      // Should save to localStorage
      expect(localStorage.getItem('theme')).toBe('dark');
    });

    it('should apply stored theme preference on load', () => {
      // Validates Requirement 30.4: Apply stored theme preference on load
      localStorage.setItem('theme', 'dark');
      
      render(<ThemeToggle />);
      
      // Should apply dark class immediately
      expect(document.documentElement.classList.contains('dark')).toBe(true);
    });

    it('should restore light theme from localStorage', () => {
      // Validates Requirement 30.4: Apply stored theme preference on load
      localStorage.setItem('theme', 'light');
      
      render(<ThemeToggle />);
      
      // Should not have dark class
      expect(document.documentElement.classList.contains('dark')).toBe(false);
    });
  });

  describe('System preference detection', () => {
    it('should use system preference as default when no preference is stored', () => {
      // Validates Requirement 30.5: Use system preference as default
      
      // Mock system preference for dark mode
      const mockMatchMedia = vi.fn().mockImplementation((query) => ({
        matches: query === '(prefers-color-scheme: dark)',
        media: query,
        onchange: null,
        addListener: vi.fn(),
        removeListener: vi.fn(),
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        dispatchEvent: vi.fn(),
      }));
      
      window.matchMedia = mockMatchMedia;
      
      render(<ThemeToggle />);
      
      // Should apply dark theme based on system preference
      expect(document.documentElement.classList.contains('dark')).toBe(true);
    });

    it('should default to light theme when system preference is light', () => {
      // Validates Requirement 30.5: Use system preference as default
      
      // Mock system preference for light mode
      const mockMatchMedia = vi.fn().mockImplementation((query) => ({
        matches: false,
        media: query,
        onchange: null,
        addListener: vi.fn(),
        removeListener: vi.fn(),
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        dispatchEvent: vi.fn(),
      }));
      
      window.matchMedia = mockMatchMedia;
      
      render(<ThemeToggle />);
      
      // Should not have dark class
      expect(document.documentElement.classList.contains('dark')).toBe(false);
    });

    it('should prefer stored preference over system preference', () => {
      // Validates Requirements 30.4 and 30.5: Stored preference takes precedence
      
      // Mock system preference for dark mode
      const mockMatchMedia = vi.fn().mockImplementation((query) => ({
        matches: query === '(prefers-color-scheme: dark)',
        media: query,
        onchange: null,
        addListener: vi.fn(),
        removeListener: vi.fn(),
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        dispatchEvent: vi.fn(),
      }));
      
      window.matchMedia = mockMatchMedia;
      
      // But user has explicitly chosen light
      localStorage.setItem('theme', 'light');
      
      render(<ThemeToggle />);
      
      // Should use stored preference (light) not system preference (dark)
      expect(document.documentElement.classList.contains('dark')).toBe(false);
    });
  });

  describe('CSS variable application', () => {
    it('should apply theme using CSS variables via dark class', () => {
      // Validates Requirement 30.6: Apply theme consistently using CSS variables
      
      // Ensure completely clean state before rendering
      localStorage.clear();
      document.documentElement.classList.remove('dark');
      
      // Mock matchMedia to return light preference
      const mockMatchMedia = vi.fn().mockImplementation((query) => ({
        matches: false,
        media: query,
        onchange: null,
        addListener: vi.fn(),
        removeListener: vi.fn(),
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        dispatchEvent: vi.fn(),
      }));
      window.matchMedia = mockMatchMedia;
      
      render(<ThemeToggle />);
      const button = screen.getByRole('button');
      
      // Initial state - no dark class (light theme is default)
      expect(document.documentElement.classList.contains('dark')).toBe(false);
      
      // Switch to dark
      fireEvent.click(button);
      
      // Dark class should be applied, which triggers CSS variables
      expect(document.documentElement.classList.contains('dark')).toBe(true);
      
      // Switch back to light
      fireEvent.click(button);
      
      // Dark class should be removed
      expect(document.documentElement.classList.contains('dark')).toBe(false);
    });
  });

  describe('Accessibility', () => {
    it('should have accessible label', () => {
      render(<ThemeToggle />);
      const button = screen.getByRole('button');
      
      // Should have aria-label
      expect(button).toHaveAttribute('aria-label');
    });

    it('should have descriptive title', () => {
      render(<ThemeToggle />);
      const button = screen.getByRole('button');
      
      // Should have title attribute
      expect(button).toHaveAttribute('title');
    });
  });
});
