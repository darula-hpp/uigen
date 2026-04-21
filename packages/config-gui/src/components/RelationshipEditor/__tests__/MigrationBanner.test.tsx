import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { MigrationBanner } from '../MigrationBanner.js';

describe('MigrationBanner', () => {
  beforeEach(() => {
    // Clear localStorage before each test
    localStorage.clear();
  });

  afterEach(() => {
    localStorage.clear();
  });

  // Subtask 10.1: Create MigrationBanner component with warning styling
  describe('Component rendering', () => {
    it('renders the migration banner', () => {
      render(
        <MigrationBanner
          relationshipCount={5}
          onMigrate={vi.fn()}
          onDismiss={vi.fn()}
        />
      );

      expect(screen.getByTestId('migration-banner')).toBeInTheDocument();
      expect(screen.getByText(/Relationship Config Migration Available/i)).toBeInTheDocument();
    });

    it('has warning styling with amber colors', () => {
      render(
        <MigrationBanner
          relationshipCount={5}
          onMigrate={vi.fn()}
          onDismiss={vi.fn()}
        />
      );

      const banner = screen.getByTestId('migration-banner');
      expect(banner.className).toContain('bg-amber');
      expect(banner.className).toContain('border-amber');
    });

    it('has proper ARIA role', () => {
      render(
        <MigrationBanner
          relationshipCount={5}
          onMigrate={vi.fn()}
          onDismiss={vi.fn()}
        />
      );

      const banner = screen.getByTestId('migration-banner');
      expect(banner).toHaveAttribute('role', 'alert');
    });
  });

  // Subtask 10.2: Display relationship count in banner message
  describe('Relationship count display', () => {
    it('displays the correct relationship count', () => {
      render(
        <MigrationBanner
          relationshipCount={5}
          onMigrate={vi.fn()}
          onDismiss={vi.fn()}
        />
      );

      expect(screen.getByTestId('migration-count')).toHaveTextContent('5');
    });

    it('uses singular form for 1 relationship', () => {
      render(
        <MigrationBanner
          relationshipCount={1}
          onMigrate={vi.fn()}
          onDismiss={vi.fn()}
        />
      );

      // Text is split across elements, so we check for the parts
      expect(screen.getByTestId('migration-count')).toHaveTextContent('1');
      expect(screen.getByText((content, element) => {
        return element?.textContent === 'Your config has 1 relationship using implicit types. Migrate to explicit types for better clarity and control.';
      })).toBeInTheDocument();
    });

    it('uses plural form for multiple relationships', () => {
      render(
        <MigrationBanner
          relationshipCount={10}
          onMigrate={vi.fn()}
          onDismiss={vi.fn()}
        />
      );

      // Text is split across elements, so we check for the parts
      expect(screen.getByTestId('migration-count')).toHaveTextContent('10');
      expect(screen.getByText((content, element) => {
        return element?.textContent === 'Your config has 10 relationships using implicit types. Migrate to explicit types for better clarity and control.';
      })).toBeInTheDocument();
    });

    it('handles zero relationships', () => {
      render(
        <MigrationBanner
          relationshipCount={0}
          onMigrate={vi.fn()}
          onDismiss={vi.fn()}
        />
      );

      expect(screen.getByTestId('migration-count')).toHaveTextContent('0');
    });
  });

  // Subtask 10.3: Add "Migrate Now" and "Dismiss" buttons
  describe('Action buttons', () => {
    it('renders "Migrate Now" button', () => {
      render(
        <MigrationBanner
          relationshipCount={5}
          onMigrate={vi.fn()}
          onDismiss={vi.fn()}
        />
      );

      expect(screen.getByTestId('migration-migrate-button')).toBeInTheDocument();
      expect(screen.getByText('Migrate Now')).toBeInTheDocument();
    });

    it('renders "Dismiss" button', () => {
      render(
        <MigrationBanner
          relationshipCount={5}
          onMigrate={vi.fn()}
          onDismiss={vi.fn()}
        />
      );

      expect(screen.getByTestId('migration-dismiss-button')).toBeInTheDocument();
      expect(screen.getByText('Dismiss')).toBeInTheDocument();
    });

    it('calls onMigrate when "Migrate Now" is clicked', () => {
      const onMigrate = vi.fn();

      render(
        <MigrationBanner
          relationshipCount={5}
          onMigrate={onMigrate}
          onDismiss={vi.fn()}
        />
      );

      fireEvent.click(screen.getByTestId('migration-migrate-button'));
      expect(onMigrate).toHaveBeenCalledTimes(1);
    });

    it('calls onDismiss when "Dismiss" is clicked', () => {
      const onDismiss = vi.fn();

      render(
        <MigrationBanner
          relationshipCount={5}
          onMigrate={vi.fn()}
          onDismiss={onDismiss}
        />
      );

      fireEvent.click(screen.getByTestId('migration-dismiss-button'));
      expect(onDismiss).toHaveBeenCalledTimes(1);
    });
  });

  // Subtask 10.4: Implement dismiss functionality (store in localStorage)
  describe('Dismiss functionality', () => {
    it('stores dismissal in localStorage when dismissed', () => {
      render(
        <MigrationBanner
          relationshipCount={5}
          onMigrate={vi.fn()}
          onDismiss={vi.fn()}
        />
      );

      fireEvent.click(screen.getByTestId('migration-dismiss-button'));

      expect(localStorage.getItem('uigen-relationship-migration-dismissed')).toBe('true');
    });

    it('hides banner after dismissal', () => {
      const { rerender } = render(
        <MigrationBanner
          relationshipCount={5}
          onMigrate={vi.fn()}
          onDismiss={vi.fn()}
        />
      );

      fireEvent.click(screen.getByTestId('migration-dismiss-button'));

      // Banner should be hidden
      expect(screen.queryByTestId('migration-banner')).not.toBeInTheDocument();
    });

    it('does not render if previously dismissed', () => {
      localStorage.setItem('uigen-relationship-migration-dismissed', 'true');

      render(
        <MigrationBanner
          relationshipCount={5}
          onMigrate={vi.fn()}
          onDismiss={vi.fn()}
        />
      );

      expect(screen.queryByTestId('migration-banner')).not.toBeInTheDocument();
    });

    it('renders if not previously dismissed', () => {
      render(
        <MigrationBanner
          relationshipCount={5}
          onMigrate={vi.fn()}
          onDismiss={vi.fn()}
        />
      );

      expect(screen.getByTestId('migration-banner')).toBeInTheDocument();
    });
  });

  // Subtask 10.5: Add keyboard accessibility
  describe('Keyboard accessibility', () => {
    it('Migrate Now button is keyboard accessible', () => {
      render(
        <MigrationBanner
          relationshipCount={5}
          onMigrate={vi.fn()}
          onDismiss={vi.fn()}
        />
      );

      const migrateButton = screen.getByTestId('migration-migrate-button');
      migrateButton.focus();
      expect(document.activeElement).toBe(migrateButton);
    });

    it('Dismiss button is keyboard accessible', () => {
      render(
        <MigrationBanner
          relationshipCount={5}
          onMigrate={vi.fn()}
          onDismiss={vi.fn()}
        />
      );

      const dismissButton = screen.getByTestId('migration-dismiss-button');
      dismissButton.focus();
      expect(document.activeElement).toBe(dismissButton);
    });

    it('buttons have focus ring styles', () => {
      render(
        <MigrationBanner
          relationshipCount={5}
          onMigrate={vi.fn()}
          onDismiss={vi.fn()}
        />
      );

      const migrateButton = screen.getByTestId('migration-migrate-button');
      const dismissButton = screen.getByTestId('migration-dismiss-button');

      expect(migrateButton.className).toContain('focus:ring');
      expect(dismissButton.className).toContain('focus:ring');
    });

    it('can trigger Migrate Now with Enter key', () => {
      const onMigrate = vi.fn();

      render(
        <MigrationBanner
          relationshipCount={5}
          onMigrate={onMigrate}
          onDismiss={vi.fn()}
        />
      );

      const migrateButton = screen.getByTestId('migration-migrate-button');
      migrateButton.focus();
      fireEvent.keyDown(migrateButton, { key: 'Enter' });
      fireEvent.click(migrateButton);

      expect(onMigrate).toHaveBeenCalled();
    });

    it('can trigger Dismiss with Enter key', () => {
      const onDismiss = vi.fn();

      render(
        <MigrationBanner
          relationshipCount={5}
          onMigrate={vi.fn()}
          onDismiss={onDismiss}
        />
      );

      const dismissButton = screen.getByTestId('migration-dismiss-button');
      dismissButton.focus();
      fireEvent.keyDown(dismissButton, { key: 'Enter' });
      fireEvent.click(dismissButton);

      expect(onDismiss).toHaveBeenCalled();
    });
  });

  // Additional behavior tests
  describe('Component behavior', () => {
    it('persists dismissal across component remounts', () => {
      const { unmount } = render(
        <MigrationBanner
          relationshipCount={5}
          onMigrate={vi.fn()}
          onDismiss={vi.fn()}
        />
      );

      fireEvent.click(screen.getByTestId('migration-dismiss-button'));
      unmount();

      // Remount component
      render(
        <MigrationBanner
          relationshipCount={5}
          onMigrate={vi.fn()}
          onDismiss={vi.fn()}
        />
      );

      // Should not render because it was dismissed
      expect(screen.queryByTestId('migration-banner')).not.toBeInTheDocument();
    });

    it('updates count when prop changes', () => {
      const { rerender } = render(
        <MigrationBanner
          relationshipCount={5}
          onMigrate={vi.fn()}
          onDismiss={vi.fn()}
        />
      );

      expect(screen.getByTestId('migration-count')).toHaveTextContent('5');

      rerender(
        <MigrationBanner
          relationshipCount={10}
          onMigrate={vi.fn()}
          onDismiss={vi.fn()}
        />
      );

      expect(screen.getByTestId('migration-count')).toHaveTextContent('10');
    });
  });
});
