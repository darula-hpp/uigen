import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { UpgradePrompt } from '../UpgradePrompt';

const mockNavigate = vi.fn();

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

const Wrapper = ({ children }: { children: React.ReactNode }) => (
  <BrowserRouter>{children}</BrowserRouter>
);

describe('UpgradePrompt', () => {
  beforeEach(() => {
    mockNavigate.mockClear();
  });

  describe('inline mode', () => {
    it('should render message in inline mode', () => {
      render(
        <Wrapper>
          <UpgradePrompt message="Upgrade to Pro" mode="inline" />
        </Wrapper>
      );

      expect(screen.getByText('Upgrade Required')).toBeInTheDocument();
      expect(screen.getByText('Upgrade to Pro')).toBeInTheDocument();
    });

    it('should navigate to pricing page on button click', () => {
      render(
        <Wrapper>
          <UpgradePrompt message="Upgrade to Pro" mode="inline" />
        </Wrapper>
      );

      const button = screen.getByRole('button', { name: /View Plans/i });
      fireEvent.click(button);

      expect(mockNavigate).toHaveBeenCalledWith('/pricing');
    });

    it('should use custom redirectTo URL', () => {
      render(
        <Wrapper>
          <UpgradePrompt message="Upgrade to Pro" redirectTo="/custom-pricing" mode="inline" />
        </Wrapper>
      );

      const button = screen.getByRole('button', { name: /View Plans/i });
      fireEvent.click(button);

      expect(mockNavigate).toHaveBeenCalledWith('/custom-pricing');
    });

    it('should use custom button text', () => {
      render(
        <Wrapper>
          <UpgradePrompt message="Upgrade to Pro" buttonText="Upgrade Now" mode="inline" />
        </Wrapper>
      );

      expect(screen.getByRole('button', { name: /Upgrade Now/i })).toBeInTheDocument();
    });

    it('should have lock icon', () => {
      const { container } = render(
        <Wrapper>
          <UpgradePrompt message="Upgrade to Pro" mode="inline" />
        </Wrapper>
      );

      const icon = container.querySelector('svg');
      expect(icon).toBeInTheDocument();
    });
  });

  describe('fullpage mode', () => {
    it('should render message in fullpage mode', () => {
      render(
        <Wrapper>
          <UpgradePrompt message="Upgrade to Enterprise" mode="fullpage" />
        </Wrapper>
      );

      expect(screen.getByText('Upgrade Required')).toBeInTheDocument();
      expect(screen.getByText('Upgrade to Enterprise')).toBeInTheDocument();
    });

    it('should navigate to pricing page on button click', () => {
      render(
        <Wrapper>
          <UpgradePrompt message="Upgrade to Enterprise" mode="fullpage" />
        </Wrapper>
      );

      const button = screen.getByRole('button', { name: /View Plans/i });
      fireEvent.click(button);

      expect(mockNavigate).toHaveBeenCalledWith('/pricing');
    });

    it('should use custom redirectTo URL', () => {
      render(
        <Wrapper>
          <UpgradePrompt
            message="Upgrade to Enterprise"
            redirectTo="/enterprise-pricing"
            mode="fullpage"
          />
        </Wrapper>
      );

      const button = screen.getByRole('button', { name: /View Plans/i });
      fireEvent.click(button);

      expect(mockNavigate).toHaveBeenCalledWith('/enterprise-pricing');
    });

    it('should use custom button text', () => {
      render(
        <Wrapper>
          <UpgradePrompt
            message="Upgrade to Enterprise"
            buttonText="Contact Sales"
            mode="fullpage"
          />
        </Wrapper>
      );

      expect(screen.getByRole('button', { name: /Contact Sales/i })).toBeInTheDocument();
    });

    it('should have lock icon', () => {
      const { container } = render(
        <Wrapper>
          <UpgradePrompt message="Upgrade to Enterprise" mode="fullpage" />
        </Wrapper>
      );

      const icon = container.querySelector('svg');
      expect(icon).toBeInTheDocument();
    });

    it('should have centered layout styling', () => {
      const { container } = render(
        <Wrapper>
          <UpgradePrompt message="Upgrade to Enterprise" mode="fullpage" />
        </Wrapper>
      );

      const wrapper = container.querySelector('.flex.items-center.justify-center');
      expect(wrapper).toBeInTheDocument();
    });
  });

  describe('default behavior', () => {
    it('should default to inline mode', () => {
      const { container } = render(
        <Wrapper>
          <UpgradePrompt message="Upgrade to Pro" />
        </Wrapper>
      );

      // Inline mode has yellow background
      const inlinePrompt = container.querySelector('.bg-yellow-50');
      expect(inlinePrompt).toBeInTheDocument();
    });

    it('should default to /pricing redirect', () => {
      render(
        <Wrapper>
          <UpgradePrompt message="Upgrade to Pro" />
        </Wrapper>
      );

      const button = screen.getByRole('button', { name: /View Plans/i });
      fireEvent.click(button);

      expect(mockNavigate).toHaveBeenCalledWith('/pricing');
    });

    it('should default to "View Plans" button text', () => {
      render(
        <Wrapper>
          <UpgradePrompt message="Upgrade to Pro" />
        </Wrapper>
      );

      expect(screen.getByRole('button', { name: /View Plans/i })).toBeInTheDocument();
    });
  });

  describe('accessibility', () => {
    it('should have accessible button labels in inline mode', () => {
      render(
        <Wrapper>
          <UpgradePrompt message="Upgrade to Pro" mode="inline" />
        </Wrapper>
      );

      const button = screen.getByRole('button', { name: /View Plans.*Navigate to pricing page/i });
      expect(button).toBeInTheDocument();
    });

    it('should have accessible button labels in fullpage mode', () => {
      render(
        <Wrapper>
          <UpgradePrompt message="Upgrade to Pro" mode="fullpage" />
        </Wrapper>
      );

      const button = screen.getByRole('button', { name: /View Plans.*Navigate to pricing page/i });
      expect(button).toBeInTheDocument();
    });

    it('should have aria-hidden on decorative icons', () => {
      const { container } = render(
        <Wrapper>
          <UpgradePrompt message="Upgrade to Pro" mode="inline" />
        </Wrapper>
      );

      const icon = container.querySelector('svg[aria-hidden="true"]');
      expect(icon).toBeInTheDocument();
    });
  });
});
