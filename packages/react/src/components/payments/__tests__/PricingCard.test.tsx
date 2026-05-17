import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter, useNavigate } from 'react-router-dom';
import { PricingCard } from '../PricingCard';
import type { PaymentProduct } from '@uigen-dev/core';

// Mock useNavigate
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useNavigate: vi.fn(),
  };
});

// Helper to render with router context
const renderWithRouter = (ui: React.ReactElement) => {
  return render(<MemoryRouter>{ui}</MemoryRouter>);
};

describe('PricingCard', () => {
  let mockNavigate: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    mockNavigate = vi.fn();
    vi.mocked(useNavigate).mockReturnValue(mockNavigate);
  });

  const mockProduct: PaymentProduct = {
    id: 'pro-monthly',
    name: 'Professional',
    description: 'Full access to all features',
    type: 'subscription',
    price: 2900,
    currency: 'usd',
    interval: 'month',
    features: ['Unlimited meetings', 'Priority support'],
  };

  it('should render product name', () => {
    renderWithRouter(<PricingCard product={mockProduct} />);
    expect(screen.getByText('Professional')).toBeInTheDocument();
  });

  it('should render product description', () => {
    renderWithRouter(<PricingCard product={mockProduct} />);
    expect(screen.getByText('Full access to all features')).toBeInTheDocument();
  });

  it('should format price correctly', () => {
    renderWithRouter(<PricingCard product={mockProduct} />);
    expect(screen.getByText('$29')).toBeInTheDocument();
  });

  it('should display interval for subscriptions', () => {
    renderWithRouter(<PricingCard product={mockProduct} />);
    expect(screen.getByText(/per month/i)).toBeInTheDocument();
  });

  it('should render features list', () => {
    renderWithRouter(<PricingCard product={mockProduct} />);
    expect(screen.getByText('Unlimited meetings')).toBeInTheDocument();
    expect(screen.getByText('Priority support')).toBeInTheDocument();
  });

  it('should call onSelect when button clicked for paid plan', () => {
    const onSelect = vi.fn();
    renderWithRouter(<PricingCard product={mockProduct} onSelect={onSelect} />);
    
    const button = screen.getByRole('button');
    fireEvent.click(button);
    
    expect(onSelect).toHaveBeenCalledTimes(1);
    expect(mockNavigate).not.toHaveBeenCalled();
  });

  it('should show highlighted badge when highlighted', () => {
    const highlightedProduct = { ...mockProduct, highlighted: true };
    const { container } = renderWithRouter(<PricingCard product={highlightedProduct} highlighted={true} />);
    
    const card = container.querySelector('.pricing-card');
    expect(card).toHaveClass('highlighted');
  });

  it('should handle custom price', () => {
    const customProduct: PaymentProduct = {
      ...mockProduct,
      price: 'custom',
    };
    
    renderWithRouter(<PricingCard product={customProduct} />);
    expect(screen.getByText('Custom')).toBeInTheDocument();
  });

  it('should handle free product', () => {
    const freeProduct: PaymentProduct = {
      ...mockProduct,
      price: 0,
    };
    
    renderWithRouter(<PricingCard product={freeProduct} />);
    expect(screen.getByText('$0')).toBeInTheDocument();
  });

  it('should handle one-time payment', () => {
    const oneTimeProduct: PaymentProduct = {
      ...mockProduct,
      type: 'one-time',
      interval: undefined,
    };
    
    renderWithRouter(<PricingCard product={oneTimeProduct} />);
    expect(screen.queryByText(/per month/i)).not.toBeInTheDocument();
  });

  it('should show loading state', () => {
    renderWithRouter(<PricingCard product={mockProduct} loading />);
    
    const button = screen.getByRole('button');
    expect(button).toBeDisabled();
    expect(button).toHaveTextContent('Processing...');
  });

  it('should handle different currencies', () => {
    const eurProduct: PaymentProduct = {
      ...mockProduct,
      currency: 'eur',
    };
    
    renderWithRouter(<PricingCard product={eurProduct} />);
    expect(screen.getByText(/€29/)).toBeInTheDocument();
  });

  it('should handle yearly interval', () => {
    const yearlyProduct: PaymentProduct = {
      ...mockProduct,
      interval: 'year',
    };
    
    renderWithRouter(<PricingCard product={yearlyProduct} />);
    expect(screen.getByText(/per year/i)).toBeInTheDocument();
  });

  it('should handle custom interval count', () => {
    const customIntervalProduct: PaymentProduct = {
      ...mockProduct,
      intervalCount: 3,
    };
    
    renderWithRouter(<PricingCard product={customIntervalProduct} />);
    expect(screen.getByText(/every 3 months/i)).toBeInTheDocument();
  });

  it('should render without features', () => {
    const noFeaturesProduct: PaymentProduct = {
      ...mockProduct,
      features: undefined,
    };
    
    renderWithRouter(<PricingCard product={noFeaturesProduct} />);
    expect(screen.queryByRole('list')).not.toBeInTheDocument();
  });

  it('should render without description', () => {
    const noDescProduct: PaymentProduct = {
      ...mockProduct,
      description: undefined,
    };
    
    renderWithRouter(<PricingCard product={noDescProduct} />);
    expect(screen.queryByText('Full access to all features')).not.toBeInTheDocument();
  });

  it('should apply custom className', () => {
    const { container } = renderWithRouter(
      <PricingCard product={mockProduct} className="custom-class" />
    );
    
    expect(container.firstChild).toHaveClass('custom-class');
  });

  it('should show contact sales for custom price', () => {
    const customProduct: PaymentProduct = {
      ...mockProduct,
      price: 'custom',
    };
    
    renderWithRouter(<PricingCard product={customProduct} />);
    expect(screen.getByText(/contact sales/i)).toBeInTheDocument();
  });

  describe('CTA button text', () => {
    it('should display "Get Started" for free plan', () => {
      const freeProduct: PaymentProduct = {
        ...mockProduct,
        price: 0,
      };
      
      renderWithRouter(<PricingCard product={freeProduct} />);
      const button = screen.getByRole('button');
      expect(button).toHaveTextContent('Get Started');
    });

    it('should display "Contact Sales" for enterprise plan with custom pricing', () => {
      const enterpriseProduct: PaymentProduct = {
        ...mockProduct,
        price: 'custom',
      };
      
      renderWithRouter(<PricingCard product={enterpriseProduct} />);
      const button = screen.getByRole('button');
      expect(button).toHaveTextContent('Contact Sales');
    });

    it('should display "Subscribe" for subscription plan', () => {
      const subscriptionProduct: PaymentProduct = {
        ...mockProduct,
        type: 'subscription',
        price: 2900,
      };
      
      renderWithRouter(<PricingCard product={subscriptionProduct} />);
      const button = screen.getByRole('button');
      expect(button).toHaveTextContent('Subscribe');
    });

    it('should display "Buy Now" for one-time payment plan', () => {
      const oneTimeProduct: PaymentProduct = {
        ...mockProduct,
        type: 'one-time',
        price: 4900,
      };
      
      renderWithRouter(<PricingCard product={oneTimeProduct} />);
      const button = screen.getByRole('button');
      expect(button).toHaveTextContent('Buy Now');
    });

    it('should display "Get Started" for usage-based plan', () => {
      const usageBasedProduct: PaymentProduct = {
        ...mockProduct,
        type: 'usage-based',
        price: 100,
      };
      
      renderWithRouter(<PricingCard product={usageBasedProduct} />);
      const button = screen.getByRole('button');
      expect(button).toHaveTextContent('Get Started');
    });

    it('should use custom CTA text when provided', () => {
      renderWithRouter(<PricingCard product={mockProduct} ctaText="Custom CTA" />);
      const button = screen.getByRole('button');
      expect(button).toHaveTextContent('Custom CTA');
    });
  });

  describe('Plan-specific click handling (Requirements 8.1, 8.3, 9.1, 9.3)', () => {
    it('should navigate to /signup for free plan without calling onSelect', () => {
      const freeProduct: PaymentProduct = {
        ...mockProduct,
        price: 0,
      };
      const onSelect = vi.fn();
      
      renderWithRouter(<PricingCard product={freeProduct} onSelect={onSelect} />);
      const button = screen.getByRole('button');
      fireEvent.click(button);
      
      expect(mockNavigate).toHaveBeenCalledWith('/signup');
      expect(onSelect).not.toHaveBeenCalled();
    });

    it('should navigate to /contact for enterprise plan without calling onSelect', () => {
      const enterpriseProduct: PaymentProduct = {
        ...mockProduct,
        price: 'custom',
      };
      const onSelect = vi.fn();
      
      renderWithRouter(<PricingCard product={enterpriseProduct} onSelect={onSelect} />);
      const button = screen.getByRole('button');
      fireEvent.click(button);
      
      expect(mockNavigate).toHaveBeenCalledWith('/contact');
      expect(onSelect).not.toHaveBeenCalled();
    });

    it('should call onSelect for pro plan without navigating', () => {
      const proProduct: PaymentProduct = {
        ...mockProduct,
        price: 2900,
      };
      const onSelect = vi.fn();
      
      renderWithRouter(<PricingCard product={proProduct} onSelect={onSelect} />);
      const button = screen.getByRole('button');
      fireEvent.click(button);
      
      expect(onSelect).toHaveBeenCalledTimes(1);
      expect(mockNavigate).not.toHaveBeenCalled();
    });

    it('should not call onSelect if not provided for paid plan', () => {
      const proProduct: PaymentProduct = {
        ...mockProduct,
        price: 2900,
      };
      
      renderWithRouter(<PricingCard product={proProduct} />);
      const button = screen.getByRole('button');
      fireEvent.click(button);
      
      expect(mockNavigate).not.toHaveBeenCalled();
    });
  });
});
