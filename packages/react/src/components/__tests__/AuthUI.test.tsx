import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { AuthUI } from '../AuthUI';
import type { AuthConfig } from '@uigen-dev/core';

// Use real strategies with a mocked sessionStorage
const mockStorage: Record<string, string> = {};

beforeEach(() => {
  vi.clearAllMocks();
  Object.keys(mockStorage).forEach(k => delete mockStorage[k]);

  Object.defineProperty(window, 'sessionStorage', {
    value: {
      getItem: vi.fn((key: string) => mockStorage[key] ?? null),
      setItem: vi.fn((key: string, value: string) => { mockStorage[key] = value; }),
      removeItem: vi.fn((key: string) => { delete mockStorage[key]; }),
      clear: vi.fn(() => { Object.keys(mockStorage).forEach(k => delete mockStorage[k]); }),
    },
    writable: true,
    configurable: true,
  });
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe('AuthUI', () => {
  // ── Rendering ──────────────────────────────────────────────────────────────

  it('renders nothing when no auth schemes or login endpoints are configured', () => {
    const config: AuthConfig = { schemes: [], globalRequired: false };
    const { container } = render(<AuthUI config={config} />);
    expect(container.firstChild).toBeNull();
  });

  it('renders bearer token form when only bearer scheme is configured', () => {
    const config: AuthConfig = {
      schemes: [{ type: 'bearer', name: 'bearerAuth' }],
      globalRequired: false,
    };
    render(<AuthUI config={config} />);
    expect(screen.getByLabelText(/Bearer Token/i)).toBeInTheDocument();
    expect(screen.getByPlaceholderText(/Enter your bearer token/i)).toBeInTheDocument();
  });

  it('renders API key form when only apiKey scheme is configured', () => {
    const config: AuthConfig = {
      schemes: [{ type: 'apiKey', name: 'X-API-Key', in: 'header' }],
      globalRequired: false,
    };
    render(<AuthUI config={config} />);
    expect(screen.getByLabelText(/API Key/i)).toBeInTheDocument();
    expect(screen.getByPlaceholderText(/Enter your API key/i)).toBeInTheDocument();
  });

  it('renders tab switcher when both bearer and apiKey are configured', () => {
    const config: AuthConfig = {
      schemes: [
        { type: 'bearer', name: 'bearerAuth' },
        { type: 'apiKey', name: 'X-API-Key', in: 'header' },
      ],
      globalRequired: false,
    };
    render(<AuthUI config={config} />);
    expect(screen.getByRole('button', { name: /Bearer Token/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /API Key/i })).toBeInTheDocument();
  });

  it('renders credential form when login endpoints are configured', () => {
    const config: AuthConfig = {
      schemes: [],
      globalRequired: false,
      loginEndpoints: [
        {
          path: '/v1/login',
          method: 'POST',
          tokenPath: 'token',
          requestBodySchema: {
            type: 'object', key: 'credentials', label: 'Credentials', required: true,
            children: [
              { type: 'string', key: 'username', label: 'Username', required: true },
              { type: 'string', key: 'password', label: 'Password', required: true },
            ],
          },
        },
      ],
    };
    render(<AuthUI config={config} />);
    expect(screen.getByLabelText(/Username/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Password/i)).toBeInTheDocument();
  });

  // ── Status display ─────────────────────────────────────────────────────────

  it('shows "Not authenticated" by default', () => {
    const config: AuthConfig = {
      schemes: [{ type: 'bearer', name: 'bearerAuth' }],
      globalRequired: false,
    };
    render(<AuthUI config={config} />);
    expect(screen.getByText(/Not authenticated/i)).toBeInTheDocument();
  });

  it('shows authenticated status when credentials are already in storage', () => {
    // Pre-populate storage with a valid bearer token
    mockStorage['uigen_auth'] = JSON.stringify({ type: 'bearer', token: 'stored-token' });

    const config: AuthConfig = {
      schemes: [{ type: 'bearer', name: 'bearerAuth' }],
      globalRequired: false,
    };
    render(<AuthUI config={config} />);

    // The useEffect restore should pick this up
    waitFor(() => {
      expect(screen.getByText(/✓ Authenticated/i)).toBeInTheDocument();
    });
  });

  // ── Bearer submit ──────────────────────────────────────────────────────────

  it('shows authenticated status after successful bearer login', async () => {
    const config: AuthConfig = {
      schemes: [{ type: 'bearer', name: 'bearerAuth' }],
      globalRequired: false,
    };
    render(<AuthUI config={config} />);

    fireEvent.change(screen.getByLabelText(/Bearer Token/i), {
      target: { value: 'test-token-123' },
    });
    fireEvent.click(screen.getByRole('button', { name: /Authenticate/i }));

    await waitFor(() => {
      expect(screen.getByText(/✓ Authenticated/i)).toBeInTheDocument();
    });
  });

  it('shows error when bearer token is empty', async () => {
    const config: AuthConfig = {
      schemes: [{ type: 'bearer', name: 'bearerAuth' }],
      globalRequired: false,
    };
    render(<AuthUI config={config} />);

    fireEvent.click(screen.getByRole('button', { name: /Authenticate/i }));

    await waitFor(() => {
      expect(screen.getByText(/Please enter a bearer token/i)).toBeInTheDocument();
    });
    expect(screen.queryByText(/✓ Authenticated/i)).not.toBeInTheDocument();
  });

  // ── API key submit ─────────────────────────────────────────────────────────

  it('shows authenticated status after successful API key login', async () => {
    const config: AuthConfig = {
      schemes: [{ type: 'apiKey', name: 'X-API-Key', in: 'header' }],
      globalRequired: false,
    };
    render(<AuthUI config={config} />);

    fireEvent.change(screen.getByLabelText(/API Key/i), {
      target: { value: 'my-api-key' },
    });
    fireEvent.click(screen.getByRole('button', { name: /Authenticate/i }));

    await waitFor(() => {
      expect(screen.getByText(/✓ Authenticated/i)).toBeInTheDocument();
    });
  });

  it('displays API key location info', () => {
    const config: AuthConfig = {
      schemes: [{ type: 'apiKey', name: 'X-API-Key', in: 'header' }],
      globalRequired: false,
    };
    render(<AuthUI config={config} />);
    expect(screen.getByText(/Location: header \(X-API-Key\)/i)).toBeInTheDocument();
  });

  // ── Logout ─────────────────────────────────────────────────────────────────

  it('shows logout button after authentication', async () => {
    const config: AuthConfig = {
      schemes: [{ type: 'bearer', name: 'bearerAuth' }],
      globalRequired: false,
    };
    render(<AuthUI config={config} />);

    fireEvent.change(screen.getByLabelText(/Bearer Token/i), {
      target: { value: 'test-token' },
    });
    fireEvent.click(screen.getByRole('button', { name: /Authenticate/i }));

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /Logout/i })).toBeInTheDocument();
    });
  });

  it('returns to unauthenticated state after logout', async () => {
    const config: AuthConfig = {
      schemes: [{ type: 'bearer', name: 'bearerAuth' }],
      globalRequired: false,
    };
    render(<AuthUI config={config} />);

    fireEvent.change(screen.getByLabelText(/Bearer Token/i), {
      target: { value: 'test-token' },
    });
    fireEvent.click(screen.getByRole('button', { name: /Authenticate/i }));

    await waitFor(() => screen.getByRole('button', { name: /Logout/i }));
    fireEvent.click(screen.getByRole('button', { name: /Logout/i }));

    await waitFor(() => {
      expect(screen.getByText(/Not authenticated/i)).toBeInTheDocument();
    });
  });

  // ── Tab switching ──────────────────────────────────────────────────────────

  it('switches between bearer and API key forms', () => {
    const config: AuthConfig = {
      schemes: [
        { type: 'bearer', name: 'bearerAuth' },
        { type: 'apiKey', name: 'X-API-Key', in: 'header' },
      ],
      globalRequired: false,
    };
    render(<AuthUI config={config} />);

    fireEvent.click(screen.getByRole('button', { name: /API Key/i }));
    expect(screen.getByLabelText(/API Key/i)).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /Bearer Token/i }));
    expect(screen.getByLabelText(/Bearer Token/i)).toBeInTheDocument();
  });

  // ── Credential form ────────────────────────────────────────────────────────

  it('shows error when credential username is empty', async () => {
    const config: AuthConfig = {
      schemes: [],
      globalRequired: false,
      loginEndpoints: [
        {
          path: '/v1/login',
          method: 'POST',
          tokenPath: 'token',
          requestBodySchema: {
            type: 'object', key: 'credentials', label: 'Credentials', required: true,
            children: [
              { type: 'string', key: 'username', label: 'Username', required: true },
              { type: 'string', key: 'password', label: 'Password', required: true },
            ],
          },
        },
      ],
    };
    render(<AuthUI config={config} />);

    fireEvent.change(screen.getByLabelText(/Password/i), { target: { value: 'secret' } });
    fireEvent.click(screen.getByRole('button', { name: /Sign In/i }));

    await waitFor(() => {
      expect(screen.getByText(/Username cannot be empty/i)).toBeInTheDocument();
    });
  });
});
