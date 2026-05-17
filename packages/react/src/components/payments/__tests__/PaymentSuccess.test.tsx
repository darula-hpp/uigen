import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter, useSearchParams } from 'react-router-dom';
import { PaymentSuccess } from '../PaymentSuccess';

// Mock useSearchParams
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useSearchParams: vi.fn(),
  };
});

// Helper to render with router context
const renderWithRouter = (ui: React.ReactElement, initialEntries: string[] = ['/']) => {
  return render(<MemoryRouter initialEntries={initialEntries}>{ui}</MemoryRouter>);
};

describe('PaymentSuccess', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should render success message', () => {
    const mockSearchParams = new URLSearchParams();
    vi.mocked(useSearchParams).mockReturnValue([mockSearchParams, vi.fn()]);

    renderWithRouter(<PaymentSuccess />);
    
    expect(screen.getByText(/payment successful/i)).toBeInTheDocument();
  });

  it('should display dashboard link', () => {
    const mockSearchParams = new URLSearchParams();
    vi.mocked(useSearchParams).mockReturnValue([mockSearchParams, vi.fn()]);

    renderWithRouter(<PaymentSuccess />);
    
    const dashboardLink = screen.getByRole('link', { name: /go to dashboard/i });
    expect(dashboardLink).toBeInTheDocument();
    expect(dashboardLink).toHaveAttribute('href', '/dashboard');
  });

  it('should extract session_id from URL params', () => {
    const mockSearchParams = new URLSearchParams('session_id=cs_test_123456');
    vi.mocked(useSearchParams).mockReturnValue([mockSearchParams, vi.fn()]);

    renderWithRouter(<PaymentSuccess />, ['/payment/success?session_id=cs_test_123456']);
    
    expect(screen.getByText(/cs_test_123456/)).toBeInTheDocument();
  });

  it('should render without session_id in URL', () => {
    const mockSearchParams = new URLSearchParams();
    vi.mocked(useSearchParams).mockReturnValue([mockSearchParams, vi.fn()]);

    renderWithRouter(<PaymentSuccess />);
    
    // Should still render success message
    expect(screen.getByText(/payment successful/i)).toBeInTheDocument();
    // Should not display session ID section
    expect(screen.queryByText(/session id/i)).not.toBeInTheDocument();
  });

  it('should display checkmark icon', () => {
    const mockSearchParams = new URLSearchParams();
    vi.mocked(useSearchParams).mockReturnValue([mockSearchParams, vi.fn()]);

    const { container } = renderWithRouter(<PaymentSuccess />);
    
    // Check for SVG checkmark icon
    const svg = container.querySelector('svg');
    expect(svg).toBeInTheDocument();
  });

  it('should have consistent styling with payment components', () => {
    const mockSearchParams = new URLSearchParams();
    vi.mocked(useSearchParams).mockReturnValue([mockSearchParams, vi.fn()]);

    const { container } = renderWithRouter(<PaymentSuccess />);
    
    // Check for centered layout
    const wrapper = container.querySelector('.flex.items-center.justify-center');
    expect(wrapper).toBeInTheDocument();
  });
});
