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

    expect(screen.getByRole('button', { name: 'Sign In' })).toBeInTheDocument();
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
});
