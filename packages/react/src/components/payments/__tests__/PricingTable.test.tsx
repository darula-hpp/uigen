import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { PricingTable } from '../PricingTable';
import type { PaymentProduct } from '@uigen/core';

// Mock useUIGenConfig
vi.mock('../../../lib/use-payment-config', () => ({
  usePaymentConfig: () => ({
    providers: [],
    products: [],
    primaryProvider: null,
    isConfigured: false,
  }),
}));

describe('PricingTable', () => {
  const mockProducts: PaymentProduct[] = [
    {
      id: 'free',
      name: 'Free',
      type: 'subscription',
      price: 0,
      interval: 'month',
      features: ['10 meetings per month'],
    },
    {
      id: 'pro-monthly',
      name: 'Professional',
      type: 'subscription',
      price: 2900,
      interval: 'month',
      highlighted: true,
      features: ['Unlimited meetings', 'Priority support'],
    },
    {
      id: 'enterprise',
      name: 'Enterprise',
      type: 'subscription',
      price: 'custom',
      interval: 'year',
      features: ['Everything in Pro', 'Dedicated support'],
    },
  ];

  it('should render all products', () => {
    render(<PricingTable products={mockProducts} />);
    
    expect(screen.getByText('Free')).toBeInTheDocument();
    expect(screen.getByText('Professional')).toBeInTheDocument();
    expect(screen.getByText('Enterprise')).toBeInTheDocument();
  });

  it('should render title when provided', () => {
    render(<PricingTable products={mockProducts} title="Choose Your Plan" />);
    expect(screen.getByText('Choose Your Plan')).toBeInTheDocument();
  });

  it('should render subtitle when provided', () => {
    render(
      <PricingTable
        products={mockProducts}
        title="Pricing"
        subtitle="Select the plan that works for you"
      />
    );
    expect(screen.getByText('Select the plan that works for you')).toBeInTheDocument();
  });

  it('should call onSelectPlan when product selected', () => {
    const onSelectPlan = vi.fn();
    render(<PricingTable products={mockProducts} onSelectPlan={onSelectPlan} />);
    
    const buttons = screen.getAllByRole('button');
    buttons[0].click();
    
    expect(onSelectPlan).toHaveBeenCalledWith('free');
  });

  it('should render with custom columns', () => {
    const { container } = render(
      <PricingTable products={mockProducts} columns={2} />
    );
    
    const grid = container.querySelector('.pricing-table');
    expect(grid).toHaveStyle({ gridTemplateColumns: 'repeat(2, 1fr)' });
  });

  it('should render empty state when no products', () => {
    render(<PricingTable products={[]} />);
    expect(screen.getByText(/no pricing plans available/i)).toBeInTheDocument();
  });

  it('should highlight recommended product', () => {
    render(<PricingTable products={mockProducts} />);
    
    const proCard = screen.getByText('Professional').closest('.pricing-card');
    expect(proCard).toHaveClass('highlighted');
  });

  it('should render loading state for specific product', () => {
    render(
      <PricingTable
        products={mockProducts}
        loadingProductId="pro-monthly"
      />
    );
    
    const buttons = screen.getAllByRole('button');
    const proButton = buttons.find(btn => btn.closest('.pricing-card')?.textContent?.includes('Professional'));
    
    expect(proButton).toBeDisabled();
  });

  it('should handle single product', () => {
    render(<PricingTable products={[mockProducts[0]]} />);
    expect(screen.getByText('Free')).toBeInTheDocument();
    expect(screen.queryByText('Professional')).not.toBeInTheDocument();
  });

  it('should apply custom className', () => {
    const { container } = render(
      <PricingTable products={mockProducts} className="custom-table" />
    );
    
    expect(container.firstChild).toHaveClass('custom-table');
  });

  it('should render with default 3 columns', () => {
    const { container } = render(<PricingTable products={mockProducts} />);
    
    const grid = container.querySelector('.pricing-table');
    expect(grid).toHaveStyle({ gridTemplateColumns: 'repeat(3, 1fr)' });
  });

  it('should handle products without features', () => {
    const productsNoFeatures: PaymentProduct[] = [
      {
        id: 'basic',
        name: 'Basic',
        type: 'subscription',
        price: 1000,
        interval: 'month',
      },
    ];
    
    render(<PricingTable products={productsNoFeatures} />);
    expect(screen.getByText('Basic')).toBeInTheDocument();
  });
});
