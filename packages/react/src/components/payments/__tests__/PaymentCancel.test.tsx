import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { PaymentCancel } from '../PaymentCancel';

// Helper to render with router context
const renderWithRouter = (ui: React.ReactElement, initialEntries: string[] = ['/']) => {
  return render(<MemoryRouter initialEntries={initialEntries}>{ui}</MemoryRouter>);
};

describe('PaymentCancel', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should render cancellation message', () => {
    renderWithRouter(<PaymentCancel />);
    
    expect(screen.getByText(/payment cancelled/i)).toBeInTheDocument();
  });

  it('should display "Back to Pricing" link', () => {
    renderWithRouter(<PaymentCancel />);
    
    const pricingLink = screen.getByRole('link', { name: /back to pricing/i });
    expect(pricingLink).toBeInTheDocument();
    expect(pricingLink).toHaveAttribute('href', '/pricing');
  });

  it('should display "Go to Dashboard" link', () => {
    renderWithRouter(<PaymentCancel />);
    
    const dashboardLink = screen.getByRole('link', { name: /go to dashboard/i });
    expect(dashboardLink).toBeInTheDocument();
    expect(dashboardLink).toHaveAttribute('href', '/dashboard');
  });

  it('should display info icon', () => {
    const { container } = renderWithRouter(<PaymentCancel />);
    
    // Check for SVG info icon
    const svg = container.querySelector('svg');
    expect(svg).toBeInTheDocument();
  });

  it('should have consistent styling with payment components', () => {
    const { container } = renderWithRouter(<PaymentCancel />);
    
    // Check for centered layout
    const wrapper = container.querySelector('.flex.items-center.justify-center');
    expect(wrapper).toBeInTheDocument();
  });

  it('should display helpful message about trying again', () => {
    renderWithRouter(<PaymentCancel />);
    
    // Check for message encouraging user to try again
    expect(screen.getByText(/try again/i)).toBeInTheDocument();
  });
});
