import { describe, it, expect, vi, beforeAll, afterAll } from 'vitest';
import { render, screen } from '@testing-library/react';
import { ErrorBoundary } from '../ErrorBoundary';
import React from 'react';

/**
 * Property 22: Error Boundary Containment
 * 
 * For any component that throws an error during rendering, the error boundary
 * should catch it and display an error message without crashing the entire application.
 * 
 * Validates: Requirements 79.2, 79.5
 */
describe('Property 22: Error Boundary Containment', () => {
  // Suppress console.error during tests since we're intentionally throwing errors
  const originalError = console.error;
  beforeAll(() => {
    console.error = vi.fn();
  });

  afterAll(() => {
    console.error = originalError;
  });

  it('should catch errors from child components and display fallback UI', () => {
    const ThrowError = () => {
      throw new Error('Test error message');
    };

    render(
      <ErrorBoundary>
        <ThrowError />
      </ErrorBoundary>
    );

    // Should display error message
    expect(screen.getByText('Something went wrong')).toBeInTheDocument();
    expect(screen.getByText('Test error message')).toBeInTheDocument();

    // Should display reload button
    expect(screen.getByRole('button', { name: /reload/i })).toBeInTheDocument();
  });

  it('should not affect sibling components when one component errors', () => {
    const ThrowError = () => {
      throw new Error('Error in first boundary');
    };

    const SiblingComponent = () => <div data-testid="sibling">Sibling content</div>;

    render(
      <div>
        <ErrorBoundary>
          <ThrowError />
        </ErrorBoundary>
        <ErrorBoundary>
          <SiblingComponent />
        </ErrorBoundary>
      </div>
    );

    // First boundary should show error
    expect(screen.getByText('Something went wrong')).toBeInTheDocument();

    // Sibling should still render normally
    expect(screen.getByTestId('sibling')).toHaveTextContent('Sibling content');
  });

  it('should log errors to console for debugging', () => {
    const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    const ThrowError = () => {
      throw new Error('Test error');
    };

    render(
      <ErrorBoundary>
        <ThrowError />
      </ErrorBoundary>
    );

    // Should have logged the error
    expect(consoleErrorSpy).toHaveBeenCalled();

    consoleErrorSpy.mockRestore();
  });

  it('should use custom fallback when provided', () => {
    const ThrowError = () => {
      throw new Error('Custom error');
    };

    const customFallback = (error: Error) => (
      <div data-testid="custom-fallback">Custom: {error.message}</div>
    );

    render(
      <ErrorBoundary fallback={customFallback}>
        <ThrowError />
      </ErrorBoundary>
    );

    // Should display custom fallback
    const fallback = screen.getByTestId('custom-fallback');
    expect(fallback).toHaveTextContent('Custom: Custom error');
  });

  it('should handle errors in nested components', () => {
    const DeepError = () => {
      throw new Error('Nested error');
    };

    const NestedComponent = () => (
      <div>
        <div>
          <div>
            <DeepError />
          </div>
        </div>
      </div>
    );

    render(
      <ErrorBoundary>
        <NestedComponent />
      </ErrorBoundary>
    );

    // Should catch error regardless of nesting level
    expect(screen.getByText('Something went wrong')).toBeInTheDocument();
    expect(screen.getByText('Nested error')).toBeInTheDocument();
  });

  it('should handle multiple error boundaries independently', () => {
    const Error1 = () => {
      throw new Error('Error 1');
    };

    const Error2 = () => {
      throw new Error('Error 2');
    };

    render(
      <div>
        <div data-testid="boundary1">
          <ErrorBoundary>
            <Error1 />
          </ErrorBoundary>
        </div>
        <div data-testid="boundary2">
          <ErrorBoundary>
            <Error2 />
          </ErrorBoundary>
        </div>
      </div>
    );

    // Both boundaries should show errors independently
    expect(screen.getByText('Error 1')).toBeInTheDocument();
    expect(screen.getByText('Error 2')).toBeInTheDocument();
  });
});
