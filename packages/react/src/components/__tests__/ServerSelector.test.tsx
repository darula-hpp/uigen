import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { ServerSelector } from '../ServerSelector';
import type { ServerConfig } from '@uigen-dev/core';
import * as serverUtils from '@/lib/server';

// Mock the server utilities
vi.mock('@/lib/server', () => ({
  storeSelectedServer: vi.fn(),
  getSelectedServer: vi.fn(),
  clearSelectedServer: vi.fn()
}));

describe('ServerSelector', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    sessionStorage.clear();
  });

  describe('Requirement 19.6: Single server handling', () => {
    it('should not render when only one server is defined', () => {
      const servers: ServerConfig[] = [
        { url: 'https://api.example.com', description: 'Production' }
      ];

      const { container } = render(<ServerSelector servers={servers} />);
      expect(container.firstChild).toBeNull();
    });

    it('should not render when no servers are defined', () => {
      const servers: ServerConfig[] = [];

      const { container } = render(<ServerSelector servers={servers} />);
      expect(container.firstChild).toBeNull();
    });
  });

  describe('Requirement 19.1: Dropdown rendering', () => {
    it('should render dropdown when multiple servers are defined', () => {
      const servers: ServerConfig[] = [
        { url: 'https://dev.example.com', description: 'Development' },
        { url: 'https://staging.example.com', description: 'Staging' },
        { url: 'https://api.example.com', description: 'Production' }
      ];

      render(<ServerSelector servers={servers} />);
      
      const select = screen.getByRole('combobox');
      expect(select).toBeInTheDocument();
    });

    it('should render all server options', () => {
      const servers: ServerConfig[] = [
        { url: 'https://dev.example.com', description: 'Development' },
        { url: 'https://staging.example.com', description: 'Staging' }
      ];

      render(<ServerSelector servers={servers} />);
      
      const options = screen.getAllByRole('option');
      expect(options).toHaveLength(2);
    });
  });

  describe('Requirement 19.2: Server descriptions as labels', () => {
    it('should display server descriptions as option labels', () => {
      const servers: ServerConfig[] = [
        { url: 'https://dev.example.com', description: 'Development' },
        { url: 'https://staging.example.com', description: 'Staging' }
      ];

      render(<ServerSelector servers={servers} />);
      
      expect(screen.getByText('Development')).toBeInTheDocument();
      expect(screen.getByText('Staging')).toBeInTheDocument();
    });

    it('should fall back to URL when description is missing', () => {
      const servers: ServerConfig[] = [
        { url: 'https://dev.example.com' },
        { url: 'https://staging.example.com', description: 'Staging' }
      ];

      render(<ServerSelector servers={servers} />);
      
      expect(screen.getByText('https://dev.example.com')).toBeInTheDocument();
      expect(screen.getByText('Staging')).toBeInTheDocument();
    });
  });

  describe('Requirement 19.3: Server selection persistence', () => {
    it('should store selected server in session storage on change', () => {
      const servers: ServerConfig[] = [
        { url: 'https://dev.example.com', description: 'Development' },
        { url: 'https://staging.example.com', description: 'Staging' }
      ];

      vi.mocked(serverUtils.getSelectedServer).mockReturnValue(null);

      render(<ServerSelector servers={servers} />);
      
      const select = screen.getByRole('combobox') as HTMLSelectElement;
      fireEvent.change(select, { target: { value: 'https://staging.example.com' } });
      
      expect(serverUtils.storeSelectedServer).toHaveBeenCalledWith('https://staging.example.com');
    });

    it('should initialize with first server if none stored', () => {
      const servers: ServerConfig[] = [
        { url: 'https://dev.example.com', description: 'Development' },
        { url: 'https://staging.example.com', description: 'Staging' }
      ];

      vi.mocked(serverUtils.getSelectedServer).mockReturnValue(null);

      render(<ServerSelector servers={servers} />);
      
      const select = screen.getByRole('combobox') as HTMLSelectElement;
      expect(select.value).toBe('https://dev.example.com');
    });

    it('should store first server on mount if none selected', () => {
      const servers: ServerConfig[] = [
        { url: 'https://dev.example.com', description: 'Development' },
        { url: 'https://staging.example.com', description: 'Staging' }
      ];

      vi.mocked(serverUtils.getSelectedServer).mockReturnValue(null);

      render(<ServerSelector servers={servers} />);
      
      expect(serverUtils.storeSelectedServer).toHaveBeenCalledWith('https://dev.example.com');
    });
  });

  describe('Requirement 19.5: Display currently selected server', () => {
    it('should display stored server selection on mount', () => {
      const servers: ServerConfig[] = [
        { url: 'https://dev.example.com', description: 'Development' },
        { url: 'https://staging.example.com', description: 'Staging' }
      ];

      vi.mocked(serverUtils.getSelectedServer).mockReturnValue('https://staging.example.com');

      render(<ServerSelector servers={servers} />);
      
      const select = screen.getByRole('combobox') as HTMLSelectElement;
      expect(select.value).toBe('https://staging.example.com');
    });

    it('should update displayed server when selection changes', () => {
      const servers: ServerConfig[] = [
        { url: 'https://dev.example.com', description: 'Development' },
        { url: 'https://staging.example.com', description: 'Staging' }
      ];

      vi.mocked(serverUtils.getSelectedServer).mockReturnValue('https://dev.example.com');

      render(<ServerSelector servers={servers} />);
      
      const select = screen.getByRole('combobox') as HTMLSelectElement;
      expect(select.value).toBe('https://dev.example.com');
      
      fireEvent.change(select, { target: { value: 'https://staging.example.com' } });
      expect(select.value).toBe('https://staging.example.com');
    });
  });
});
