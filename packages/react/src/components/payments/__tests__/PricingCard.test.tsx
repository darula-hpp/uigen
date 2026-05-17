import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { PricingCard } from '../PricingCard';
import type { PaymentProduct } from '@uigen/core';

describe('PricingCard', () => {
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
    render(<PricingCard product={mockProduct} />);
    expect(screen.getByText('Professional')).toBeInTheDocument();
  });

  it('should render product description', () => {
    render(<PricingCard product={mockProduct} />);
    expect(screen.getByText('Full access to all features')).toBeInTheDocument();
  });

  it('should format price correctly', () => {
    render(<PricingCard product={mockProduct} />);
    expect(screen.getByText('$29.00')).toBeInTheDocument();
  });

  it('should display interval for subscriptions', () => {
    render(<PricingCard product={mockProduct} />);
    expect(screen.getByText(/per month/i)).toBeInTheDocument();
  });

  it('should render features list', () => {
    render(<PricingCard product={mockProduct} />);
    expect(screen.getByText('Unlimited meetings')).toBeInTheDocument();
    expect(screen.getByText('Priority support')).toBeInTheDocument();
  });

  it('should call onSelect when button clicked', () => {
    const onSelect = vi.fn();
    render(<PricingCard product={mockProduct} onSelect={onSelect} />);
    
    const button = screen.getByRole('button');
    fireEvent.click(button);
    
    expect(onSelect).toHaveBeenCalledTimes(1);
  });

  it('should show highlighted badge when highlighted', () => {
    const highlightedProduct = { ...mockProduct, highlighted: true };
    render(<PricingCard product={highlightedProduct} />);
    
    expect(screen.getByText(/recommended/i)).toBeInTheDocument();
  });

  it('should handle custom price', () => {
    const customProduct: PaymentProduct = {
      ...mockProduct,
      price: 'custom',
    };
    
    render(<PricingCard product={customProduct} />);
    expect(screen.getByText('Custom')).toBeInTheDocument();
  });

  it('should handle free product', () => {
    const freeProduct: PaymentProduct = {
      ...mockProduct,
      price: 0,
    };
    
    render(<PricingCard product={freeProduct} />);
    expect(screen.getByText('$0.00')).toBeInTheDocument();
  });

  it('should handle one-time payment', () => {
    const oneTimeProduct: PaymentProduct = {
      ...mockProduct,
      type: 'one-time',
      interval: undefined,
    };
    
    render(<PricingCard product={oneTimeProduct} />);
    expect(screen.queryByText(/per month/i)).not.toBeInTheDocument();
  });

  it('should show loading state', () => {
    render(<PricingCard product={mockProduct} loading />);
    
    const button = screen.getByRole('button');
    expect(button).toBeDisabled();
    expect(button).toHaveTextContent(/loading/i);
  });

  it('should handle different currencies', () => {
    const eurProduct: PaymentProduct = {
      ...mockProduct,
      currency: 'eur',
    };
    
    render(<PricingCard product={eurProduct} />);
    expect(screen.getByText(/€29.00/)).toBeInTheDocument();
  });

  it('should handle yearly interval', () => {
    const yearlyProduct: PaymentProduct = {
      ...mockProduct,
      interval: 'year',
    };
    
    render(<PricingCard product={yearlyProduct} />);
    expect(screen.getByText(/per year/i)).toBeInTheDocument();
  });

  it('should handle custom interval count', () => {
    const customIntervalProduct: PaymentProduct = {
      ...mockProduct,
      intervalCount: 3,
    };
    
    render(<PricingCard product={customIntervalProduct} />);
    expect(screen.getByText(/every 3 months/i)).toBeInTheDocument();
  });

  it('should render without features', () => {
    const noFeaturesProduct: PaymentProduct = {
      ...mockProduct,
      features: undefined,
    };
    
    render(<PricingCard product={noFeaturesProduct} />);
    expect(screen.queryByRole('list')).not.toBeInTheDocument();
  });

  it('should render without description', () => {
    const noDescProduct: PaymentProduct = {
      ...mockProduct,
      description: undefined,
    };
    
    render(<PricingCard product={noDescProduct} />);
    expect(screen.queryByText('Full access to all features')).not.toBeInTheDocument();
  });

  it('should apply custom className', () => {
    const { container } = render(
      <PricingCard product={mockProduct} className="custom-class" />
    );
    
    expect(container.firstChild).toHaveClass('custom-class');
  });

  it('should show contact sales for custom price', () => {
    const customProduct: PaymentProduct = {
      ...mockProduct,
      price: 'custom',
    };
    
    render(<PricingCard product={customProduct} />);
    expect(screen.getByText(/contact sales/i)).toBeInTheDocument();
  });
});
