import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import type { AuthConfig, LoginEndpoint, OAuthProvider } from '@uigen-dev/core';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Alert, AlertDescription } from '../ui/alert';
import { ThemeToggle } from '../ThemeToggle';
import { useThemeInitializer } from '@/hooks/useThemeInitializer';
import { OAuthButton } from '../auth/OAuthButton';
import { OAuthStrategy } from '@/lib/oauth-strategy';
import {
  CredentialStrategy,
  BearerStrategy,
  ApiKeyStrategy,
  SessionStorageStrategy,
  AuthManager,
} from '@/lib/strategies';

interface LoginViewProps {
  config: AuthConfig;
  appTitle: string;
  appIcon?: string;
  landingPageEnabled?: boolean;
}

type SchemeTab = 'credential' | 'bearer' | 'apiKey' | 'basic';

/**
 * Dedicated login page component.
 * Supports credential (username/password), bearer token, and API key auth.
 */
export function LoginView({ config, appTitle, appIcon, landingPageEnabled = false }: LoginViewProps) {
  const navigate = useNavigate();
  
  // Determine post-login redirect path
  const postLoginPath = landingPageEnabled ? '/dashboard' : '/';

  // Detect available auth options
  const loginEndpoints = config.loginEndpoints ?? [];
  const passwordResetEndpoints = config.passwordResetEndpoints ?? [];
  const signUpEndpoints = config.signUpEndpoints ?? [];
  const bearerScheme = config.schemes.find(s => s.type === 'bearer');
  const apiKeyScheme = config.schemes.find(s => s.type === 'apiKey');
  const basicScheme = config.schemes.find(s => s.type === 'basic');
  const oauthProviders = (config.oauthProviders ?? []).filter((p: OAuthProvider) => p.enabled !== false).slice(0, 10);

  const hasCredential = loginEndpoints.length > 0;
  const hasBearer = !!bearerScheme;
  const hasApiKey = !!apiKeyScheme;
  const hasBasic = !!basicScheme;
  const hasPasswordReset = passwordResetEndpoints.length > 0;
  const hasSignUp = signUpEndpoints.length > 0;
  const hasOAuth = oauthProviders.length > 0;
  const hasCredentialAuth = hasCredential || hasBearer || hasApiKey || hasBasic;

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

  // OAuth state
  const [oauthError, setOAuthError] = useState<string | null>(null);
  const [oauthLoadingProvider, setOAuthLoadingProvider] = useState<string | null>(null);

  // Shared error state
  const [error, setError] = useState<string | null>(null);

  // Initialize theme on mount (prevents FOUC)
  useThemeInitializer();

  // Redirect synchronously (no useEffect) if nothing to authenticate with
  if (!hasCredential && !hasBearer && !hasApiKey && !hasBasic && !hasOAuth) {
    return null;
  }

  // ── OAuth button click handler ────────────────────────────────────────────
  const handleOAuthClick = async (provider: OAuthProvider) => {
    // Clear any existing errors
    setOAuthError(null);
    setError(null);
    
    // Set loading state for this provider
    setOAuthLoadingProvider(provider.provider);
    
    try {
      const strategy = new OAuthStrategy();
      const result = await strategy.login({ provider });
      
      // If login fails (shouldn't happen as it redirects), show error
      if (!result.success) {
        setOAuthError(result.error ?? 'OAuth authentication failed');
        setOAuthLoadingProvider(null);
      }
      // Note: On success, the strategy redirects to the OAuth provider,
      // so we won't reach this point. The callback will be handled separately.
    } catch (err) {
      setOAuthError('Failed to initiate OAuth authentication');
      setOAuthLoadingProvider(null);
    }
  };

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
        navigate(postLoginPath, { replace: true });
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
      navigate(postLoginPath, { replace: true });
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
      navigate(postLoginPath, { replace: true });
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
      navigate(postLoginPath, { replace: true });
    } finally {
      setBasicLoading(false);
    }
  };

  const tabCount = [hasCredential, hasBasic, hasBearer, hasApiKey].filter(Boolean).length;

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      {/* Theme toggle in top-right corner */}
      <div className="fixed top-4 right-4 z-50">
        <ThemeToggle />
      </div>
      
      <div className="w-full max-w-md space-y-8">
        {/* Header */}
        <div className="text-center">
          {appIcon && (
            <div className="flex justify-center mb-4">
              <img 
                src={appIcon} 
                alt={appTitle}
                className="h-16 w-16 object-contain"
              />
            </div>
          )}
          <h1 className="text-3xl font-bold tracking-tight">{appTitle}</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Sign in to access the dashboard
          </p>
        </div>

        {/* Auth Form Card */}
        <div className="bg-card border rounded-lg shadow-sm p-6 space-y-6">

          {/* OAuth Error Message */}
          {oauthError && (
            <Alert variant="destructive" className="relative">
              <AlertDescription className="pr-8">
                {oauthError}
              </AlertDescription>
              <button
                type="button"
                onClick={() => setOAuthError(null)}
                className="absolute top-3 right-3 text-destructive hover:text-destructive/80"
                aria-label="Dismiss error"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <line x1="18" y1="6" x2="6" y2="18" />
                  <line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </button>
            </Alert>
          )}

          {/* OAuth Buttons Section */}
          {hasOAuth && (
            <div className="space-y-4">
              {oauthProviders.map((provider) => (
                <OAuthButton
                  key={provider.provider}
                  provider={provider}
                  onInitiate={handleOAuthClick}
                  loading={oauthLoadingProvider === provider.provider}
                  disabled={oauthLoadingProvider !== null && oauthLoadingProvider !== provider.provider}
                />
              ))}
            </div>
          )}

          {/* Divider with "OR" text when both OAuth and credential auth are available */}
          {hasOAuth && hasCredentialAuth && (
            <div className="relative my-6">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-border" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-card px-2 text-muted-foreground">OR</span>
              </div>
            </div>
          )}

          {/* Tab switcher — only shown when multiple credential auth methods exist */}
          {hasCredentialAuth && tabCount > 1 && (
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
          {hasCredentialAuth && activeTab === 'credential' && hasCredential && (
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

              {/* Forgot password link */}
              {hasPasswordReset && (
                <div className="text-center">
                  <button
                    type="button"
                    onClick={() => navigate('/password-reset')}
                    className="text-sm text-primary hover:underline"
                  >
                    Forgot password?
                  </button>
                </div>
              )}
            </form>
          )}

          {/* ── Bearer form ── */}
          {hasCredentialAuth && activeTab === 'bearer' && hasBearer && (
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
          {hasCredentialAuth && activeTab === 'apiKey' && hasApiKey && apiKeyScheme && (
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
          {hasCredentialAuth && activeTab === 'basic' && hasBasic && (
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

          {/* Sign up link */}
          {hasSignUp && (
            <div className="pt-4 border-t text-center">
              <p className="text-sm text-muted-foreground">
                Don't have an account?{' '}
                <button
                  type="button"
                  onClick={() => navigate('/signup')}
                  className="text-primary hover:underline font-medium"
                >
                  Create account
                </button>
              </p>
            </div>
          )}
        </div>

        <p className="text-center text-xs text-muted-foreground">
          Powered by UIGen
        </p>
      </div>
    </div>
  );
}
