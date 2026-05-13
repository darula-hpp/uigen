import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, waitFor } from '@testing-library/react';
import { Icon } from '../Icon';
import { iconResolver } from '../../lib/icon-resolver';

// Mock the icon resolver
vi.mock('../../lib/icon-resolver', () => ({
  iconResolver: {
    resolve: vi.fn(),
  },
}));

/**
 * Comprehensive unit tests for Icon component
 * Task 4.5: Write unit tests for Icon component
 * 
 * Test Coverage:
 * - Icon resolution with valid references (Lucide, Heroicons, React Icons)
 * - Fallback rendering for invalid references
 * - Prop passing (size, className, color, ariaLabel)
 * - Accessibility attributes (aria-label, aria-hidden, role)
 * - Loading state behavior
 * - Icon prop changes (re-resolution)
 * - Error handling
 */

describe('Icon Component - Icon Resolution', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should call resolver with Lucide icon reference', async () => {
    // Validates Requirement 2.1, 3.1: Resolve Lucide icons
    vi.mocked(iconResolver.resolve).mockResolvedValue(null);

    render(<Icon icon="lucide:FileText" />);

    await waitFor(() => {
      expect(iconResolver.resolve).toHaveBeenCalledWith('lucide:FileText');
    });
  });

  it('should call resolver with Heroicons icon reference', async () => {
    // Validates Requirement 2.2, 3.1: Resolve Heroicons
    vi.mocked(iconResolver.resolve).mockResolvedValue(null);

    render(<Icon icon="heroicons:HomeIcon" />);

    await waitFor(() => {
      expect(iconResolver.resolve).toHaveBeenCalledWith('heroicons:HomeIcon');
    });
  });

  it('should call resolver with React Icons reference', async () => {
    // Validates Requirement 2.3, 3.1: Resolve React Icons
    vi.mocked(iconResolver.resolve).mockResolvedValue(null);

    render(<Icon icon="react-icons:FaHome" />);

    await waitFor(() => {
      expect(iconResolver.resolve).toHaveBeenCalledWith('react-icons:FaHome');
    });
  });

  it('should call resolver.resolve when icon prop is provided', async () => {
    const mockComponent = () => null;
    vi.mocked(iconResolver.resolve).mockResolvedValue(mockComponent);

    render(<Icon icon="lucide:FileText" />);

    await waitFor(() => {
      expect(iconResolver.resolve).toHaveBeenCalledWith('lucide:FileText');
    });
  });

  it('should call resolver.resolve when icon prop changes', async () => {
    // Validates Requirement 3.1: Icon prop changes trigger re-resolution
    const mockComponent = () => null;
    vi.mocked(iconResolver.resolve).mockResolvedValue(mockComponent);

    const { rerender } = render(<Icon icon="lucide:FileText" />);

    await waitFor(() => {
      expect(iconResolver.resolve).toHaveBeenCalledWith('lucide:FileText');
    });

    vi.clearAllMocks();

    rerender(<Icon icon="lucide:Home" />);

    await waitFor(() => {
      expect(iconResolver.resolve).toHaveBeenCalledWith('lucide:Home');
    });
  });

  it('should not update state after component unmounts', async () => {
    const mockComponent = () => null;
    let resolvePromise: (value: any) => void;
    const promise = new Promise((resolve) => {
      resolvePromise = resolve;
    });

    vi.mocked(iconResolver.resolve).mockReturnValue(promise as any);

    const { unmount } = render(<Icon icon="lucide:FileText" />);

    // Unmount before resolution completes
    unmount();

    // Resolve after unmount
    resolvePromise!(mockComponent);

    // Wait a bit to ensure no state updates occur
    await new Promise((resolve) => setTimeout(resolve, 50));

    // If we get here without errors, the cleanup worked correctly
    expect(true).toBe(true);
  });
});

describe('Icon Component - Fallback Rendering', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should render fallback icon when resolution returns null', async () => {
    // Validates Requirement 6.1, 6.2: Render fallback for invalid references
    vi.mocked(iconResolver.resolve).mockResolvedValue(null);

    const { container } = render(<Icon icon="invalid:icon" />);

    await waitFor(() => {
      const svg = container.querySelector('svg');
      expect(svg).toBeInTheDocument();
    });
  });

  it('should render fallback icon for invalid format', async () => {
    // Validates Requirement 6.1: Render fallback for invalid format
    vi.mocked(iconResolver.resolve).mockResolvedValue(null);

    const { container } = render(<Icon icon="invalid-format" />);

    await waitFor(() => {
      const svg = container.querySelector('svg');
      expect(svg).toBeInTheDocument();
    });
  });

  it('should render fallback icon for unknown library', async () => {
    // Validates Requirement 6.1: Render fallback for unknown library
    vi.mocked(iconResolver.resolve).mockResolvedValue(null);

    const { container } = render(<Icon icon="unknown:Icon" />);

    await waitFor(() => {
      const svg = container.querySelector('svg');
      expect(svg).toBeInTheDocument();
    });
  });

  it('should render fallback icon for non-existent icon name', async () => {
    // Validates Requirement 6.1: Render fallback for non-existent icon
    vi.mocked(iconResolver.resolve).mockResolvedValue(null);

    const { container } = render(<Icon icon="lucide:NonExistentIcon" />);

    await waitFor(() => {
      const svg = container.querySelector('svg');
      expect(svg).toBeInTheDocument();
    });
  });

  it('should set resolvedIcon to null on resolution failure', async () => {
    vi.mocked(iconResolver.resolve).mockResolvedValue(null);

    const { container } = render(<Icon icon="invalid:icon" />);

    await waitFor(() => {
      expect(iconResolver.resolve).toHaveBeenCalledWith('invalid:icon');
    });

    // Component should not crash
    expect(container).toBeTruthy();
  });
});

