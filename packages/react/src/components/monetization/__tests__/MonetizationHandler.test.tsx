import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { MonetizationHandler, withMonetization } from '../MonetizationHandler';
import * as usePaymentStatusModule from '../../../lib/use-payment-status';

// Mock the usePaymentStatus hook
vi.mock('../../../lib/use-payment-status', () => ({
  usePaymentStatus: vi.fn(),
}));

const Wrapper = ({ children }: { children: React.ReactNode }) => (
  <BrowserRouter>{children}</BrowserRouter>
);

describe('MonetizationHandler', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('when no monetization config', () => {
    it('should render children normally', () => {
      vi.spyOn(usePaymentStatusModule, 'usePaymentStatus').mockReturnValue({
        currentPlan: null,
        status: 'none',
        isFree: true,
        isSubscribed: false,
        loading: false,
        error: null,
      });

      render(
        <Wrapper>
          <MonetizationHandler>
            <div>Test Content</div>
          </MonetizationHandler>
        </Wrapper>
      );

      expect(screen.getByText('Test Content')).toBeInTheDocument();
    });

    it('should render children when monetized is false', () => {
      vi.spyOn(usePaymentStatusModule, 'usePaymentStatus').mockReturnValue({
        currentPlan: null,
        status: 'none',
        isFree: true,
        isSubscribed: false,
        loading: false,
        error: null,
      });

      render(
        <Wrapper>
          <MonetizationHandler config={{ monetized: false }}>
            <div>Test Content</div>
          </MonetizationHandler>
        </Wrapper>
      );

      expect(screen.getByText('Test Content')).toBeInTheDocument();
    });
  });

  describe('when loading payment status', () => {
    it('should show loading state', () => {
      vi.spyOn(usePaymentStatusModule, 'usePaymentStatus').mockReturnValue({
        currentPlan: null,
        status: 'none',
        isFree: true,
        isSubscribed: false,
        loading: true,
        error: null,
      });

      render(
        <Wrapper>
          <MonetizationHandler config={{ monetized: true }}>
            <div>Test Content</div>
          </MonetizationHandler>
        </Wrapper>
      );

      expect(screen.getByText('Loading...')).toBeInTheDocument();
      expect(screen.queryByText('Test Content')).not.toBeInTheDocument();
    });
  });

  describe('when user has access', () => {
    it('should render children for subscribed user', () => {
      vi.spyOn(usePaymentStatusModule, 'usePaymentStatus').mockReturnValue({
        currentPlan: 'pro',
        status: 'active',
        isFree: false,
        isSubscribed: true,
        loading: false,
        error: null,
      });

      render(
        <Wrapper>
          <MonetizationHandler config={{ monetized: true }}>
            <div>Test Content</div>
          </MonetizationHandler>
        </Wrapper>
      );

      expect(screen.getByText('Test Content')).toBeInTheDocument();
    });
  });

  describe('when user does not have access', () => {
    it('should show upgrade prompt for free user', () => {
      vi.spyOn(usePaymentStatusModule, 'usePaymentStatus').mockReturnValue({
        currentPlan: 'free',
        status: 'active',
        isFree: true,
        isSubscribed: true,
        loading: false,
        error: null,
      });

      render(
        <Wrapper>
          <MonetizationHandler config={{ monetized: true }}>
            <div>Test Content</div>
          </MonetizationHandler>
        </Wrapper>
      );

      expect(screen.getByText('Upgrade Required')).toBeInTheDocument();
      expect(screen.getByText('Upgrade to access this feature')).toBeInTheDocument();
      expect(screen.queryByText('Test Content')).not.toBeInTheDocument();
    });

    it('should show upgrade prompt for non-subscribed user', () => {
      vi.spyOn(usePaymentStatusModule, 'usePaymentStatus').mockReturnValue({
        currentPlan: null,
        status: 'none',
        isFree: true,
        isSubscribed: false,
        loading: false,
        error: null,
      });

      render(
        <Wrapper>
          <MonetizationHandler config={{ monetized: true }}>
            <div>Test Content</div>
          </MonetizationHandler>
        </Wrapper>
      );

      expect(screen.getByText('Upgrade Required')).toBeInTheDocument();
      expect(screen.queryByText('Test Content')).not.toBeInTheDocument();
    });

    it('should show custom message from config', () => {
      vi.spyOn(usePaymentStatusModule, 'usePaymentStatus').mockReturnValue({
        currentPlan: null,
        status: 'none',
        isFree: true,
        isSubscribed: false,
        loading: false,
        error: null,
      });

      render(
        <Wrapper>
          <MonetizationHandler
            config={{
              monetized: true,
              message: 'Upgrade to Pro to create meetings',
            }}
          >
            <div>Test Content</div>
          </MonetizationHandler>
        </Wrapper>
      );

      expect(screen.getByText('Upgrade to Pro to create meetings')).toBeInTheDocument();
    });

    it('should use custom upgrade prompt when provided', () => {
      vi.spyOn(usePaymentStatusModule, 'usePaymentStatus').mockReturnValue({
        currentPlan: null,
        status: 'none',
        isFree: true,
        isSubscribed: false,
        loading: false,
        error: null,
      });

      render(
        <Wrapper>
          <MonetizationHandler
            config={{ monetized: true }}
            upgradePrompt={<div>Custom Upgrade Prompt</div>}
          >
            <div>Test Content</div>
          </MonetizationHandler>
        </Wrapper>
      );

      expect(screen.getByText('Custom Upgrade Prompt')).toBeInTheDocument();
      expect(screen.queryByText('Upgrade Required')).not.toBeInTheDocument();
    });
  });

  describe('withMonetization HOC', () => {
    it('should wrap component with monetization handler', () => {
      vi.spyOn(usePaymentStatusModule, 'usePaymentStatus').mockReturnValue({
        currentPlan: 'pro',
        status: 'active',
        isFree: false,
        isSubscribed: true,
        loading: false,
        error: null,
      });

      const TestComponent = ({ text }: { text: string }) => <div>{text}</div>;
      const ProtectedComponent = withMonetization(TestComponent, {
        monetized: true,
        message: 'Upgrade required',
      });

      render(
        <Wrapper>
          <ProtectedComponent text="Protected Content" />
        </Wrapper>
      );

      expect(screen.getByText('Protected Content')).toBeInTheDocument();
    });

    it('should show upgrade prompt when access denied', () => {
      vi.spyOn(usePaymentStatusModule, 'usePaymentStatus').mockReturnValue({
        currentPlan: null,
        status: 'none',
        isFree: true,
        isSubscribed: false,
        loading: false,
        error: null,
      });

      const TestComponent = ({ text }: { text: string }) => <div>{text}</div>;
      const ProtectedComponent = withMonetization(TestComponent, {
        monetized: true,
        message: 'Upgrade to Pro',
      });

      render(
        <Wrapper>
          <ProtectedComponent text="Protected Content" />
        </Wrapper>
      );

      expect(screen.getByText('Upgrade to Pro')).toBeInTheDocument();
      expect(screen.queryByText('Protected Content')).not.toBeInTheDocument();
    });
  });
});
