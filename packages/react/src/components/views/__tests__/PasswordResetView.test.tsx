import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { PasswordResetView } from '../PasswordResetView';
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

describe('PasswordResetView', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should render password reset form when password reset endpoint exists', () => {
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
      passwordResetEndpoints: [
        {
          path: '/auth/reset-password',
          method: 'POST',
          requestBodySchema,
          description: 'Reset your password',
        },
      ],
    };

    render(
      <BrowserRouter>
        <ToastProvider>
          <PasswordResetView config={config} appTitle="Test App" />
        </ToastProvider>
      </BrowserRouter>
    );

    expect(screen.getByText('Test App')).toBeInTheDocument();
    expect(screen.getByText('Reset your password')).toBeInTheDocument();
    expect(screen.getByLabelText(/email/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /reset password/i })).toBeInTheDocument();
  });

  it('should show endpoint selector when multiple password reset endpoints exist', () => {
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
      passwordResetEndpoints: [
        {
          path: '/auth/reset-password',
          method: 'POST',
          requestBodySchema,
          description: 'Email reset',
        },
        {
          path: '/auth/reset-password-sms',
          method: 'POST',
          requestBodySchema,
          description: 'SMS reset',
        },
      ],
    };

    render(
      <BrowserRouter>
        <ToastProvider>
          <PasswordResetView config={config} appTitle="Test App" />
        </ToastProvider>
      </BrowserRouter>
    );

    expect(screen.getByLabelText(/reset method/i)).toBeInTheDocument();
    expect(screen.getByText('Email reset')).toBeInTheDocument();
    expect(screen.getByText('SMS reset')).toBeInTheDocument();
  });

  it('should submit password reset form and redirect to login on success', async () => {
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
      passwordResetEndpoints: [
        {
          path: '/auth/reset-password',
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
          <PasswordResetView config={config} appTitle="Test App" />
        </ToastProvider>
      </BrowserRouter>
    );

    const emailInput = screen.getByLabelText(/email/i);
    const submitButton = screen.getByRole('button', { name: /reset password/i });

    fireEvent.change(emailInput, { target: { value: 'test@example.com' } });
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(mockNavigate).toHaveBeenCalledWith('/login', { replace: true });
    });
  });

  it('should display error message when password reset fails', async () => {
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
      passwordResetEndpoints: [
        {
          path: '/auth/reset-password',
          method: 'POST',
          requestBodySchema,
        },
      ],
    };

    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      ok: false,
      json: async () => ({ error: 'Email not found' }),
    });

    render(
      <BrowserRouter>
        <ToastProvider>
          <PasswordResetView config={config} appTitle="Test App" />
        </ToastProvider>
      </BrowserRouter>
    );

    const emailInput = screen.getByLabelText(/email/i);
    const submitButton = screen.getByRole('button', { name: /reset password/i });

    fireEvent.change(emailInput, { target: { value: 'test@example.com' } });
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(screen.getByText('Email not found')).toBeInTheDocument();
    });
  });

  it('should show link to login page', () => {
    const config: AuthConfig = {
      schemes: [],
      globalRequired: false,
      passwordResetEndpoints: [
        {
          path: '/auth/reset-password',
          method: 'POST',
        },
      ],
    };

    render(
      <BrowserRouter>
        <ToastProvider>
          <PasswordResetView config={config} appTitle="Test App" />
        </ToastProvider>
      </BrowserRouter>
    );

    expect(screen.getByText(/remember your password/i)).toBeInTheDocument();
    const signInLink = screen.getByRole('button', { name: /sign in/i });
    fireEvent.click(signInLink);

    expect(mockNavigate).toHaveBeenCalledWith('/login');
  });

  it('should return null when no password reset endpoints configured', () => {
    const config: AuthConfig = {
      schemes: [],
      globalRequired: false,
      passwordResetEndpoints: [],
    };

    const { container } = render(
      <BrowserRouter>
        <ToastProvider>
          <PasswordResetView config={config} appTitle="Test App" />
        </ToastProvider>
      </BrowserRouter>
    );

    expect(container.firstChild).toBeNull();
  });
});