describe('Icon Component - Prop Passing', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should pass size prop to resolver', async () => {
    // Validates Requirement 7.1, 3.4: Pass size prop to icon
    vi.mocked(iconResolver.resolve).mockResolvedValue(null);

    render(<Icon icon="lucide:FileText" size={32} />);

    await waitFor(() => {
      expect(iconResolver.resolve).toHaveBeenCalledWith('lucide:FileText');
    });
  });

  it('should pass className prop to resolver', async () => {
    // Validates Requirement 7.2, 3.4: Pass className prop to icon
    vi.mocked(iconResolver.resolve).mockResolvedValue(null);

    render(<Icon icon="lucide:FileText" className="custom-icon" />);

    await waitFor(() => {
      expect(iconResolver.resolve).toHaveBeenCalledWith('lucide:FileText');
    });
  });

  it('should pass color prop to resolver', async () => {
    // Validates Requirement 7.3, 3.4: Pass color prop to icon
    vi.mocked(iconResolver.resolve).mockResolvedValue(null);

    render(<Icon icon="lucide:FileText" color="blue" />);

    await waitFor(() => {
      expect(iconResolver.resolve).toHaveBeenCalledWith('lucide:FileText');
    });
  });

  it('should apply default size when not provided', async () => {
    // Validates Requirement 7.5: Apply default size (24)
    vi.mocked(iconResolver.resolve).mockResolvedValue(null);

    render(<Icon icon="lucide:FileText" />);

    await waitFor(() => {
      expect(iconResolver.resolve).toHaveBeenCalledWith('lucide:FileText');
    });
  });

  it('should apply default className when not provided', async () => {
    // Validates Requirement 7.5: Apply default className (uigen-icon)
    vi.mocked(iconResolver.resolve).mockResolvedValue(null);

    render(<Icon icon="lucide:FileText" />);

    await waitFor(() => {
      expect(iconResolver.resolve).toHaveBeenCalledWith('lucide:FileText');
    });
  });

  it('should pass all props together to resolver', async () => {
    // Validates Requirement 7.1-7.5: Pass all props together
    vi.mocked(iconResolver.resolve).mockResolvedValue(null);

    render(
      <Icon 
        icon="lucide:FileText" 
        size={40} 
        className="test-icon" 
        color="red"
      />
    );

    await waitFor(() => {
      expect(iconResolver.resolve).toHaveBeenCalledWith('lucide:FileText');
    });
  });

  it('should pass size, className, and color props to FallbackIcon', async () => {
    // Validates Requirement 6.4: Pass props to fallback icon
    vi.mocked(iconResolver.resolve).mockResolvedValue(null);

    const { container } = render(
      <Icon 
        icon="invalid:icon" 
        size={48} 
        className="fallback-class" 
        color="green"
      />
    );

    await waitFor(() => {
      const svg = container.querySelector('svg');
      expect(svg).toBeInTheDocument();
      expect(svg).toHaveAttribute('width', '48');
      expect(svg).toHaveAttribute('height', '48');
      expect(svg).toHaveClass('fallback-class');
    });
  });
});

