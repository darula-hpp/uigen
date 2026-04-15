import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { LoginView } from '../LoginView';
import type { AuthConfig } from '@uigen-dev/core';

// Mock the auth strategies
vi.mock('@/lib/strategies', () => ({
  CredentialStrategy: vi.fn(),
  BearerStrategy: vi.fn(),
  ApiKeyStrategy: vi.fn(),
  SessionStorageStrategy: vi.fn(),
  AuthManager: vi.fn(),
}));

vi.mock('@/lib/auth', () => ({
  storeAuthCredentials: vi.fn(),
}));

const mockNavigate = vi.fn();
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

describe('LoginView', () => {
  it('should render login form when credential login endpoint exists', () => {
    const config: AuthConfig = {
      schemes: [],
      globalRequired: false,
      loginEndpoints: [
        {
          path: '/user/login',
          method: 'GET',
          requestBodySchema: {
            type: 'object',
            key: 'credentials',
            label: 'Credentials',
            required: false,
            children: [
              { type: 'string', key: 'username', label: 'Username', required: false },
              { type: 'string', key: 'password', label: 'Password', required: false },
            ],
          },
          tokenPath: 'token',
          description: 'Logs user into the system',
        },
      ],
    };

    render(
      <BrowserRouter>
        <LoginView config={config} appTitle="Test App" />
      </BrowserRouter>
    );

    expect(screen.getByText('Test App')).toBeInTheDocument();
    expect(screen.getByText('Sign in to access the dashboard')).toBeInTheDocument();
    expect(screen.getByLabelText('Username')).toBeInTheDocument();
    expect(screen.getByLabelText('Password')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /sign in/i })).toBeInTheDocument();
  });

  it('should render bearer token form when bearer scheme exists', () => {
    const config: AuthConfig = {
      schemes: [{ type: 'bearer', name: 'bearerAuth', scheme: 'bearer' }],
      globalRequired: false,
      loginEndpoints: [],
    };

    render(
      <BrowserRouter>
        <LoginView config={config} appTitle="Test App" />
      </BrowserRouter>
    );

    expect(screen.getByLabelText('Bearer Token')).toBeInTheDocument();
  });

  it('should render API key form when apiKey scheme exists', () => {
    const config: AuthConfig = {
      schemes: [{ type: 'apiKey', name: 'api_key', in: 'header' }],
      globalRequired: false,
      loginEndpoints: [],
    };

    render(
      <BrowserRouter>
        <LoginView config={config} appTitle="Test App" />
      </BrowserRouter>
    );

    expect(screen.getByLabelText('API Key')).toBeInTheDocument();
  });

  it('should show tabs when multiple auth methods exist', () => {
    const config: AuthConfig = {
      schemes: [
        { type: 'bearer', name: 'bearerAuth', scheme: 'bearer' },
        { type: 'apiKey', name: 'api_key', in: 'header' },
      ],
      globalRequired: false,
      loginEndpoints: [
        {
          path: '/login',
          method: 'POST',
          requestBodySchema: {
            type: 'object',
            key: 'credentials',
            label: 'Credentials',
            required: false,
            children: [],
          },
          tokenPath: 'token',
        },
      ],
    };

    render(
      <BrowserRouter>
        <LoginView config={config} appTitle="Test App" />
      </BrowserRouter>
    );

    // Should show tab buttons (using getAllByRole to handle multiple "Sign In" buttons)
    const buttons = screen.getAllByRole('button');
    const tabButtons = buttons.filter(btn => 
      btn.textContent === 'Sign In' || 
      btn.textContent === 'Bearer Token' || 
      btn.textContent === 'API Key'
    );
    
    expect(tabButtons.length).toBeGreaterThanOrEqual(3);
    expect(screen.getByRole('button', { name: 'Bearer Token' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'API Key' })).toBeInTheDocument();
  });

  it('should render skip button', () => {
    const config: AuthConfig = {
      schemes: [],
      globalRequired: false,
      loginEndpoints: [
        {
          path: '/login',
          method: 'POST',
          requestBodySchema: {
            type: 'object',
            key: 'credentials',
            label: 'Credentials',
            required: false,
            children: [],
          },
          tokenPath: 'token',
        },
      ],
    };

    render(
      <BrowserRouter>
        <LoginView config={config} appTitle="Test App" />
      </BrowserRouter>
    );

    expect(screen.getByRole('button', { name: /continue without authentication/i })).toBeInTheDocument();
  });

  /**
   * Test multiple login endpoints (x-uigen-login annotation feature)
   * Validates that annotated endpoints are prioritized and displayed correctly
   */
  describe('Multiple Login Endpoints (x-uigen-login annotation)', () => {
    it('should show endpoint selector when multiple login endpoints exist', () => {
      const config: AuthConfig = {
        schemes: [],
        globalRequired: false,
        loginEndpoints: [
          {
            path: '/auth/authenticate',
            method: 'POST',
            requestBodySchema: {
              type: 'object',
              key: 'credentials',
              label: 'Credentials',
              required: false,
              children: [
                { type: 'string', key: 'username', label: 'Username', required: false },
                { type: 'string', key: 'password', label: 'Password', required: false },
              ],
            },
            tokenPath: 'accessToken',
            description: 'Primary authentication endpoint',
          },
          {
            path: '/auth/phone-login',
            method: 'POST',
            requestBodySchema: {
              type: 'object',
              key: 'credentials',
              label: 'Credentials',
              required: false,
              children: [
                { type: 'string', key: 'phone', label: 'Phone', required: false },
                { type: 'string', key: 'otp', label: 'OTP', required: false },
              ],
            },
            tokenPath: 'token',
            description: 'Phone authentication endpoint',
          },
        ],
      };

      render(
        <BrowserRouter>
          <LoginView config={config} appTitle="Test App" />
        </BrowserRouter>
      );

      // Should show endpoint selector
      expect(screen.getByLabelText('Login method')).toBeInTheDocument();
      
      // Should show first endpoint as default
      const selector = screen.getByLabelText('Login method') as HTMLSelectElement;
      expect(selector.value).toBe('/auth/authenticate');
      
      // Should show both endpoints in the dropdown
      expect(screen.getByText('Primary authentication endpoint')).toBeInTheDocument();
      expect(screen.getByText('Phone authentication endpoint')).toBeInTheDocument();
    });

    it('should not show endpoint selector when only one login endpoint exists', () => {
      const config: AuthConfig = {
        schemes: [],
        globalRequired: false,
        loginEndpoints: [
          {
            path: '/auth/login',
            method: 'POST',
            requestBodySchema: {
              type: 'object',
              key: 'credentials',
              label: 'Credentials',
              required: false,
              children: [
                { type: 'string', key: 'username', label: 'Username', required: false },
                { type: 'string', key: 'password', label: 'Password', required: false },
              ],
            },
            tokenPath: 'token',
            description: 'Login endpoint',
          },
        ],
      };

      render(
        <BrowserRouter>
          <LoginView config={config} appTitle="Test App" />
        </BrowserRouter>
      );

      // Should NOT show endpoint selector
      expect(screen.queryByLabelText('Login method')).not.toBeInTheDocument();
      
      // Should show login form directly
      expect(screen.getByLabelText('Username')).toBeInTheDocument();
      expect(screen.getByLabelText('Password')).toBeInTheDocument();
    });

    it('should prioritize annotated endpoints (first endpoint is selected by default)', () => {
      const config: AuthConfig = {
        schemes: [],
        globalRequired: false,
        loginEndpoints: [
          // Annotated endpoint (should be first/default)
          {
            path: '/api/custom/authenticate',
            method: 'POST',
            requestBodySchema: {
              type: 'object',
              key: 'credentials',
              label: 'Credentials',
              required: false,
              children: [
                { type: 'string', key: 'username', label: 'Username', required: false },
                { type: 'string', key: 'password', label: 'Password', required: false },
              ],
            },
            tokenPath: 'accessToken',
            description: 'Custom authentication (annotated)',
          },
          // Auto-detected endpoint (should be second)
          {
            path: '/auth/login',
            method: 'POST',
            requestBodySchema: {
              type: 'object',
              key: 'credentials',
              label: 'Credentials',
              required: false,
              children: [
                { type: 'string', key: 'email', label: 'Email', required: false },
                { type: 'string', key: 'password', label: 'Password', required: false },
              ],
            },
            tokenPath: 'token',
            description: 'Standard login (auto-detected)',
          },
        ],
      };

      render(
        <BrowserRouter>
          <LoginView config={config} appTitle="Test App" />
        </BrowserRouter>
      );

      // Should show endpoint selector
      const selector = screen.getByLabelText('Login method') as HTMLSelectElement;
      
      // First endpoint (annotated) should be selected by default
      expect(selector.value).toBe('/api/custom/authenticate');
      
      // Should show form fields (LoginView uses hardcoded "Username" and "Password" labels)
      expect(screen.getByLabelText('Username')).toBeInTheDocument();
      expect(screen.getByLabelText('Password')).toBeInTheDocument();
    });

    it('should handle email field detection in login endpoints', () => {
      const config: AuthConfig = {
        schemes: [],
        globalRequired: false,
        loginEndpoints: [
          {
            path: '/auth/email-login',
            method: 'POST',
            requestBodySchema: {
              type: 'object',
              key: 'credentials',
              label: 'Credentials',
              required: false,
              children: [
                { type: 'string', key: 'email', label: 'Email', required: false },
                { type: 'string', key: 'password', label: 'Password', required: false },
              ],
            },
            tokenPath: 'token',
            description: 'Email login',
          },
        ],
      };

      render(
        <BrowserRouter>
          <LoginView config={config} appTitle="Test App" />
        </BrowserRouter>
      );

      // Should show "Email" label instead of "Username" when email field is detected
      expect(screen.getByLabelText('Email')).toBeInTheDocument();
      expect(screen.queryByLabelText('Username')).not.toBeInTheDocument();
    });
  });
});
