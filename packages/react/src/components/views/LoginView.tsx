import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import type { AuthConfig, LoginEndpoint } from '@uigen-dev/core';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import {
  CredentialStrategy,
  BearerStrategy,
  ApiKeyStrategy,
  SessionStorageStrategy,
  AuthManager,
} from '@/lib/strategies';
import { storeAuthCredentials } from '@/lib/auth';

interface LoginViewProps {
  config: AuthConfig;
  appTitle: string;
}

type SchemeTab = 'credential' | 'bearer' | 'apiKey' | 'basic';

/**
 * Dedicated login page component.
 * Supports credential (username/password), bearer token, and API key auth.
 */
export function LoginView({ config, appTitle }: LoginViewProps) {
  const navigate = useNavigate();

  // Detect available auth options
  const loginEndpoints = config.loginEndpoints ?? [];
  const bearerScheme = config.schemes.find(s => s.type === 'bearer');
  const apiKeyScheme = config.schemes.find(s => s.type === 'apiKey');
  const basicScheme = config.schemes.find(s => s.type === 'basic');

  const hasCredential = loginEndpoints.length > 0;
  const hasBearer = !!bearerScheme;
  const hasApiKey = !!apiKeyScheme;
  const hasBasic = !!basicScheme;

  // Determine default tab: prefer credential > basic > bearer > apiKey
  const defaultTab: SchemeTab = hasCredential ? 'credential' : hasBasic ? 'basic' : hasBearer ? 'bearer' : 'apiKey';
  const [activeTab, setActiveTab] = useState<SchemeTab>(defaultTab);

  // Credential form state
  const [selectedEndpoint, setSelectedEndpoint] = useState<LoginEndpoint | null>(
    loginEndpoints[0] ?? null
  );
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [credLoading, setCredLoading] = useState(false);

  // Bearer form state
  const [bearerToken, setBearerToken] = useState('');

  // API key form state
  const [apiKey, setApiKey] = useState('');

  // Basic auth form state
  const [basicUsername, setBasicUsername] = useState('');
  const [basicPassword, setBasicPassword] = useState('');
  const [basicLoading, setBasicLoading] = useState(false);

  // Shared error state
  const [error, setError] = useState<string | null>(null);

  // Redirect synchronously (no useEffect) if nothing to authenticate with
  if (!hasCredential && !hasBearer && !hasApiKey && !hasBasic) {
    return null;
  }

  // ── Credential submit ──────────────────────────────────────────────────────
  const handleCredentialSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);

    if (!username.trim()) { setError('Username cannot be empty'); return; }
    if (!password.trim()) { setError('Password cannot be empty'); return; }
    if (!selectedEndpoint) { setError('No login endpoint configured'); return; }

    setCredLoading(true);
    try {
      const strategy = new CredentialStrategy();
      const manager = new AuthManager(strategy, new SessionStorageStrategy());
      const result = await manager.login({
        username,
        password,
        loginEndpoint: selectedEndpoint.path,
        tokenPath: selectedEndpoint.tokenPath,
      });

      if (result.success) {
        navigate('/', { replace: true });
      } else {
        setError(result.error ?? 'Authentication failed');
      }
    } finally {
      setCredLoading(false);
    }
  };

  // ── Bearer submit ──────────────────────────────────────────────────────────
  const handleBearerSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);

    if (!bearerToken.trim()) { setError('Please enter a bearer token'); return; }

    const strategy = new BearerStrategy();
    const manager = new AuthManager(strategy, new SessionStorageStrategy());
    const result = await manager.login({ token: bearerToken });

    if (result.success) {
      navigate('/', { replace: true });
    } else {
      setError(result.error ?? 'Authentication failed');
    }
  };

  // ── API key submit ─────────────────────────────────────────────────────────
  const handleApiKeySubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);

    if (!apiKey.trim()) { setError('Please enter an API key'); return; }
    if (!apiKeyScheme) { setError('API key authentication not configured'); return; }

    const strategy = new ApiKeyStrategy();
    const manager = new AuthManager(strategy, new SessionStorageStrategy());
    const result = await manager.login({
      apiKey,
      apiKeyName: apiKeyScheme.name,
      apiKeyIn: (apiKeyScheme.in === 'header' || apiKeyScheme.in === 'query')
        ? apiKeyScheme.in
        : 'header',
    });

    if (result.success) {
      navigate('/', { replace: true });
    } else {
      setError(result.error ?? 'Authentication failed');
    }
  };

  // ── Basic auth submit ──────────────────────────────────────────────────────
  const handleBasicSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);

    if (!basicUsername.trim()) { setError('Username cannot be empty'); return; }
    if (!basicPassword.trim()) { setError('Password cannot be empty'); return; }

    setBasicLoading(true);
    try {
      const encoded = btoa(`${basicUsername}:${basicPassword}`);
      sessionStorage.setItem('uigen_auth', JSON.stringify({ type: 'basic', credentials: encoded }));
      navigate('/', { replace: true });
    } finally {
      setBasicLoading(false);
    }
  };

  // ── Skip ───────────────────────────────────────────────────────────────────
  const handleSkipAuth = () => {
    navigate('/', { replace: true });
  };

  const tabCount = [hasCredential, hasBasic, hasBearer, hasApiKey].filter(Boolean).length;

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <div className="w-full max-w-md space-y-8">
        {/* Header */}
        <div className="text-center">
          <h1 className="text-3xl font-bold tracking-tight">{appTitle}</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Sign in to access the dashboard
          </p>
        </div>

        {/* Auth Form Card */}
        <div className="bg-card border rounded-lg shadow-sm p-6 space-y-6">

          {/* Tab switcher — only shown when multiple auth methods exist */}
          {tabCount > 1 && (
            <div className="flex gap-2">
              {hasCredential && (
                <Button
                  variant={activeTab === 'credential' ? 'default' : 'outline'}
                  className="flex-1"
                  onClick={() => { setActiveTab('credential'); setError(null); }}
                >
                  Sign In
                </Button>
              )}
              {hasBasic && (
                <Button
                  variant={activeTab === 'basic' ? 'default' : 'outline'}
                  className="flex-1"
                  onClick={() => { setActiveTab('basic'); setError(null); }}
                >
                  Basic Auth
                </Button>
              )}
              {hasBearer && (
                <Button
                  variant={activeTab === 'bearer' ? 'default' : 'outline'}
                  className="flex-1"
                  onClick={() => { setActiveTab('bearer'); setError(null); }}
                >
                  Bearer Token
                </Button>
              )}
              {hasApiKey && (
                <Button
                  variant={activeTab === 'apiKey' ? 'default' : 'outline'}
                  className="flex-1"
                  onClick={() => { setActiveTab('apiKey'); setError(null); }}
                >
                  API Key
                </Button>
              )}
            </div>
          )}

          {/* Error */}
          {error && (
            <div className="bg-destructive/10 text-destructive text-sm p-3 rounded-md">
              {error}
            </div>
          )}

          {/* ── Credential form ── */}
          {activeTab === 'credential' && hasCredential && (
            <form onSubmit={handleCredentialSubmit} className="space-y-4">
              {/* Endpoint selector when multiple login endpoints exist */}
              {loginEndpoints.length > 1 && (
                <div className="space-y-2">
                  <Label htmlFor="login-endpoint">Login method</Label>
                  <select
                    id="login-endpoint"
                    className="w-full h-9 rounded-md border border-input bg-background px-3 py-1 text-sm"
                    value={selectedEndpoint?.path ?? ''}
                    onChange={e =>
                      setSelectedEndpoint(
                        loginEndpoints.find(ep => ep.path === e.target.value) ?? null
                      )
                    }
                  >
                    {loginEndpoints.map(ep => (
                      <option key={ep.path} value={ep.path}>
                        {ep.description ?? ep.path}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <div className="space-y-2">
                <Label htmlFor="username">
                  {selectedEndpoint?.requestBodySchema?.children?.some(
                    c => c.key === 'email'
                  )
                    ? 'Email'
                    : 'Username'}
                </Label>
                <Input
                  id="username"
                  type={
                    selectedEndpoint?.requestBodySchema?.children?.some(
                      c => c.key === 'email'
                    )
                      ? 'email'
                      : 'text'
                  }
                  placeholder="Enter your username"
                  value={username}
                  onChange={e => setUsername(e.target.value)}
                  autoFocus
                  autoComplete="username"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <Input
                  id="password"
                  type="password"
                  placeholder="Enter your password"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  autoComplete="current-password"
                />
              </div>

              <Button type="submit" className="w-full" disabled={credLoading}>
                {credLoading ? 'Signing in…' : 'Sign In'}
              </Button>
            </form>
          )}

          {/* ── Bearer form ── */}
          {activeTab === 'bearer' && hasBearer && (
            <form onSubmit={handleBearerSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="bearer-token">Bearer Token</Label>
                <Input
                  id="bearer-token"
                  type="password"
                  placeholder="Enter your bearer token"
                  value={bearerToken}
                  onChange={e => setBearerToken(e.target.value)}
                  autoFocus
                />
                <p className="text-xs text-muted-foreground">
                  Your token will be stored in your browser session
                </p>
              </div>
              <Button type="submit" className="w-full">
                Sign In
              </Button>
            </form>
          )}

          {/* ── API key form ── */}
          {activeTab === 'apiKey' && hasApiKey && apiKeyScheme && (
            <form onSubmit={handleApiKeySubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="api-key">API Key</Label>
                <Input
                  id="api-key"
                  type="password"
                  placeholder="Enter your API key"
                  value={apiKey}
                  onChange={e => setApiKey(e.target.value)}
                  autoFocus
                />
                <p className="text-xs text-muted-foreground">
                  Location: {apiKeyScheme.in ?? 'header'} • Name: {apiKeyScheme.name}
                </p>
              </div>
              <Button type="submit" className="w-full">
                Sign In
              </Button>
            </form>
          )}

          {/* ── Basic auth form ── */}
          {activeTab === 'basic' && hasBasic && (
            <form onSubmit={handleBasicSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="basic-username">Username</Label>
                <Input
                  id="basic-username"
                  type="text"
                  placeholder="Enter your username"
                  value={basicUsername}
                  onChange={e => setBasicUsername(e.target.value)}
                  autoFocus
                  autoComplete="username"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="basic-password">Password</Label>
                <Input
                  id="basic-password"
                  type="password"
                  placeholder="Enter your password"
                  value={basicPassword}
                  onChange={e => setBasicPassword(e.target.value)}
                  autoComplete="current-password"
                />
              </div>
              <Button type="submit" className="w-full" disabled={basicLoading}>
                {basicLoading ? 'Signing in…' : 'Sign In'}
              </Button>
            </form>
          )}

          {/* Skip */}
          <div className="pt-4 border-t space-y-2">
            <Button variant="ghost" className="w-full" onClick={handleSkipAuth}>
              Continue without authentication
            </Button>
            <p className="text-xs text-muted-foreground text-center">
              You can explore the UI, but API calls may fail without valid credentials
            </p>
          </div>
        </div>

        <p className="text-center text-xs text-muted-foreground">
          Auto-generated admin UI powered by UIGen
        </p>
      </div>
    </div>
  );
}