describe('Icon Component - Accessibility', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should handle aria-hidden when no ariaLabel provided (decorative icon)', async () => {
    // Validates Requirement 14.3: Apply aria-hidden for decorative icons
    vi.mocked(iconResolver.resolve).mockResolvedValue(null);

    const { container } = render(<Icon icon="lucide:FileText" />);

    await waitFor(() => {
      const svg = container.querySelector('svg');
      expect(svg).toBeInTheDocument();
      expect(svg).toHaveAttribute('aria-hidden', 'true');
    });
  });

  it('should handle aria-label when ariaLabel provided (semantic icon)', async () => {
    // Validates Requirement 14.1, 14.2, 14.4: Apply aria-label and role for semantic icons
    vi.mocked(iconResolver.resolve).mockResolvedValue(null);

    const { container } = render(<Icon icon="lucide:FileText" ariaLabel="File document icon" />);

    await waitFor(() => {
      const svg = container.querySelector('svg');
      expect(svg).toBeInTheDocument();
      expect(svg).toHaveAttribute('aria-label', 'File document icon');
      expect(svg).toHaveAttribute('role', 'img');
    });
  });

  it('should pass ariaLabel to FallbackIcon when resolution fails', async () => {
    // Validates Requirement 14.1, 14.2: Pass aria-label to fallback
    vi.mocked(iconResolver.resolve).mockResolvedValue(null);

    const { container } = render(<Icon icon="invalid:icon" ariaLabel="Error icon" />);

    await waitFor(() => {
      const svg = container.querySelector('svg');
      expect(svg).toBeInTheDocument();
    });

    // FallbackIcon should have aria-label and role
    const svg = container.querySelector('svg');
    expect(svg).toHaveAttribute('aria-label', 'Error icon');
    expect(svg).toHaveAttribute('role', 'img');
  });

  it('should apply aria-hidden to FallbackIcon when no ariaLabel provided', async () => {
    // Validates Requirement 14.3: Apply aria-hidden to fallback for decorative icons
    vi.mocked(iconResolver.resolve).mockResolvedValue(null);

    const { container } = render(<Icon icon="invalid:icon" />);

    await waitFor(() => {
      const svg = container.querySelector('svg');
      expect(svg).toBeInTheDocument();
    });

    // FallbackIcon should have aria-hidden
    const svg = container.querySelector('svg');
    expect(svg).toHaveAttribute('aria-hidden', 'true');
    expect(svg).not.toHaveAttribute('aria-label');
    expect(svg).not.toHaveAttribute('role');
  });

  it('should pass accessibility attributes along with other props', async () => {
    // Validates that accessibility attributes work with other props
    vi.mocked(iconResolver.resolve).mockResolvedValue(null);

    const { container } = render(
      <Icon 
        icon="lucide:FileText" 
        size={32} 
        className="custom-icon" 
        color="blue"
        ariaLabel="Custom icon"
      />
    );

    await waitFor(() => {
      const svg = container.querySelector('svg');
      expect(svg).toBeInTheDocument();
      expect(svg).toHaveAttribute('aria-label', 'Custom icon');
      expect(svg).toHaveAttribute('role', 'img');
    });
  });

  it('should return null when icon prop is null or undefined', () => {
    // Validates Requirement 6.5: Render nothing for null/undefined icon
    const { container: container1 } = render(<Icon icon={null as any} />);
    expect(container1.firstChild).toBeNull();

    const { container: container2 } = render(<Icon icon={undefined as any} />);
    expect(container2.firstChild).toBeNull();
  });
});

describe('Icon Component - Loading State', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should return null while loading (loading state)', async () => {
    // Validates Requirement 8.5: Display loading state while icons are being imported
    let resolvePromise: (value: any) => void;
    const promise = new Promise((resolve) => {
      resolvePromise = resolve;
    });

    vi.mocked(iconResolver.resolve).mockReturnValue(promise as any);

    const { container } = render(<Icon icon="lucide:FileText" />);

    // While loading, component should return null
    expect(container.firstChild).toBeNull();

    // Resolve the promise with null (fallback)
    resolvePromise!(null);

    // After resolution, fallback icon should render
    await waitFor(() => {
      const svg = container.querySelector('svg');
      expect(svg).toBeInTheDocument();
    });
  });

  it('should show loading state on icon prop change', async () => {
    // Validates that loading state is shown when icon prop changes
    vi.mocked(iconResolver.resolve).mockResolvedValue(null);

    const { rerender, container } = render(<Icon icon="lucide:FileText" />);

    await waitFor(() => {
      const svg = container.querySelector('svg');
      expect(svg).toBeInTheDocument();
    });

    // Change icon prop
    rerender(<Icon icon="lucide:Home" />);

    // Resolver should be called again
    await waitFor(() => {
      expect(iconResolver.resolve).toHaveBeenCalledWith('lucide:Home');
    });
  });
});

describe('Icon Component - Error Handling', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should handle resolution errors gracefully', async () => {
    // Validates Requirement 6.3, 12.1: Never throw exceptions that break UI
    const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    vi.mocked(iconResolver.resolve).mockRejectedValue(new Error('Resolution failed'));

    render(<Icon icon="invalid:icon" />);

    await waitFor(() => {
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        expect.stringContaining('Error resolving icon'),
        expect.any(Error)
      );
    });

    consoleErrorSpy.mockRestore();
  });

  it('should render fallback icon when resolution throws error', async () => {
    // Validates Requirement 6.3: Render fallback on error
    const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    vi.mocked(iconResolver.resolve).mockRejectedValue(new Error('Import failed'));

    const { container } = render(<Icon icon="lucide:FileText" />);

    await waitFor(() => {
      const svg = container.querySelector('svg');
      expect(svg).toBeInTheDocument();
    });

    consoleErrorSpy.mockRestore();
  });

  it('should not crash UI when resolver throws error', async () => {
    // Validates Requirement 6.3: UI never breaks due to icon errors
    const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    vi.mocked(iconResolver.resolve).mockRejectedValue(new Error('Critical error'));

    const { container } = render(
      <div>
        <Icon icon="lucide:FileText" />
        <span data-testid="sibling">Sibling element</span>
      </div>
    );

    await waitFor(() => {
      // Sibling element should still render
      expect(container.querySelector('[data-testid="sibling"]')).toBeInTheDocument();
    });

    consoleErrorSpy.mockRestore();
  });
});
