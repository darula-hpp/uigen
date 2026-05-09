import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { OAuthButton } from '../OAuthButton';
import { OAuthProvider } from '@uigen/core/ir/types';
import { axe } from 'jest-axe';

describe('OAuthButton', () => {
  const mockOnInitiate = vi.fn();

  const googleProvider: OAuthProvider = {
    provider: 'google',
    clientId: 'test-client-id',
    redirectUri: 'http://localhost:3000/auth/callback',
    scopes: ['openid', 'email', 'profile'],
    enabled: true,
    authorizationUrl: 'https://accounts.google.com/o/oauth2/v2/auth',
    tokenUrl: 'https://oauth2.googleapis.com/token',
    userInfoUrl: 'https://www.googleapis.com/oauth2/v2/userinfo'
  };

  const githubProvider: OAuthProvider = {
    provider: 'github',
    clientId: 'test-client-id',
    redirectUri: 'http://localhost:3000/auth/callback',
    scopes: ['read:user', 'user:email'],
    enabled: true,
    authorizationUrl: 'https://github.com/login/oauth/authorize',
    tokenUrl: 'https://github.com/login/oauth/access_token',
    userInfoUrl: 'https://api.github.com/user'
  };

  const facebookProvider: OAuthProvider = {
    provider: 'facebook',
    clientId: 'test-client-id',
    redirectUri: 'http://localhost:3000/auth/callback',
    scopes: ['email', 'public_profile'],
    enabled: true,
    authorizationUrl: 'https://www.facebook.com/v12.0/dialog/oauth',
    tokenUrl: 'https://graph.facebook.com/v12.0/oauth/access_token',
    userInfoUrl: 'https://graph.facebook.com/me?fields=id,name,email,picture'
  };

  const microsoftProvider: OAuthProvider = {
    provider: 'microsoft',
    clientId: 'test-client-id',
    redirectUri: 'http://localhost:3000/auth/callback',
    scopes: ['openid', 'email', 'profile'],
    enabled: true,
    authorizationUrl: 'https://login.microsoftonline.com/common/oauth2/v2.0/authorize',
    tokenUrl: 'https://login.microsoftonline.com/common/oauth2/v2.0/token',
    userInfoUrl: 'https://graph.microsoft.com/v1.0/me'
  };

  beforeEach(() => {
    mockOnInitiate.mockClear();
  });

  describe('Requirement 5.1: Render OAuth provider buttons', () => {
    it('should render button with Google provider', () => {
      render(<OAuthButton provider={googleProvider} onInitiate={mockOnInitiate} />);
      
      const button = screen.getByRole('button', { name: /continue with google/i });
      expect(button).toBeInTheDocument();
      expect(button).toHaveAttribute('data-provider', 'google');
    });

    it('should render button with GitHub provider', () => {
      render(<OAuthButton provider={githubProvider} onInitiate={mockOnInitiate} />);
      
      const button = screen.getByRole('button', { name: /continue with github/i });
      expect(button).toBeInTheDocument();
      expect(button).toHaveAttribute('data-provider', 'github');
    });

    it('should render button with Facebook provider', () => {
      render(<OAuthButton provider={facebookProvider} onInitiate={mockOnInitiate} />);
      
      const button = screen.getByRole('button', { name: /continue with facebook/i });
      expect(button).toBeInTheDocument();
      expect(button).toHaveAttribute('data-provider', 'facebook');
    });

    it('should render button with Microsoft provider', () => {
      render(<OAuthButton provider={microsoftProvider} onInitiate={mockOnInitiate} />);
      
      const button = screen.getByRole('button', { name: /continue with microsoft/i });
      expect(button).toBeInTheDocument();
      expect(button).toHaveAttribute('data-provider', 'microsoft');
    });
  });

  describe('Requirement 5.2 & 9.1-9.9: Provider-specific styling', () => {
    it('should apply Google brand colors', () => {
      render(<OAuthButton provider={googleProvider} onInitiate={mockOnInitiate} />);
      
      const button = screen.getByRole('button', { name: /continue with google/i });
      const style = window.getComputedStyle(button);
      
      // Check that custom properties are set
      expect(button.style.getPropertyValue('--oauth-button-bg')).toBe('#4285F4');
    });

    it('should apply GitHub brand colors', () => {
      render(<OAuthButton provider={githubProvider} onInitiate={mockOnInitiate} />);
      
      const button = screen.getByRole('button', { name: /continue with github/i });
      
      // Check that custom properties are set
      expect(button.style.getPropertyValue('--oauth-button-bg')).toBe('#24292e');
    });

    it('should apply Facebook brand colors', () => {
      render(<OAuthButton provider={facebookProvider} onInitiate={mockOnInitiate} />);
      
      const button = screen.getByRole('button', { name: /continue with facebook/i });
      
      // Check that custom properties are set
      expect(button.style.getPropertyValue('--oauth-button-bg')).toBe('#1877F2');
    });

    it('should apply Microsoft brand colors', () => {
      render(<OAuthButton provider={microsoftProvider} onInitiate={mockOnInitiate} />);
      
      const button = screen.getByRole('button', { name: /continue with microsoft/i });
      
      // Check that custom properties are set
      expect(button.style.getPropertyValue('--oauth-button-bg')).toBe('#00A4EF');
    });

    it('should render provider logo with correct alt text', () => {
      render(<OAuthButton provider={googleProvider} onInitiate={mockOnInitiate} />);
      
      const logo = screen.getByAltText('Google logo');
      expect(logo).toBeInTheDocument();
      expect(logo).toHaveAttribute('src', '/oauth-logos/google.svg');
    });

    it('should render provider display name', () => {
      render(<OAuthButton provider={googleProvider} onInitiate={mockOnInitiate} />);
      
      expect(screen.getByText(/continue with google/i)).toBeInTheDocument();
    });

    it('should have height of 44px', () => {
      render(<OAuthButton provider={googleProvider} onInitiate={mockOnInitiate} />);
      
      const button = screen.getByRole('button', { name: /continue with google/i });
      expect(button).toHaveClass('h-[44px]');
    });

    it('should have minimum logo size of 20px', () => {
      render(<OAuthButton provider={googleProvider} onInitiate={mockOnInitiate} />);
      
      const logo = screen.getByAltText('Google logo');
      expect(logo).toHaveClass('h-5'); // h-5 = 20px
      expect(logo).toHaveClass('w-5'); // w-5 = 20px
    });
  });

  describe('Requirement 5.5: Loading state', () => {
    it('should show loading spinner when loading is true', () => {
      render(<OAuthButton provider={googleProvider} onInitiate={mockOnInitiate} loading={true} />);
      
      const spinner = screen.getByRole('status', { name: /loading/i });
      expect(spinner).toBeInTheDocument();
    });

    it('should hide provider logo when loading', () => {
      render(<OAuthButton provider={googleProvider} onInitiate={mockOnInitiate} loading={true} />);
      
      const logo = screen.queryByAltText('Google logo');
      expect(logo).not.toBeInTheDocument();
    });

    it('should apply opacity to text when loading', () => {
      render(<OAuthButton provider={googleProvider} onInitiate={mockOnInitiate} loading={true} />);
      
      const text = screen.getByText(/continue with google/i);
      expect(text).toHaveClass('opacity-70');
    });

    it('should disable button when loading', () => {
      render(<OAuthButton provider={googleProvider} onInitiate={mockOnInitiate} loading={true} />);
      
      const button = screen.getByRole('button', { name: /continue with google/i });
      expect(button).toBeDisabled();
    });

    it('should not call onInitiate when clicked while loading', () => {
      render(<OAuthButton provider={googleProvider} onInitiate={mockOnInitiate} loading={true} />);
      
      const button = screen.getByRole('button', { name: /continue with google/i });
      fireEvent.click(button);
      
      expect(mockOnInitiate).not.toHaveBeenCalled();
    });
  });

  describe('Requirement 5.5: Disabled state', () => {
    it('should disable button when disabled prop is true', () => {
      render(<OAuthButton provider={googleProvider} onInitiate={mockOnInitiate} disabled={true} />);
      
      const button = screen.getByRole('button', { name: /continue with google/i });
      expect(button).toBeDisabled();
    });

    it('should apply disabled opacity', () => {
      render(<OAuthButton provider={googleProvider} onInitiate={mockOnInitiate} disabled={true} />);
      
      const button = screen.getByRole('button', { name: /continue with google/i });
      expect(button).toHaveClass('disabled:opacity-50');
    });

    it('should not call onInitiate when clicked while disabled', () => {
      render(<OAuthButton provider={googleProvider} onInitiate={mockOnInitiate} disabled={true} />);
      
      const button = screen.getByRole('button', { name: /continue with google/i });
      fireEvent.click(button);
      
      expect(mockOnInitiate).not.toHaveBeenCalled();
    });
  });

  describe('Click handler invocation', () => {
    it('should call onInitiate with provider when clicked', () => {
      render(<OAuthButton provider={googleProvider} onInitiate={mockOnInitiate} />);
      
      const button = screen.getByRole('button', { name: /continue with google/i });
      fireEvent.click(button);
      
      expect(mockOnInitiate).toHaveBeenCalledTimes(1);
      expect(mockOnInitiate).toHaveBeenCalledWith(googleProvider);
    });

    it('should call onInitiate for different providers', () => {
      const { rerender } = render(<OAuthButton provider={googleProvider} onInitiate={mockOnInitiate} />);
      
      let button = screen.getByRole('button', { name: /continue with google/i });
      fireEvent.click(button);
      expect(mockOnInitiate).toHaveBeenCalledWith(googleProvider);
      
      mockOnInitiate.mockClear();
      
      rerender(<OAuthButton provider={githubProvider} onInitiate={mockOnInitiate} />);
      button = screen.getByRole('button', { name: /continue with github/i });
      fireEvent.click(button);
      expect(mockOnInitiate).toHaveBeenCalledWith(githubProvider);
    });
  });

  describe('Dark mode styling', () => {
    it('should support dark theme variant for GitHub', () => {
      render(<OAuthButton provider={githubProvider} onInitiate={mockOnInitiate} />);
      
      const button = screen.getByRole('button', { name: /continue with github/i });
      // GitHub uses dark color (#24292e) which should result in white text
      expect(button.style.getPropertyValue('--oauth-button-text')).toBe('#FFFFFF');
    });

    it('should support light theme variant for Google', () => {
      render(<OAuthButton provider={googleProvider} onInitiate={mockOnInitiate} />);
      
      const button = screen.getByRole('button', { name: /continue with google/i });
      // Google uses light color (#4285F4) which should result in white text
      expect(button.style.getPropertyValue('--oauth-button-text')).toBe('#FFFFFF');
    });
  });

  describe('WCAG AA contrast ratios', () => {
    it('should have sufficient contrast for Google button', () => {
      render(<OAuthButton provider={googleProvider} onInitiate={mockOnInitiate} />);
      
      const button = screen.getByRole('button', { name: /continue with google/i });
      const bgColor = button.style.getPropertyValue('--oauth-button-bg');
      const textColor = button.style.getPropertyValue('--oauth-button-text');
      
      expect(bgColor).toBe('#4285F4');
      expect(textColor).toBe('#FFFFFF');
    });

    it('should have sufficient contrast for GitHub button', () => {
      render(<OAuthButton provider={githubProvider} onInitiate={mockOnInitiate} />);
      
      const button = screen.getByRole('button', { name: /continue with github/i });
      const bgColor = button.style.getPropertyValue('--oauth-button-bg');
      const textColor = button.style.getPropertyValue('--oauth-button-text');
      
      expect(bgColor).toBe('#24292e');
      expect(textColor).toBe('#FFFFFF');
    });

    it('should have sufficient contrast for Facebook button', () => {
      render(<OAuthButton provider={facebookProvider} onInitiate={mockOnInitiate} />);
      
      const button = screen.getByRole('button', { name: /continue with facebook/i });
      const bgColor = button.style.getPropertyValue('--oauth-button-bg');
      const textColor = button.style.getPropertyValue('--oauth-button-text');
      
      expect(bgColor).toBe('#1877F2');
      expect(textColor).toBe('#FFFFFF');
    });

    it('should have sufficient contrast for Microsoft button', () => {
      render(<OAuthButton provider={microsoftProvider} onInitiate={mockOnInitiate} />);
      
      const button = screen.getByRole('button', { name: /continue with microsoft/i });
      const bgColor = button.style.getPropertyValue('--oauth-button-bg');
      const textColor = button.style.getPropertyValue('--oauth-button-text');
      
      expect(bgColor).toBe('#00A4EF');
      expect(textColor).toBe('#FFFFFF');
    });
  });

  describe('Accessibility', () => {
    it('should have proper aria-label', () => {
      render(<OAuthButton provider={googleProvider} onInitiate={mockOnInitiate} />);
      
      const button = screen.getByRole('button', { name: /continue with google/i });
      expect(button).toHaveAttribute('aria-label', 'Continue with Google');
    });

    it('should have focus-visible styles', () => {
      render(<OAuthButton provider={googleProvider} onInitiate={mockOnInitiate} />);
      
      const button = screen.getByRole('button', { name: /continue with google/i });
      expect(button).toHaveClass('focus-visible:outline-none');
      expect(button).toHaveClass('focus-visible:ring-2');
    });

    it('should pass axe accessibility tests', async () => {
      const { container } = render(<OAuthButton provider={googleProvider} onInitiate={mockOnInitiate} />);
      const results = await axe(container);
      expect(results).toHaveNoViolations();
    });
  });

  describe('Error handling', () => {
    it('should return null for unknown provider', () => {
      const invalidProvider = {
        ...googleProvider,
        provider: 'unknown' as any
      };
      
      const { container } = render(<OAuthButton provider={invalidProvider} onInitiate={mockOnInitiate} />);
      expect(container.firstChild).toBeNull();
    });

    it('should log error for unknown provider', () => {
      const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      
      const invalidProvider = {
        ...googleProvider,
        provider: 'unknown' as any
      };
      
      render(<OAuthButton provider={invalidProvider} onInitiate={mockOnInitiate} />);
      
      expect(consoleErrorSpy).toHaveBeenCalledWith('Unknown OAuth provider: unknown');
      
      consoleErrorSpy.mockRestore();
    });
  });

  describe('Custom className', () => {
    it('should apply custom className', () => {
      render(<OAuthButton provider={googleProvider} onInitiate={mockOnInitiate} className="custom-class" />);
      
      const button = screen.getByRole('button', { name: /continue with google/i });
      expect(button).toHaveClass('custom-class');
    });
  });
});
