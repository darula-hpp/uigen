import { useState, useEffect } from 'react';
import type { AuthConfig, LoginEndpoint } from '@uigen-dev/core';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import {
  CredentialStrategy,
  BearerStrategy,
  ApiKeyStrategy,
  SessionStorageStrategy,
  AuthManager,
} from '@/lib/strategies';

interface AuthUIProps {
  config: AuthConfig;
}

type SchemeTab = 'credential' | 'bearer' | 'apiKey';

/**
 * Sidebar authentication UI component.
 * Supports credential (username/password), bearer token, and API key auth.
 */
export function AuthUI({ config }: AuthUIProps) {
  const loginEndpoints = config.loginEndpoints ?? [];
  const bearerScheme = config.schemes.find(s => s.type === 'bearer');
  const apiKeyScheme = config.schemes.find(s => s.type === 'apiKey');

  const hasCredential = loginEndpoints.length > 0;
  const hasBearer = !!bearerScheme;
  const hasApiKey = !!apiKeyScheme;

  const defaultTab: SchemeTab = hasCredential ? 'credential' : hasBearer ? 'bearer' : 'apiKey';
  const [activeTab, setActiveTab] = useState<SchemeTab>(defaultTab);
  const [authenticated, setAuthenticated] = useState(false);
  const [authManager, setAuthManager] = useState<AuthManager | null>(null);

  // Credential state
  const [selectedEndpoint, setSelectedEndpoint] = useState<LoginEndpoint | null>(
    loginEndpoints[0] ?? null
  );
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [credLoading, setCredLoading] = useState(false);

  // Bearer state
  const [bearerToken, setBearerToken] = useState('');

  // API key state
  const [apiKey, setApiKey] = useState('');

  const [error, setError] = useState<string | null>(null);

  // Restore auth state on mount by peeking at sessionStorage directly
  useEffect(() => {
    try {
      const raw = sessionStorage.getItem('uigen_auth');
      if (!raw) return;
      const data = JSON.parse(raw) as { type?: string; token?: string; apiKey?: string };
      if (!data?.type) return;

      let strategy;
      if (data.type === 'credential') strategy = new CredentialStrategy();
      else if (data.type === 'apiKey') strategy = new ApiKeyStrategy();
      else strategy = new BearerStrategy();

      const storage = new SessionStorageStrategy();
      const manager = new AuthManager(strategy, storage);
      if (manager.isAuthenticated()) {
        setAuthManager(manager);
        setAuthenticated(true);
      }
    } catch {
      // Corrupted storage — ignore
    }
  }, []);

  if (!hasCredential && !hasBearer && !hasApiKey) {
    return null;
  }

  // ── Logout ─────────────────────────────────────────────────────────────────
  const handleLogout = () => {
    authManager?.logout();
    setAuthManager(null);
    setAuthenticated(false);
    setUsername('');
    setPassword('');
    setBearerToken('');
    setApiKey('');
    setError(null);
  };

  // ── Credential submit ──────────────────────────────────────────────────────
  const handleCredentialSubmit = async (e: React.FormEvent) => {
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
        setAuthManager(manager);
        setAuthenticated(true);
      } else {
        setError(result.error ?? 'Authentication failed');
      }
    } finally {
      setCredLoading(false);
    }
  };

  // ── Bearer submit ──────────────────────────────────────────────────────────
  const handleBearerSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!bearerToken.trim()) { setError('Please enter a bearer token'); return; }

    const strategy = new BearerStrategy();
    const manager = new AuthManager(strategy, new SessionStorageStrategy());
    const result = await manager.login({ token: bearerToken });

    if (result.success) {
      setAuthManager(manager);
      setAuthenticated(true);
    } else {
      setError(result.error ?? 'Authentication failed');
    }
  };

  // ── API key submit ─────────────────────────────────────────────────────────
  const handleApiKeySubmit = async (e: React.FormEvent) => {
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
      setAuthManager(manager);
      setAuthenticated(true);
    } else {
      setError(result.error ?? 'Authentication failed');
    }
  };

  const tabCount = [hasCredential, hasBearer, hasApiKey].filter(Boolean).length;

  return (
    <div className="border-t p-4 space-y-4">
      {/* Status row */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-semibold">Authentication</h3>
          <p className="text-xs text-muted-foreground">
            {authenticated ? (
              <span className="text-green-600">✓ Authenticated</span>
            ) : (
              <span className="text-amber-600">Not authenticated</span>
            )}
          </p>
        </div>
        {authenticated && (
          <Button variant="outline" size="sm" onClick={handleLogout}>
            Logout
          </Button>
        )}
      </div>

      {!authenticated && (
        <>
          {/* Tab switcher */}
          {tabCount > 1 && (
            <div className="flex gap-2">
              {hasCredential && (
                <Button
                  variant={activeTab === 'credential' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => { setActiveTab('credential'); setError(null); }}
                >
                  Sign In
                </Button>
              )}
              {hasBearer && (
                <Button
                  variant={activeTab === 'bearer' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => { setActiveTab('bearer'); setError(null); }}
                >
                  Bearer Token
                </Button>
              )}
              {hasApiKey && (
                <Button
                  variant={activeTab === 'apiKey' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => { setActiveTab('apiKey'); setError(null); }}
                >
                  API Key
                </Button>
              )}
            </div>
          )}

          {/* Error */}
          {error && (
            <div className="bg-destructive/10 text-destructive text-xs p-2 rounded-md">
              {error}
            </div>
          )}

          {/* ── Credential form ── */}
          {activeTab === 'credential' && hasCredential && (
            <form onSubmit={handleCredentialSubmit} className="space-y-3">
              {loginEndpoints.length > 1 && (
                <div className="space-y-1">
                  <Label className="text-xs">Login method</Label>
                  <select
                    className="w-full h-8 rounded-md border border-input bg-background px-2 text-sm"
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

              <div className="space-y-1">
                <Label htmlFor="auth-username" className="text-xs">
                  {selectedEndpoint?.requestBodySchema?.children?.some(c => c.key === 'email')
                    ? 'Email'
                    : 'Username'}
                </Label>
                <Input
                  id="auth-username"
                  type={
                    selectedEndpoint?.requestBodySchema?.children?.some(c => c.key === 'email')
                      ? 'email'
                      : 'text'
                  }
                  placeholder="Username"
                  value={username}
                  onChange={e => setUsername(e.target.value)}
                  className="h-8 text-sm"
                  autoComplete="username"
                />
              </div>

              <div className="space-y-1">
                <Label htmlFor="auth-password" className="text-xs">Password</Label>
                <Input
                  id="auth-password"
                  type="password"
                  placeholder="Password"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  className="h-8 text-sm"
                  autoComplete="current-password"
                />
              </div>

              <Button type="submit" size="sm" className="w-full" disabled={credLoading}>
                {credLoading ? 'Signing in…' : 'Sign In'}
              </Button>
            </form>
          )}

          {/* ── Bearer form ── */}
          {activeTab === 'bearer' && hasBearer && (
            <form onSubmit={handleBearerSubmit} className="space-y-3">
              <div className="space-y-1">
                <Label htmlFor="bearer-token" className="text-xs">Bearer Token</Label>
                <Input
                  id="bearer-token"
                  type="password"
                  placeholder="Enter your bearer token"
                  value={bearerToken}
                  onChange={e => setBearerToken(e.target.value)}
                  className="h-8 text-sm"
                />
              </div>
              <Button type="submit" size="sm" className="w-full">
                Authenticate
              </Button>
            </form>
          )}

          {/* ── API key form ── */}
          {activeTab === 'apiKey' && hasApiKey && apiKeyScheme && (
            <form onSubmit={handleApiKeySubmit} className="space-y-3">
              <div className="space-y-1">
                <Label htmlFor="api-key" className="text-xs">API Key</Label>
                <Input
                  id="api-key"
                  type="password"
                  placeholder="Enter your API key"
                  value={apiKey}
                  onChange={e => setApiKey(e.target.value)}
                  className="h-8 text-sm"
                />
                <p className="text-xs text-muted-foreground">
                  Location: {apiKeyScheme.in ?? 'header'} ({apiKeyScheme.name})
                </p>
              </div>
              <Button type="submit" size="sm" className="w-full">
                Authenticate
              </Button>
            </form>
          )}
        </>
      )}
    </div>
  );
}
