import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { SignUpView } from '../SignUpView';
import { ToastProvider } from '@/components/Toast';
import type { AuthConfig, SchemaNode } from '@uigen-dev/core';

// Mock useNavigate
const mockNavigate = vi.fn();
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

// Mock fetch
global.fetch = vi.fn();

describe('SignUpView', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should render sign-up form when sign-up endpoint exists', () => {
    const requestBodySchema: SchemaNode = {
      type: 'object',
      key: 'body',
      label: 'Body',
      required: true,
      children: [
        {
          type: 'string',
          key: 'email',
          label: 'Email',
          required: true,
        },
        {
          type: 'string',
          key: 'password',
          label: 'Password',
          required: true,
        },
      ],
    };

    const config: AuthConfig = {
      schemes: [],
      globalRequired: false,
      signUpEndpoints: [
        {
          path: '/auth/register',
          method: 'POST',
          requestBodySchema,
          description: 'Create new account',
        },
      ],
    };

    render(
      <BrowserRouter>
        <ToastProvider>
          <SignUpView config={config} appTitle="Test App" />
        </ToastProvider>
      </BrowserRouter>
    );

    expect(screen.getByText('Test App')).toBeInTheDocument();
    expect(screen.getByText('Create your account')).toBeInTheDocument();
    expect(screen.getByLabelText(/email/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/password/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /sign up/i })).toBeInTheDocument();
  });

  it('should show endpoint selector when multiple sign-up endpoints exist', () => {
    const requestBodySchema: SchemaNode = {
      type: 'object',
      key: 'body',
      label: 'Body',
      required: true,
      children: [
        {
          type: 'string',
          key: 'email',
          label: 'Email',
          required: true,
        },
      ],
    };

    const config: AuthConfig = {
      schemes: [],
      globalRequired: false,
      signUpEndpoints: [
        {
          path: '/auth/register',
          method: 'POST',
          requestBodySchema,
          description: 'Standard registration',
        },
        {
          path: '/auth/register-premium',
          method: 'POST',
          requestBodySchema,
          description: 'Premium registration',
        },
      ],
    };

    render(
      <BrowserRouter>
        <ToastProvider>
          <SignUpView config={config} appTitle="Test App" />
        </ToastProvider>
      </BrowserRouter>
    );

    expect(screen.getByLabelText(/registration method/i)).toBeInTheDocument();
    expect(screen.getByText('Standard registration')).toBeInTheDocument();
    expect(screen.getByText('Premium registration')).toBeInTheDocument();
  });

  it('should submit sign-up form and redirect to login on success', async () => {
    const requestBodySchema: SchemaNode = {
      type: 'object',
      key: 'body',
      label: 'Body',
      required: true,
      children: [
        {
          type: 'string',
          key: 'email',
          label: 'Email',
          required: true,
        },
        {
          type: 'string',
          key: 'password',
          label: 'Password',
          required: true,
        },
      ],
    };

    const config: AuthConfig = {
      schemes: [],
      globalRequired: false,
      signUpEndpoints: [
        {
          path: '/auth/register',
          method: 'POST',
          requestBodySchema,
        },
      ],
    };

    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ success: true }),
    });

    render(
      <BrowserRouter>
        <ToastProvider>
          <SignUpView config={config} appTitle="Test App" />
        </ToastProvider>
      </BrowserRouter>
    );

    const emailInput = screen.getByLabelText(/email/i);
    const passwordInput = screen.getByLabelText(/password/i);
    const submitButton = screen.getByRole('button', { name: /sign up/i });

    fireEvent.change(emailInput, { target: { value: 'test@example.com' } });
    fireEvent.change(passwordInput, { target: { value: 'password123' } });
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(mockNavigate).toHaveBeenCalledWith('/login', { replace: true });
    });
  });

  it('should display error message when sign-up fails', async () => {
    const requestBodySchema: SchemaNode = {
      type: 'object',
      key: 'body',
      label: 'Body',
      required: true,
      children: [
        {
          type: 'string',
          key: 'email',
          label: 'Email',
          required: true,
        },
      ],
    };

    const config: AuthConfig = {
      schemes: [],
      globalRequired: false,
      signUpEndpoints: [
        {
          path: '/auth/register',
          method: 'POST',
          requestBodySchema,
        },
      ],
    };

    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      ok: false,
      json: async () => ({ error: 'Email already exists' }),
    });

    render(
      <BrowserRouter>
        <ToastProvider>
          <SignUpView config={config} appTitle="Test App" />
        </ToastProvider>
      </BrowserRouter>
    );

    const emailInput = screen.getByLabelText(/email/i);
    const submitButton = screen.getByRole('button', { name: /sign up/i });

    fireEvent.change(emailInput, { target: { value: 'test@example.com' } });
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(screen.getByText('Email already exists')).toBeInTheDocument();
    });
  });

  it('should show link to login page', () => {
    const config: AuthConfig = {
      schemes: [],
      globalRequired: false,
      signUpEndpoints: [
        {
          path: '/auth/register',
          method: 'POST',
        },
      ],
    };

    render(
      <BrowserRouter>
        <ToastProvider>
          <SignUpView config={config} appTitle="Test App" />
        </ToastProvider>
      </BrowserRouter>
    );

    expect(screen.getByText(/already have an account/i)).toBeInTheDocument();
    const signInLink = screen.getByRole('button', { name: /sign in/i });
    fireEvent.click(signInLink);

    expect(mockNavigate).toHaveBeenCalledWith('/login');
  });

  it('should return null when no sign-up endpoints configured', () => {
    const config: AuthConfig = {
      schemes: [],
      globalRequired: false,
      signUpEndpoints: [],
    };

    const { container } = render(
      <BrowserRouter>
        <ToastProvider>
          <SignUpView config={config} appTitle="Test App" />
        </ToastProvider>
      </BrowserRouter>
    );

    expect(container.firstChild).toBeNull();
  });
});
