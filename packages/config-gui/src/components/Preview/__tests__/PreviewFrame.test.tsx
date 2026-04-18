import { describe, it, expect, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { PreviewFrame } from '../PreviewFrame.js';

describe('PreviewFrame', () => {
  const mockContent = '<html><body><h1>Test Content</h1></body></html>';

  describe('Rendering', () => {
    it('should render preview frame', () => {
      render(<PreviewFrame content={mockContent} />);
      expect(screen.getByTestId('preview-frame')).toBeInTheDocument();
    });

    it('should render iframe', () => {
      render(<PreviewFrame content={mockContent} />);
      expect(screen.getByTestId('preview-iframe')).toBeInTheDocument();
    });

    it('should set iframe title', () => {
      render(<PreviewFrame content={mockContent} />);
      const iframe = screen.getByTitle('UI Preview');
      expect(iframe).toBeInTheDocument();
    });

    it('should apply sandbox attribute to iframe', () => {
      render(<PreviewFrame content={mockContent} />);
      const iframe = screen.getByTestId('preview-iframe');
      expect(iframe).toHaveAttribute('sandbox', 'allow-same-origin allow-scripts');
    });
  });

  describe('Loading State', () => {
    it('should show loading spinner initially', () => {
      render(<PreviewFrame content={mockContent} />);
      expect(screen.getByTestId('loading-spinner')).toBeInTheDocument();
      expect(screen.getByText('Loading preview...')).toBeInTheDocument();
    });

    it('should hide loading spinner after content loads', async () => {
      render(<PreviewFrame content={mockContent} />);
      
      await waitFor(() => {
        expect(screen.queryByTestId('loading-spinner')).not.toBeInTheDocument();
      }, { timeout: 500 });
    });
  });

  describe('Content Updates', () => {
    it('should show loading spinner when content changes', async () => {
      const { rerender } = render(<PreviewFrame content={mockContent} />);
      
      await waitFor(() => {
        expect(screen.queryByTestId('loading-spinner')).not.toBeInTheDocument();
      }, { timeout: 500 });
      
      // Update content
      const newContent = '<html><body><h1>New Content</h1></body></html>';
      rerender(<PreviewFrame content={newContent} />);
      
      expect(screen.getByTestId('loading-spinner')).toBeInTheDocument();
    });
  });

  describe('Error Handling', () => {
    it('should call onError callback when error occurs', async () => {
      const onError = vi.fn();
      
      // Create a mock iframe that will fail
      const originalCreateElement = document.createElement.bind(document);
      vi.spyOn(document, 'createElement').mockImplementation((tagName: string) => {
        if (tagName === 'iframe') {
          const iframe = originalCreateElement('iframe');
          Object.defineProperty(iframe, 'contentDocument', {
            get: () => {
              throw new Error('Test error');
            }
          });
          return iframe;
        }
        return originalCreateElement(tagName);
      });
      
      render(<PreviewFrame content={mockContent} onError={onError} />);
      
      await waitFor(() => {
        expect(onError).toHaveBeenCalled();
      }, { timeout: 500 });
      
      vi.restoreAllMocks();
    });

    it('should display error message when rendering fails', async () => {
      // Create a mock iframe that will fail
      const originalCreateElement = document.createElement.bind(document);
      vi.spyOn(document, 'createElement').mockImplementation((tagName: string) => {
        if (tagName === 'iframe') {
          const iframe = originalCreateElement('iframe');
          Object.defineProperty(iframe, 'contentDocument', {
            get: () => {
              throw new Error('Test error');
            }
          });
          return iframe;
        }
        return originalCreateElement(tagName);
      });
      
      render(<PreviewFrame content={mockContent} />);
      
      await waitFor(() => {
        expect(screen.getByText('Preview Error')).toBeInTheDocument();
      }, { timeout: 500 });
      
      vi.restoreAllMocks();
    });
  });
});
